const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Clock,
  Package,
  PackageSearch,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import ReportCard from '@/components/ReportCard';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { formatDateTime, relativeTime, scoreClasses } from '@/lib/status';
import { extractError } from '@/lib/errors';

const ACTIVE_LOST = ['LOST_REPORTED', 'MATCH_FOUND'];
const ACTIVE_FOUND = ['FOUND_REPORTED', 'MATCH_FOUND'];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [matchList, setMatchList] = useState([]);
  const [caseList, setCaseList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError('');
    try {
      const [
        lostActive,
        foundActive,
        matchCount,
        claimCount,
        handoverCount,
        returnedCount,
        lostRecent,
        foundRecent,
        notifPage,
        matchPage,
        casePage,
      ] = await Promise.all([
        db.entities.LostReport.count({ owner_id: user.id, status: { $in: ACTIVE_LOST } }),
        db.entities.FoundReport.count({ finder_id: user.id, status: { $in: ACTIVE_FOUND } }),
        db.entities.AIMatch.count({ owner_id: user.id, is_qualifying: true, owner_response: 'none' }),
        db.entities.RecoveryCase.count({ claim_status: 'CLAIM_PENDING' }),
        db.entities.RecoveryCase.count({ case_status: 'HANDOVER_SCHEDULED' }),
        db.entities.RecoveryCase.count({ case_status: 'RETURNED' }),
        db.entities.LostReport.filter({ owner_id: user.id }, { sort: '-created_date', limit: 3 }),
        db.entities.FoundReport.filter({ finder_id: user.id }, { sort: '-created_date', limit: 3 }),
        db.entities.Notification.filter({ recipient_id: user.id }, { sort: '-created_date', limit: 4 }),
        db.entities.AIMatch.filter({ owner_id: user.id, is_qualifying: true }, { sort: '-created_date', limit: 3 }),
        db.entities.RecoveryCase.filter(
          { $or: [{ owner_id: user.id }, { finder_id: user.id }] },
          { sort: '-updated_date', limit: 4 }
        ),
      ]);

      setStats({
        lostActive,
        foundActive,
        matchCount,
        claimCount,
        handoverCount,
        returnedCount,
      });
      setNotifications(notifPage.items || []);
      setMatchList(matchPage.items || []);
      setCaseList(casePage.items || []);
      const merged = [
        ...(lostRecent.items || []).map((report) => ({ kind: 'lost', report })),
        ...(foundRecent.items || []).map((report) => ({ kind: 'found', report })),
      ]
        .sort((a, b) => new Date(b.report.created_date) - new Date(a.report.created_date))
        .slice(0, 4);
      setRecent(merged);
    } catch (err) {
      setError(extractError(err, 'Your dashboard could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const hasReports = recent.length > 0;
  const activeCases = caseList.filter((item) => item.case_status !== 'RETURNED' && item.case_status !== 'CLAIM_REJECTED');
  const unread = notifications.filter((item) => !item.is_read).length;

  return (
    <div>
      <PageHeader
        eyebrow={`Welcome back${user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}`}
        title="Your recovery dashboard"
        description="Every number here comes from your own reports, matches and cases."
      >
        <Button asChild className="fb-gradient text-white">
          <Link to="/report/lost">
            <PackageSearch className="mr-2 h-4 w-4" /> Report Lost Item
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/report/found">
            <Package className="mr-2 h-4 w-4" /> Report Found Item
          </Link>
        </Button>
      </PageHeader>

      {error && (
        <p className="mb-6 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Active lost reports"
          value={stats?.lostActive ?? 0}
          icon={PackageSearch}
          tone="amber"
          loading={loading}
          hint="Reported and not yet returned"
          to="/reports?kind=lost&filter=active"
        />
        <StatCard
          label="Active found reports"
          value={stats?.foundActive ?? 0}
          icon={Package}
          tone="cyan"
          loading={loading}
          hint="Items you are holding for an owner"
          to="/reports?kind=found&filter=active"
        />
        <StatCard
          label="Potential matches"
          value={stats?.matchCount ?? 0}
          icon={Sparkles}
          tone="cyan"
          loading={loading}
          hint="Above the similarity threshold, awaiting your decision"
          to="/matches"
        />
        <StatCard
          label="Pending claims"
          value={stats?.claimCount ?? 0}
          icon={Clock}
          tone="amber"
          loading={loading}
          hint="Waiting for the Global Admin"
          to="/cases?filter=claim"
        />
        <StatCard
          label="Scheduled handovers"
          value={stats?.handoverCount ?? 0}
          icon={Clock}
          tone="violet"
          loading={loading}
          hint="Meeting arranged, code not yet used"
          to="/cases?filter=handover"
        />
        <StatCard
          label="Returned items"
          value={stats?.returnedCount ?? 0}
          icon={ArrowRight}
          tone="green"
          loading={loading}
          hint="Cases closed with a verified handover"
          to="/cases?filter=returned"
        />
      </div>

      {!loading && !hasReports && (
        <div className="mt-8">
          <EmptyState
            icon={PackageSearch}
            title="Nothing reported yet"
            description="Start by reporting what you lost, or report an item you found so its owner can be matched with it. Matching, notifications and case status will appear here."
            action={
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <Button asChild className="fb-gradient text-white">
                  <Link to="/report/lost">Report Lost Item</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/report/found">Report Found Item</Link>
                </Button>
              </div>
            }
          />
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="fb-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-foreground">Recent reports</h2>
              <Link to="/reports" className="text-xs font-medium text-violet-300 hover:text-violet-200">
                All reports
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {loading ? 'Loading your reports…' : 'No reports yet.'}
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {recent.map(({ kind, report }) => (
                  <ReportCard key={report.id} report={report} kind={kind} />
                ))}
              </div>
            )}
          </section>

          <section className="fb-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-foreground">Recovery progress</h2>
              <Link to="/cases" className="text-xs font-medium text-violet-300 hover:text-violet-200">
                All cases
              </Link>
            </div>
            {activeCases.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No case is in progress. A case opens when you claim a matched item, or when someone claims an item you
                found.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {activeCases.map((item) => (
                  <li key={item.id} className="fb-surface flex flex-wrap items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{item.item_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.case_code} · {item.owner_id === user?.id ? 'You are the owner' : 'You are the finder'} ·
                        updated {relativeTime(item.updated_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={item.case_status} />
                      <Link to={`/cases/${item.id}`} className="text-xs font-medium text-violet-300 hover:text-violet-200">
                        Open case
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="fb-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-foreground">Match alerts</h2>
              <Link to="/matches" className="text-xs font-medium text-violet-300 hover:text-violet-200">
                All matches
              </Link>
            </div>
            {matchList.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No qualifying match yet. AI matching runs again whenever a report is submitted in the other direction.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {matchList.map((match) => (
                  <li key={match.id} className="fb-surface p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{match.item_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Found report {match.found_report_code} · {relativeTime(match.created_date)}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${scoreClasses(match.score)}`}>
                        {match.score}/100
                      </span>
                    </div>
                    <Link
                      to={`/matches/${match.id}`}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-violet-300 hover:text-violet-200"
                    >
                      Review match <ArrowRight className="h-3 w-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="fb-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
                <Bell className="h-4 w-4 text-violet-300" /> Notifications
                {unread > 0 && (
                  <span className="rounded-full bg-violet-500 px-1.5 text-[10px] font-semibold text-white">{unread}</span>
                )}
              </h2>
              <Link to="/notifications" className="text-xs font-medium text-violet-300 hover:text-violet-200">
                View all
              </Link>
            </div>
            {notifications.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {notifications.map((item) => (
                  <li key={item.id} className="border-l border-border pl-3">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.message}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(item.created_date)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="fb-surface p-5">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
              <RotateCcw className="h-4 w-4 text-violet-300" /> How a recovery closes
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              AI gives a score, you decide whether to claim, the Global Admin approves, the finder schedules the handover
              and then enters the code you show at the meeting. The case closes the moment the code is verified.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}