const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Gavel,
  History,
  Package,
  PackageSearch,
  RefreshCw,
  Sparkles,
  Clock,
} from 'lucide-react';

import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import CaseTimeline from '@/components/case/CaseTimeline';
import { Button } from '@/components/ui/button';
import { formatDateTime, relativeTime, scoreClasses } from '@/lib/status';
import { extractError } from '@/lib/errors';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [claims, setClaims] = useState([]);
  const [matches, setMatches] = useState([]);
  const [handovers, setHandovers] = useState([]);
  const [failed, setFailed] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, claimPage, matchPage, handoverPage, lostFailed, foundFailed, historyPage] = await Promise.all([
        db.functions.invoke('getAdminStats', {}),
        db.entities.RecoveryCase.filter({ claim_status: 'CLAIM_PENDING' }, { sort: 'created_date', limit: 5 }),
        db.entities.AIMatch.filter({ is_qualifying: true, owner_response: 'none' }, { sort: '-created_date', limit: 5 }),
        db.entities.RecoveryCase.filter({ case_status: 'HANDOVER_SCHEDULED' }, { sort: '-updated_date', limit: 5 }),
        db.entities.LostReport.filter({ match_status: 'failed' }, { sort: '-updated_date', limit: 5 }),
        db.entities.FoundReport.filter({ match_status: 'failed' }, { sort: '-updated_date', limit: 5 }),
        db.entities.CaseHistory.filter({}, { sort: '-created_date', limit: 8 }),
      ]);
      if (statsRes.data?.error) throw new Error(statsRes.data.error);
      setStats(statsRes.data);
      setClaims(claimPage.items || []);
      setMatches(matchPage.items || []);
      setHandovers(handoverPage.items || []);
      setFailed([
        ...(lostFailed.items || []).map((report) => ({ kind: 'lost', report })),
        ...(foundFailed.items || []).map((report) => ({ kind: 'found', report })),
      ]);
      setEvents(historyPage.items || []);
    } catch (err) {
      setError(extractError(err, 'The admin dashboard could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const retryMatching = async (kind, reportId) => {
    setRetrying(reportId);
    setError('');
    try {
      const res = await db.functions.invoke('runMatching', { report_type: kind, report_id: reportId });
      if (res.data?.error) throw new Error(res.data.error);
      await load();
    } catch (err) {
      setError(extractError(err, 'Matching could not be retried for that report.'));
    } finally {
      setRetrying('');
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Global Admin"
        title="Platform overview"
        description="Every figure below is counted from the live database. Only this one Global Admin account can reach these screens, and it is enforced on the server."
      >
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </PageHeader>

      {error && (
        <p className="mb-6 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Lost reports" value={stats?.lost_total ?? 0} icon={PackageSearch} tone="amber" loading={loading} hint={`${stats?.lost_active ?? 0} still active`} to="/admin/lost" />
        <StatCard label="Found reports" value={stats?.found_total ?? 0} icon={Package} tone="cyan" loading={loading} hint={`${stats?.found_active ?? 0} still active`} to="/admin/found" />
        <StatCard label="Pending AI matches" value={stats?.matches_pending ?? 0} icon={Sparkles} tone="violet" loading={loading} hint="Qualifying, no owner decision yet" to="/admin/matches" />
        <StatCard label="Claims awaiting review" value={stats?.claims_pending ?? 0} icon={Gavel} tone="amber" loading={loading} hint="Approve or reject" to="/admin/claims" />
        <StatCard label="Approved claims" value={stats?.claims_approved ?? 0} icon={Gavel} tone="green" loading={loading} to="/admin/claims" />
        <StatCard label="Rejected claims" value={stats?.claims_rejected ?? 0} icon={Gavel} tone="red" loading={loading} to="/admin/claims" />
        <StatCard label="Scheduled handovers" value={stats?.handovers_scheduled ?? 0} icon={Clock} tone="violet" loading={loading} to="/admin/cases" />
        <StatCard label="Returned items" value={stats?.returned_items ?? 0} icon={History} tone="green" loading={loading} hint="Closed by a verified code" to="/admin/cases" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="fb-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
              <Gavel className="h-4 w-4 text-violet-300" /> Claims awaiting your decision
            </h2>
            <Link to="/admin/claims" className="text-xs font-medium text-violet-300 hover:text-violet-200">
              All claims
            </Link>
          </div>
          {claims.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No claim is waiting for review.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {claims.map((item) => (
                <li key={item.id} className="fb-surface p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{item.item_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.case_code} · AI {item.match_score ?? '—'}/100 · claimed {relativeTime(item.claimed_at || item.created_date)}
                      </p>
                    </div>
                    <Link to={`/admin/claims/${item.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-violet-300 hover:text-violet-200">
                      Review <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="fb-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-cyan-300" /> Qualifying matches without an owner decision
            </h2>
            <Link to="/admin/matches" className="text-xs font-medium text-violet-300 hover:text-violet-200">
              All matches
            </Link>
          </div>
          {matches.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No qualifying match is waiting on its owner.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {matches.map((match) => (
                <li key={match.id} className="fb-surface p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{match.item_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {match.lost_report_code} ↔ {match.found_report_code} · {formatDateTime(match.created_date)}
                      </p>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${scoreClasses(match.score)}`}>
                      {match.score}/100
                    </span>
                  </div>
                  <div className="mt-2 flex gap-3 text-[11px]">
                    <Link to={`/reports/lost/${match.lost_report_id}`} className="text-violet-300 hover:text-violet-200">
                      Lost report
                    </Link>
                    <Link to={`/reports/found/${match.found_report_id}`} className="text-violet-300 hover:text-violet-200">
                      Found report
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="fb-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
              <Clock className="h-4 w-4 text-violet-300" /> Handovers scheduled
            </h2>
            <Link to="/admin/cases" className="text-xs font-medium text-violet-300 hover:text-violet-200">
              All cases
            </Link>
          </div>
          {handovers.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No handover is currently scheduled.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {handovers.map((item) => (
                <li key={item.id} className="fb-surface flex flex-wrap items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{item.item_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.case_code} · {item.owner_name || 'owner'} ↔ {item.finder_name || 'finder'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.case_status} />
                    <Link to={`/cases/${item.id}`} className="text-xs font-medium text-violet-300 hover:text-violet-200">
                      Open
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="fb-card p-5">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-300" /> Matching failures needing a retry
          </h2>
          {failed.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No failed matching run is outstanding.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {failed.map(({ kind, report }) => (
                <li key={report.id} className="fb-surface flex flex-wrap items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {report.report_code} · {report.item_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {kind === 'lost' ? 'Lost report' : 'Found report'} · {report.match_error || 'Matching failed'}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => retryMatching(kind, report.id)} disabled={retrying === report.id}>
                    {retrying === report.id ? 'Retrying…' : 'Run matching again'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-6">
        <CaseTimeline events={events} title="Latest audit events" emptyText="No audit events recorded yet." />
      </div>
    </div>
  );
}