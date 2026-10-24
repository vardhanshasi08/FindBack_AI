import React from 'react';
import { Check } from 'lucide-react';
import { FLOW, flowIndex } from '@/lib/status';

const DETAIL = {
  LOST_REPORTED: 'A user reports an item they lost',
  MATCH_FOUND: 'Gemini compares reports and scores a likely pair',
  CLAIM_PENDING: 'The owner claims it — the Global Admin reviews',
  CLAIM_APPROVED: 'Approved claims move to handover',
  AWAITING_HANDOVER_DETAILS: 'The finder sets place and time',
  HANDOVER_SCHEDULED: 'Both sides meet and check the item together',
  RETURNED: 'The finder enters the code and the case closes',
};

export default function FlowSteps({ status, compact = false }) {
  const current = flowIndex(status);
  return (
    <ol className={`flex gap-2 overflow-x-auto pb-1 ${compact ? '' : 'sm:grid sm:grid-cols-7 sm:overflow-visible'}`}>
      {FLOW.map((step, index) => {
        const done = current > -1 && index < current;
        const active = index === current;
        return (
          <li
            key={step.status}
            className={`min-w-[132px] rounded-xl border p-3 sm:min-w-0 ${
              active
                ? 'border-violet-500/50 bg-violet-500/10'
                : done
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-border bg-secondary/40'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                  done
                    ? 'bg-emerald-500 text-white'
                    : active
                      ? 'fb-gradient text-white'
                      : 'bg-secondary text-muted-foreground'
                }`}
              >
                {done ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              <span className={`text-xs font-semibold ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
            </div>
            {!compact && <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{DETAIL[step.status]}</p>}
          </li>
        );
      })}
    </ol>
  );
}