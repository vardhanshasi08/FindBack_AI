const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useEffect, useState } from 'react';
import { Loader2, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { countdown } from '@/lib/status';
import { extractError } from '@/lib/errors';

/**
 * Owner side of the handover code. The code is generated on the server, stored only
 * as a salted hash, and is shown to the owner alone. The finder never sees it here.
 */
export default function OtpPanel({ recoveryCase }) {
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const expired = Boolean(expiresAt) && new Date(expiresAt).getTime() <= tick;

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await db.functions.invoke('issueHandoverOtp', { case_id: recoveryCase.id });
      if (res.data?.error) throw new Error(res.data.error);
      setCode(res.data.code);
      setExpiresAt(res.data.expires_at);
    } catch (err) {
      setError(extractError(err, 'The handover code could not be generated.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fb-card border-cyan-500/30 p-5">
      <h3 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
        <ShieldCheck className="h-4 w-4 text-cyan-300" /> Your handover code
      </h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        Generate this code at the meeting, after you have checked the item together. Show it to the finder and let them
        type it into their own screen — that closes the case. Never send it before you have the item in your hands.
      </p>

      {code && !expired ? (
        <div className="mt-4 rounded-xl border border-cyan-500/40 bg-cyan-500/5 p-4 text-center">
          <p className="font-mono text-3xl font-semibold tracking-[0.35em] text-cyan-200">{code}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Expires in <span className="font-semibold text-foreground">{countdown(expiresAt, tick)}</span> (10 minutes).
            Generating a new code cancels this one.
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-border bg-secondary p-4 text-sm text-muted-foreground">
          {expired ? 'Your previous code expired. Generate a new one now.' : 'No code has been generated yet.'}
        </div>
      )}

      <Button onClick={generate} disabled={loading} className="mt-4 fb-gradient text-white">
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : code ? (
          <RefreshCw className="mr-2 h-4 w-4" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        {code ? 'Generate a new code' : 'Generate handover code'}
      </Button>
      {error && <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">{error}</p>}
      <p className="mt-3 text-[11px] text-muted-foreground">
        The code is stored only as a salted hash. It is never sent to the AI, never included in notifications and never
        visible to the finder until they type it.
      </p>
    </div>
  );
}