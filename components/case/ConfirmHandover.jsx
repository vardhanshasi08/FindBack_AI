const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { extractError } from '@/lib/errors';

const PLACEHOLDER = 'e.g. 123456';

/** The finder — the person returning the item — enters the code here. */
export default function ConfirmHandover({ recoveryCase, onConfirmed }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const confirm = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the six-digit code the owner shows you.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await db.functions.invoke('verifyHandoverOtp', { case_id: recoveryCase.id, code });
      if (res.data?.error) throw new Error(res.data.error);
      setDone(true);
      onConfirmed?.(res.data);
    } catch (err) {
      setError(extractError(err, 'The handover could not be confirmed.'));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="fb-card border-emerald-500/40 p-5">
        <p className="flex items-center gap-2 font-display text-base font-semibold text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> Handover completed
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          The code was verified and the case is closed as returned. Both you and the owner were notified.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={confirm} className="fb-card border-cyan-500/30 p-5">
      <h3 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
        <ShieldCheck className="h-4 w-4 text-cyan-300" /> Confirm the handover
      </h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        Before you confirm, ask the owner to show you the item and compare it with their secret ownership detail together.
        That detail is never shown to you in the app. Once the item has changed hands, type the code the owner shows you —
        a correct code closes the case immediately.
      </p>

      <div className="mt-4 max-w-xs">
        <Label htmlFor="handover_code">Handover code</Label>
        <Input
          id="handover_code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder={PLACEHOLDER}
          className="mt-1.5 font-mono text-lg tracking-[0.3em]"
        />
      </div>

      {error && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      <Button type="submit" disabled={busy} className="mt-4 fb-gradient text-white">
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirm Handover
      </Button>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Attempts are limited and each code expires after ten minutes. A wrong code keeps the case open — ask the owner for a
        new code if needed.
      </p>
    </form>
  );
}