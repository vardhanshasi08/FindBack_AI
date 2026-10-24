const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Calendar, CheckCircle2, Clock, Fingerprint, Loader2, MapPin, ShieldCheck } from 'lucide-react';

import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import FlowSteps from '@/components/FlowSteps';
import HandoverForm from '@/components/case/HandoverForm';
import OtpPanel from '@/components/case/OtpPanel';
import ConfirmHandover from '@/components/case/ConfirmHandover';
import CaseTimeline from '@/components/case/CaseTimeline';
import OwnershipSecretPanel from '@/components/OwnershipSecretPanel';
import { formatDate, formatDateTime, formatTime } from '@/lib/status';
import { extractError } from '@/lib/errors';
import { Button } from '@/components/ui/button';

export default function CaseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [caseItem, setCaseItem] = useState(null);
  const [handover, setHandover] = useState(null);
  const [foundReport, setFoundReport] = useState(null);
  const [events, setEvents] = useState([]);
  const [otp, setOtp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError('');
    try {
      const record = await db.entities.RecoveryCase.get(id);
      setCaseItem(record);
      const isAdminView = user.role === 'admin';
      const [handoverPage, historyPage] = await Promise.all([
        db.entities.Handover.filter({ case_id: id }, { sort: '-created_date', limit: 1 }),
        db.entities.CaseHistory.filter({ case_id: id }, { sort: 'created_date', limit: 40 }),
      ]);
      setHandover((handoverPage.items || [])[0] || null);
      setEvents(historyPage.items || []);

      try {
        setFoundReport(await db.entities.FoundReport.get(record.found_report_id));
      } catch (err) {
        setFoundReport(null);
      }
      if (isAdminView) {
        try {
          const otpPage = await db.entities.HandoverOtp.filter({ case_id: id }, { sort: '-created_date', limit: 1 });
          setOtp((otpPage.items || [])[0] || null);
        } catch (err) {
          setOtp(null);
        }
      }
    } catch (err) {
      setError(extractError(err, 'This case could not be opened.'));
    } finally {
      setLoading(false);
    }
  }, [id, user?.id, user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !caseItem) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error || 'Case not found.'}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/cases">
            <ArrowLeft className="mr-2 h-4 w-4" /> All cases
          </Link>
        </Button>
      </div>
    );
  }

  const isOwner = caseItem.owner_id === user?.id;
  const isFinder = caseItem.finder_id === user?.id;
  const isAdminView = user?.role === 'admin';
  const returned = caseItem.case_status === 'RETURNED';
  const rejected = caseItem.case_status === 'CLAIM_REJECTED';

  return (
    <div>
      <PageHeader
        eyebrow={`Recovery case · ${caseItem.case_code}`}
        title={caseItem.item_name}
        description={`AI score ${caseItem.match_score ?? '—'}/100 · ${
          isOwner ? 'you are the owner of the lost item' : isFinder ? 'you are the finder holding the item' : 'Global Admin view'
        }`}
      >
        <Button variant="outline" asChild>
          <Link to={isAdminView && !isOwner && !isFinder ? '/admin/cases' : '/cases'}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Link>
        </Button>
        <StatusBadge status={caseItem.case_status} />
      </PageHeader>

      <div className="mb-6">
        <FlowSteps status={caseItem.case_status} />
      </div>

      {rejected && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-200">
            <AlertTriangle className="h-4 w-4" /> This claim was rejected
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Reason: {caseItem.rejection_reason || 'No reason recorded.'} A rejected claim cannot be scheduled for handover.
          </p>
        </div>
      )}

      {returned && (
        <div className="mb-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5">
          <p className="flex items-center gap-2 font-display text-base font-semibold text-emerald-200">
            <CheckCircle2 className="h-4 w-4" /> Item returned — case closed
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            The finder entered the correct handover code on {formatDateTime(caseItem.returned_at)}. No further approval was
            needed: the code verified the handover and closed the case immediately.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {handover && (
            <section className="fb-card p-5">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
                <MapPin className="h-4 w-4 text-violet-300" /> Handover plan
              </h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ['Location', handover.location],
                  ['Date', formatDate(handover.handover_date)],
                  ['Time', formatTime(handover.handover_time)],
                  ['Schedule status', handover.schedule_status === 'COMPLETED' ? 'completed' : `revision ${handover.revision || 1}`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
                    <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
              {handover.instructions && (
                <p className="mt-3 rounded-lg border border-border bg-secondary p-3 text-sm text-muted-foreground">
                  {handover.instructions}
                </p>
              )}
              <p className="mt-3 text-[11px] text-muted-foreground">
                {isFinder ? 'You can update these details until the handover is completed.' : 'Only the finder can change these details.'}
              </p>
            </section>
          )}

          {isFinder && caseItem.claim_status === 'CLAIM_APPROVED' && !returned && (
            <HandoverForm recoveryCase={caseItem} handover={handover} onSaved={load} />
          )}

          {isFinder && caseItem.case_status === 'HANDOVER_SCHEDULED' && !returned && (
            <ConfirmHandover recoveryCase={caseItem} onConfirmed={load} />
          )}

          {isFinder && !returned && (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Fingerprint className="h-4 w-4 text-violet-300" /> Private ownership check before the handover
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Before you hand the item over or confirm the code, ask the owner to show you the item and compare it with
                their secret ownership detail — a scratch, a sticker, a hidden mark or a specific accessory. That detail is
                never shown to you inside the app, so the check happens between the two of you at the meeting. The app does
                not record the detail, and it does not ask for evidence.
              </p>
            </div>
          )}

          {foundReport ? (
            <section className="fb-card p-5">
              <h2 className="font-display text-base font-semibold text-foreground">
                Found report {foundReport.report_code}
              </h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ['Item name', foundReport.item_name],
                  ['Category', foundReport.category],
                  ['Colour', foundReport.color || 'Not specified'],
                  ['Visible characteristics', foundReport.visible_characteristics || 'Not specified'],
                  ['Found location', foundReport.found_location],
                  ['Found date & time', formatDateTime(foundReport.found_datetime)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
                    <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{foundReport.description}</p>
              <Link
                to={`/reports/found/${foundReport.id}`}
                className="mt-3 inline-block text-xs font-medium text-violet-300 hover:text-violet-200"
              >
                Open the full found report
              </Link>
            </section>
          ) : (
            <p className="rounded-xl border border-border bg-secondary p-4 text-sm text-muted-foreground">
              The finder's report details are not shared with you in this view.
            </p>
          )}

          <CaseTimeline events={events} />
        </div>

        <div className="space-y-6">
          {isOwner && !returned && (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Fingerprint className="h-4 w-4 text-violet-300" /> Check the item before you let it go
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                At the meeting, ask the finder to hand you the item first, then compare it with your secret ownership
                detail. Only after you are satisfied should you show your handover code to the finder, who types it into
                their screen to close the case.
              </p>
              <div className="mt-3">
                <OwnershipSecretPanel lostReportId={caseItem.lost_report_id} audience="owner" />
              </div>
            </div>
          )}

          {isOwner && caseItem.case_status === 'HANDOVER_SCHEDULED' && !returned && <OtpPanel recoveryCase={caseItem} />}

          {isOwner && caseItem.case_status === 'CLAIM_PENDING' && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              Your claim is with the Global Admin. You will be notified as soon as a decision is made — no action is needed
              from you right now.
            </p>
          )}

          {isFinder && caseItem.case_status === 'AWAITING_HANDOVER_DETAILS' && (
            <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" /> Set the handover location, date and time above so the owner can
              collect the item.
            </p>
          )}

          <section className="fb-card p-5">
            <h3 className="font-display text-base font-semibold text-foreground">Case facts</h3>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ['Case ID', caseItem.case_code],
                ['Item', caseItem.item_name],
                ['AI match score', `${caseItem.match_score ?? '—'}/100`],
                ['Claim status', caseItem.claim_status],
                ['Claimed', formatDateTime(caseItem.claimed_at)],
                ['Admin decision', caseItem.admin_decision || 'pending'],
                ['Approved', caseItem.approved_at ? formatDateTime(caseItem.approved_at) : '—'],
                ['Returned', caseItem.returned_at ? formatDateTime(caseItem.returned_at) : '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-0">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {isAdminView && (
            <section className="fb-card p-5">
              <h3 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-cyan-300" /> Handover code status (Global Admin)
              </h3>
              {otp ? (
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li>
                    Issued: <span className="text-foreground">{formatDateTime(otp.issued_at)}</span> (issue #{otp.issue_count})
                  </li>
                  <li>
                    Expires: <span className="text-foreground">{formatDateTime(otp.otp_expires_at)}</span>
                  </li>
                  <li>
                    Failed attempts: <span className="text-foreground">{otp.failed_attempts || 0}</span>
                  </li>
                  <li>
                    Consumed: <span className="text-foreground">{otp.consumed ? formatDateTime(otp.consumed_at) : 'no'}</span>
                  </li>
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No handover code has been generated for this case.</p>
              )}
              <p className="mt-3 text-[11px] text-muted-foreground">
                Only the status is stored and shown here. The code itself exists only as a salted hash and as the number the
                owner shows at the meeting.
              </p>
            </section>
          )}

          {isAdminView && (
            <div className="fb-card p-5">
              <h3 className="font-display text-base font-semibold text-foreground">Protected ownership detail</h3>
              <p className="mt-2 text-xs text-muted-foreground">
                Opening the detail is written to the audit history. It is never included in API responses without this
                deliberate action.
              </p>
              <div className="mt-3">
                <OwnershipSecretPanel lostReportId={caseItem.lost_report_id} audience="admin" />
              </div>
            </div>
          )}

          <div className="fb-card p-5">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
              <Calendar className="h-4 w-4 text-violet-300" /> Who does what
            </h3>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
              <li>The owner (User 1) requests the claim and shows the handover code at the meeting.</li>
              <li>The finder (User 2) sets the handover details and enters the code to close the case.</li>
              <li>The Global Admin approves or rejects the claim before any handover is arranged.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}