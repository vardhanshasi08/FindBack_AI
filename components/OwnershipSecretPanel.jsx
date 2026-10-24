const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from 'react';
import { Eye, Fingerprint, Loader2, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { extractError } from '@/lib/errors';

/**
 * The protected secret ownership detail. Access always goes through the backend,
 * which allows only the owner of the lost report and the Global Admin.
 */
export default function OwnershipSecretPanel({ lostReportId, audience = 'owner' }) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState(false);

  const reveal = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await db.functions.invoke('getOwnershipSecret', { lost_report_id: lostReportId });
      if (res.data?.error) throw new Error(res.data.error);
      setValue(res.data?.secret_detail || '');
      setRevealed(true);
    } catch (err) {
      setError(extractError(err, 'The ownership detail could not be opened.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Fingerprint className="h-4 w-4 text-violet-300" /> Secret ownership detail
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {audience === 'admin'
          ? 'Protected field. Opening it is recorded in the audit history. Never copy it into chat, tickets or notes.'
          : 'Only you and the Global Admin can open this. At the handover, ask the finder to show you the item and compare this detail together — the app never shares it with the finder.'}
      </p>

      {revealed ? (
        <p className="mt-3 rounded-lg border border-border bg-background/80 p-3 text-sm text-foreground">{value || 'No detail was saved.'}</p>
      ) : (
        <Button variant="outline" size="sm" className="mt-3" onClick={reveal} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
          {loading ? 'Opening…' : 'Reveal protected detail'}
        </Button>
      )}
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Lock className="h-3 w-3" /> Never sent to the AI and never included in notifications.
      </p>
    </div>
  );
}