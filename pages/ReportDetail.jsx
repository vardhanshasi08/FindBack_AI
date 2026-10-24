const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Loader2, Pencil, RefreshCw, Sparkles } from 'lucide-react';

import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import PrivateImage from '@/components/PrivateImage';
import ScoreMeter from '@/components/ScoreMeter';
import OwnershipSecretPanel from '@/components/OwnershipSecretPanel';
import ReportEditDialog from '@/components/report/ReportEditDialog';
import CaseTimeline from '@/components/case/CaseTimeline';
import { formatDateTime, MATCH_THRESHOLD, scoreClasses } from '@/lib/status';
import { extractError } from '@/lib/errors';

const EDITABLE = ['LOST_REPORTED', 'MATCH_FOUND', 'FOUND_REPORTED'];

export default function ReportDetail() {
  const { type, id } = useParams();
  const { user } = useAuth();
  const kind = type === 'found' ? 'found' : 'lost';
  const isLost = kind === 'lost';

  const [report, setReport] = useState(null);
  const [matches, setMatches] = useState([]);
  const [caseItem, setCaseItem] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [matchBusy, setMatchBusy] = useState(false);
  const [matchMessage, setMatchMessage] = useState('');
  const [matchError, setMatchError] = useState('');
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const entity = isLost ? db.entities.LostReport : db.entities.FoundReport;
      const record = await entity.get(id);
      setReport(record);
      const matchQuery = isLost ? { lost_report_id: id } : { found_report_id: id };
      const [matchPage, casePage, historyPage] = await Promise.all([
        db.entities.AIMatch.filter(matchQuery, { sort: '-created_date', limit: 6 }),
        db.entities.RecoveryCase.filter(
          isLost ? { lost_report_id: id } : { found_report_id: id },
          { sort: '-created_date', limit: 1 }
        ),
        db.entities.CaseHistory.filter(matchQuery, { sort: '-created_date', limit: 8 }),
      ]);
      setMatches(matchPage.items || []);
      setCaseItem((casePage.items || [])[0] || null);
      setEvents(historyPage.items || []);
    } catch (err) {
      setError(extractError(err, 'This report could not be opened.'));
    } finally {
      setLoading(false);
    }
  }, [id, isLost]);

  useEffect(() => {
    load();
  }, [load]);

  const runMatching = async () => {
    setMatchBusy(true);
    setMatchError('');
    setMatchMessage('');
    try {
      const res = await db.functions.invoke('runMatching', { report_type: kind, report_id: id });
      if (res.data?.error) throw new Error(res.data.error);
      const data = res.data || {};
      setMatchMessage(
        `Compared ${data.evaluated ?? 0} report(s). Best score ${data.best_score ?? '—'}/100, ${data.qualifying ?? 0} above the ${data.threshold ?? MATCH_THRESHOLD} threshold.`
      );
      await load();
    } catch (err) {
      setMatchError(extractError(err, 'AI matching could not run. Please retry.'));
    } finally {
      setMatchBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error || 'Report not found.'}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/reports">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to my reports
          </Link>
        </Button>
      </div>
    );
  }

  const location = isLost ? report.lost_location : report.found_location;
  const when = isLost ? report.lost_datetime : report.found_datetime;
  const notes = isLost ? report.additional_notes : report.additional_observations;
  const isOwner = isLost ? report.owner_id === user?.id : report.finder_id === user?.id;
  const canEdit = isOwner && EDITABLE.includes(report.status);

  return (
    <div>
      <PageHeader
        eyebrow={`${isLost ? 'Lost report' : 'Found report'} · ${report.report_code}`}
        title={report.item_name}
        description={`Reported ${formatDateTime(report.created_date)} · last updated ${formatDateTime(report.updated_date)}`}
      >
        <Button variant="outline" asChild>
          <Link to="/reports">
            <ArrowLeft className="mr-2 h-4 w-4" /> My reports
          </Link>
        </Button>
        {canEdit && (
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit report
          </Button>
        )}
        <StatusBadge status={report.status} />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="fb-card p-5">
            <PrivateImage fileUri={report.image_file_uri} alt={report.item_name} className="h-64 w-full" fittingType="fit" />
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                ['Category', report.category],
                ['Colour', report.color || 'Not specified'],
                ['Visible characteristics', report.visible_characteristics || 'Not specified'],
                [isLost ? 'Lost location' : 'Found location', location],
                [isLost ? 'Lost date & time' : 'Found date & time', formatDateTime(when)],
                ['Report ID', report.report_code],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-sm text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Description</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground">{report.description}</p>
            </div>
            {notes && (
              <div className="mt-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {isLost ? 'Additional notes' : 'Additional observations'}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{notes}</p>
              </div>
            )}
          </section>

          <section className="fb-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-cyan-300" /> AI matches for this report
              </h2>
              {isOwner && (
                <Button variant="outline" size="sm" onClick={runMatching} disabled={matchBusy}>
                  {matchBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  {report.match_status === 'failed' ? 'Retry AI matching' : 'Run AI matching again'}
                </Button>
              )}
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Matching status:{' '}
              <span className="font-medium text-foreground">
                {report.match_status === 'completed'
                  ? 'completed'
                  : report.match_status === 'partial'
                    ? 'completed with partial AI data'
                    : report.match_status === 'failed'
                      ? 'failed'
                      : 'not run yet'}
              </span>
              {report.matched_at ? ` · last run ${formatDateTime(report.matched_at)}` : ''}
            </p>
            {report.match_error && <p className="mt-2 text-xs text-amber-300">{report.match_error}</p>}
            {matchMessage && <p className="mt-2 text-xs text-emerald-300">{matchMessage}</p>}
            {matchError && (
              <p className="mt-2 flex items-start gap-2 text-xs text-red-300">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {matchError}
              </p>
            )}

            {matches.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No compared reports yet. Matching compares your report with relevant reports of the opposite type
                whenever it runs.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {matches.map((match) => (
                  <li key={match.id} className="fb-surface p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {isLost ? match.found_item_name || 'Found report' : match.item_name} ·{' '}
                          {isLost ? match.found_report_code : match.lost_report_code}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDateTime(match.created_date)}</p>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${scoreClasses(match.score)}`}>
                        {match.score}/100
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{match.explanation}</p>
                    {isOwner && (
                      <Link
                        to={`/matches/${match.id}`}
                        className="mt-2 inline-block text-xs font-medium text-violet-300 hover:text-violet-200"
                      >
                        Open match
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <CaseTimeline events={events} title="History for this report" emptyText="No history for this report yet." />
        </div>

        <div className="space-y-6">
          {isLost && <OwnershipSecretPanel lostReportId={report.id} audience="owner" />}

          {!isLost && (
            <div className="fb-card p-5">
              <h3 className="font-display text-base font-semibold text-foreground">About the owner's private detail</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                The owner saved a secret ownership detail with their lost report. It is never shown to you — not in this
                report, not in a match and not in a notification. You will compare it with the item together at the
                handover.
              </p>
            </div>
          )}

          {caseItem ? (
            <div className="fb-card p-5">
              <h3 className="font-display text-base font-semibold text-foreground">Recovery case</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {caseItem.case_code} · match score {caseItem.match_score}/100
              </p>
              <div className="mt-3 flex items-center gap-2">
                <StatusBadge status={caseItem.case_status} />
                <Link to={`/cases/${caseItem.id}`} className="text-xs font-medium text-violet-300 hover:text-violet-200">
                  Open case
                </Link>
              </div>
            </div>
          ) : (
            <div className="fb-card p-5">
              <h3 className="font-display text-base font-semibold text-foreground">No case yet</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {isLost
                  ? 'A case opens when you claim a matched item. Only you can claim your own lost report, and the Global Admin reviews every claim.'
                  : 'A case opens when the owner of a matched item claims it. You will be notified as soon as the Global Admin approves it.'}
              </p>
            </div>
          )}

          {matches.length > 0 && (
            <div className="fb-card p-5">
              <h3 className="font-display text-base font-semibold text-foreground">How the score is calculated</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{matches[0].method}</p>
              <div className="mt-3">
                <ScoreMeter score={matches[0].score} label="Best score for this report" />
              </div>
            </div>
          )}
        </div>
      </div>

      {canEdit && (
        <ReportEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          report={report}
          kind={kind}
          onSaved={(updated) => {
            if (updated) setReport(updated);
            load();
          }}
        />
      )}
    </div>
  );
}