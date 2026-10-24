const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, LogOut, Save, ShieldCheck, User } from 'lucide-react';

import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { extractError } from '@/lib/errors';
import { formatDateTime } from '@/lib/status';

export default function Profile() {
  const { user, logout, checkUserAuth } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [name, setName] = useState(user?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  const loadStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [lost, found, returned, unread] = await Promise.all([
        db.entities.LostReport.count({ owner_id: user.id }),
        db.entities.FoundReport.count({ finder_id: user.id }),
        db.entities.RecoveryCase.count({ case_status: 'RETURNED' }),
        db.entities.Notification.count({ recipient_id: user.id, is_read: false }),
      ]);
      setStats({ lost, found, returned, unread });
    } catch (err) {
      setStats(null);
    }
  }, [user?.id]);

  useEffect(() => {
    setStats(null);
    loadStats();
  }, [loadStats]);

  const saveName = async () => {
    if (name.trim().length < 2) {
      setError('Please enter your display name.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await db.auth.updateMe({ full_name: name.trim() });
      await checkUserAuth();
      setMessage('Your display name was saved.');
    } catch (err) {
      setError(extractError(err, 'Your display name could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Your account"
        title="Profile"
        description="Your account is the anchor for every report, match, claim and handover you take part in."
      >
        <Button variant="outline" onClick={() => logout()}>
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Lost reports" value={stats?.lost ?? 0} icon={User} tone="amber" loading={!stats} />
        <StatCard label="Found reports" value={stats?.found ?? 0} icon={User} tone="cyan" loading={!stats} />
        <StatCard label="Returned cases" value={stats?.returned ?? 0} icon={User} tone="green" loading={!stats} />
        <StatCard label="Unread notifications" value={stats?.unread ?? 0} icon={User} tone="violet" loading={!stats} to="/notifications" />
      </div>

      <section className="fb-card mt-6 p-5">
        <h2 className="font-display text-base font-semibold text-foreground">Account details</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Email</dt>
            <dd className="mt-1 text-sm text-foreground">{user?.email || '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Account created</dt>
            <dd className="mt-1 text-sm text-foreground">{formatDateTime(user?.created_date)}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Role</dt>
            <dd className="mt-1 inline-flex items-center gap-1.5 text-sm text-foreground">
              {isAdmin ? (
                <>
                  <ShieldCheck className="h-4 w-4 text-violet-300" /> Global Admin
                </>
              ) : (
                'Registered user'
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-5 max-w-sm">
          <Label htmlFor="display_name">Display name</Label>
          <div className="mt-1.5 flex gap-2">
            <Input id="display_name" value={name} onChange={(event) => setName(event.target.value)} />
            <Button onClick={saveName} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        {message && <p className="mt-2 text-xs text-emerald-300">{message}</p>}
        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      </section>

      <section className={`fb-card mt-6 p-5 ${isAdmin ? 'border-violet-500/30' : ''}`}>
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-violet-300" /> How permissions work
        </h2>
        {isAdmin ? (
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li>
              This account holds the Global Admin role, so it can review claim requests, open the protected ownership
              detail and read the audit history. Every admin action is written to the audit trail.
            </li>
            <li>
              Exactly one account should hold this role. Role changes are made outside the app — in the platform's App
              Users page — never from inside the app, and a user who signs up is always a regular user.
            </li>
            <li>
              Admin actions are checked on the server as well as in the interface, so an ordinary user cannot reach them by
              typing a URL.
            </li>
          </ul>
        ) : (
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li>You can read only your own reports, matches, cases and notifications.</li>
            <li>
              A secret ownership detail you save is readable by you and the Global Admin only. Finders never see it, and it
              is never sent to the AI.
            </li>
            <li>
              You can retrieve the handover code only for your own approved case, and only the finder can enter that code to
              close the case.
            </li>
          </ul>
        )}
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/notifications">Open notifications</Link>
        </Button>
      </section>
    </div>
  );
}