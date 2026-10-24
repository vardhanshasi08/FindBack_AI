import React from 'react';
import FlowSteps from '@/components/FlowSteps';

const PRINCIPLE = [
  'AI predicts a likely match',
  'The owner requests the claim',
  'One Global Admin approves it',
  'The finder sets the handover',
  'Both check the item together',
  'The finder enters the code',
  'The case closes as returned',
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative scroll-mt-20 border-t border-border/70 bg-card/20 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300/80">How It Works</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            One case, seven explicit steps
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Nothing is left implicit. Every step produces a real record, a notification and a status anyone involved can
            see.
          </p>
        </div>
        <div className="mt-8">
          <FlowSteps status="HANDOVER_SCHEDULED" />
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLE.map((line, index) => (
            <div key={line} className="fb-surface flex items-start gap-3 p-4">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-xs font-semibold text-violet-200">
                {index + 1}
              </span>
              <p className="text-sm text-foreground">{line}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}