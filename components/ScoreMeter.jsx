import React from 'react';
import { MATCH_THRESHOLD } from '@/lib/status';

const BAR = {
  high: 'fb-gradient',
  mid: 'bg-amber-500',
  low: 'bg-slate-500',
};

/** Shows the real stored AI score — never a placeholder. */
export default function ScoreMeter({ score, threshold = MATCH_THRESHOLD, label = 'AI similarity' }) {
  if (score === null || score === undefined) {
    return (
      <div className="rounded-xl border border-border bg-secondary p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">Not scored yet.</p>
      </div>
    );
  }
  const bar = score >= threshold ? BAR.high : score >= 45 ? BAR.mid : BAR.low;
  return (
    <div className="rounded-xl border border-border bg-secondary p-4">
      <div className="flex items-end justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="font-display text-2xl font-semibold text-foreground">
          {score}
          <span className="text-sm font-normal text-muted-foreground">/100</span>
        </p>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-background">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.max(2, Math.min(100, score))}%` }} />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {score >= threshold
          ? `At or above the ${threshold}/100 threshold — the owner may request a claim.`
          : `Below the ${threshold}/100 threshold, so it is not offered as a claimable match.`}
      </p>
    </div>
  );
}