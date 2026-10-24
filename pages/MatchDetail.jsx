const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, ShieldCheck, Sparkles, X } from 'lucide-react';

import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/PageHeader';
import ScoreMeter from '@/components/ScoreMeter';
import StatusBadge from '@/components/StatusBadge';
import PrivateImage from '@/components/PrivateImage';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MATCH_THRESHOLD, formatDateTime } from '@/lib/status';
import { extractError } from '@/lib/errors';

export default function MatchDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [match, setMatch] = useState(null);
  const [foundReport, setFoundReport] = useState(null);
  const [lostReport, setLostReport] = useState(null);
  const [caseItem, setCaseItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineNote, setDeclineNote] = useState('');
  const [counterpartNote, setCounterpartNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const record = await db.entities.AIMatch.get(id);
      setMatch(record);
      const casePage = await db.entities.RecoveryCase.filter({ match_id: id }, { sort: '-created_date', limit: 1 });
      setCaseItem((casePage.items || [])[0] || null);

      const isOwner = record.owner_id === user?.id;
      if (isOwner) {
        try {
          setFoundReport(await db.entities.FoundReport.get(record.found_report_id));
        } catch (err) {
          setCounterpartNote('The found report is only available for matches at or above the threshold.');
        }
      } else {
        try {
          setLostReport(await db.entities.LostReport.get(record.lost_report_id));
        } catch (err) {
          setCounterpartNote('The lost report details are not shared with you. Only the item facts below are.');
        }
      }
    } catch (err) {
      setError(extractError(err, 'This match could not be opened.'));
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const requestClaim = async () => {
    setBusy(true);
    setActionError('');
    try {
      const res = await db.functions.invoke('requestClaim', { match_id: id });
      if (res.data?.error) throw new Error(res.data.error);
      navigate(`/cases/${res.data.case.id}`);
    } catch (err) {
      setActionError(extractError(err, 'The claim could not be requested.'));
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    setBusy(true);
    setActionError('');
    try {
      const res = await db.functions.invoke('declineMatch', { match_id: id, note: declineNote });
      if (res.data?.error) throw new Error(res.data.error);
      setDeclineOpen(false);
      await load();
    } catch (err) {
      setActionError(extractError(err, 'Your response could not be saved.'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error || 'Match not found.'}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/matches">
            <ArrowLeft className="mr-2 h-4 w-4" /> All matches
          </Link>
        </Button>
      </div>
    );
  }

  const isOwner = match.owner_id === user?.id;
  const isFinder = match.finder_id === user?.id;
  const canClaim = isOwner && match.is_qualifying && match.owner_response === 'none' && !caseItem;
  const qualifying = Number(match.score) >= MATCH_THRESHOLD;

  return (
    <div>
      <PageHeader
        eyebrow={`AI match · ${match.lost_report_code} ↔ ${match.found_report_code}`}
        title={match.item_name}
        description={`Scored ${formatDateTime(match.created_date)} · threshold ${MATCH_THRESHOLD}/100`}
      >
        <Button variant="outline" asChild>
          <Link to="/matches">
            <ArrowLeft className="mr-2 h-4 w-4" /> Matches
          </Link>
        </Button>
        <StatusBadge status={match.is_qualifying ? 'MATCH_FOUND' : 'LOST_REPORTED'} />
      </PageHeader>

      {actionError && (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {actionError}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="fb-card p-5">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-cyan-300" /> AI assessment
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground">{match.explanation}</p>
            {match.dimensions?.ai && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  ['Overall', match.dimensions.ai.overall],
                  ['Text', match.dimensions.ai.text],
                  ['Category', match.dimensions.ai.category],
                  ['Colour', match.dimensions.ai.color],
                  ['Photo', match.dimensions.ai.visual],
                  ['Location', match.dimensions.ai.location],
                  ['Date & time', match.dimensions.ai.time],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border bg-secondary px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                    <p className="text-sm font-semibold text-foreground">{value === null || value === undefined ? '—' : `${value}/100`}</p>
                  </div>
                ))}
              </div>
            )}
            {match.dimensions?.ai?.conflicting_evidence && (
              <p className="mt-3 text-xs text-amber-300">Conflicting evidence noted: {match.dimensions.ai.conflicting_evidence}</p>
            )}
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{match.method}</p>
          </section>

          {isOwner && (
            <section className="fb-card p-5">
              <h2 className="font-display text-base font-semibold text-foreground">Found report {match.found_report_code}</h2>
              {foundReport ? (
                <>
                  <PrivateImage
                    fileUri={foundReport.image_file_uri}
                    alt={foundReport.item_name}
                    className="mt-4 h-56 w-full"
                    fittingType="fit"
                  />
                  <p className="mt-4 font-display text-lg font-semibold text-foreground">{foundReport.item_name}</p>
                  <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                    {[
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
                  <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{foundReport.description}</p>
                  {foundReport.additional_observations && (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{foundReport.additional_observations}</p>
                  )}
                  <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" /> The finder's contact details are
                    not shared here. They are only used for the handover after the Global Admin approves your claim.
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">{counterpartNote}</p>
              )}
            </section>
          )}

          {!isOwner && (
            <section className="fb-card p-5">
              <h2 className="font-display text-base font-semibold text-foreground">What the AI compared</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Someone reported losing an item that the AI connected to your found report {match.found_report_code}. Your
                report is the one that makes the recovery possible.
              </p>
              {lostReport && (
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    ['Lost item', lostReport.item_name],
                    ['Category', lostReport.category],
                    ['Colour', lostReport.color || 'Not specified'],
                    ['Lost location', lostReport.lost_location],
                    ['Lost date & time', formatDateTime(lostReport.lost_datetime)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
                      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" /> The owner's secret ownership detail
                and contact details are never shown to you. You will compare the detail with the item together at the
                handover.
              </p>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <ScoreMeter score={match.score} />

          <section className="fb-card p-5">
            <h3 className="font-display text-base font-semibold text-foreground">Match status</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                Owner response:{' '}
                <span className="font-medium text-foreground">
                  {match.owner_response === 'claimed'
                    ? 'claim requested'
                    : match.owner_response === 'declined'
                      ? 'declined'
                      : 'awaiting decision'}
                </span>
              </li>
              <li>
                Qualifying match: <span className="font-medium text-foreground">{match.is_qualifying ? 'yes' : 'no'}</span>
              </li>
              <li>
                Processing:{' '}
                <span className="font-medium text-foreground">
                  {match.processing_status === 'partial' ? 'partial AI data' : match.processing_status}
                </span>
              </li>
            </ul>

            {caseItem && (
              <div className="mt-4 rounded-xl border border-border bg-secondary p-3">
                <p className="text-xs text-muted-foreground">Recovery case {caseItem.case_code}</p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={caseItem.case_status} />
                  <Link to={`/cases/${caseItem.id}`} className="text-xs font-medium text-violet-300 hover:text-violet-200">
                    Open case
                  </Link>
                </div>
              </div>
            )}
          </section>

          {canClaim && (
            <section className="fb-card border-violet-500/30 p-5">
              <h3 className="font-display text-base font-semibold text-foreground">Is this your item?</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                If this is your item, request the claim. The Global Admin reviews both reports — including your protected
                ownership detail — before deciding. A high score does not establish ownership.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Button onClick={requestClaim} disabled={busy} className="fb-gradient text-white">
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} This is my item — Request claim
                </Button>
                <Button variant="outline" onClick={() => setDeclineOpen(true)} disabled={busy}>
                  <X className="mr-2 h-4 w-4" /> Not my item
                </Button>
              </div>
            </section>
          )}

          {isOwner && match.owner_response === 'claimed' && (
            <p className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> You requested this claim. The Global Admin decides next.
            </p>
          )}
          {isOwner && match.owner_response === 'declined' && (
            <p className="rounded-xl border border-border bg-secondary p-3 text-sm text-muted-foreground">
              You declined this match{match.owner_note ? `: “${match.owner_note}”` : '.'} No claim was created and the case
              stays closed on this pair.
            </p>
          )}
          {isFinder && (
            <p className="rounded-xl border border-border bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">
              {match.owner_response === 'claimed'
                ? 'The owner requested the claim. The Global Admin is reviewing it — you will be notified when a decision is made.'
                : 'Waiting for the owner to review this potential match. Nothing is required from you yet.'}
            </p>
          )}
        </div>
      </div>

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Not your item?</DialogTitle>
            <DialogDescription>
              This records your response against the match and no claim is created. A short note helps the Global Admin
              understand the pair.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="decline_note">Note (optional)</Label>
            <Textarea
              id="decline_note"
              value={declineNote}
              onChange={(event) => setDeclineNote(event.target.value)}
              rows={3}
              placeholder="e.g. My bag was dark green, not black."
              className="mt-1.5"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeclineOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={decline} disabled={busy} variant="destructive">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirm not my item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}