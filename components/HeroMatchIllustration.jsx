import React from 'react';
import { MapPin, Sparkles } from 'lucide-react';

/** Two reports being compared and connected by the AI indicator — built entirely from UI elements. */
export default function HeroMatchIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="fb-glow -left-10 top-4 h-52 w-52 bg-violet-600/50" />
      <div className="fb-glow right-0 top-24 h-44 w-44 bg-cyan-500/30" />

      <div className="relative rounded-3xl border border-border bg-card/70 p-5 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium">AI comparison in progress</span>
          <span className="inline-flex items-center gap-1 text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" /> Gemini
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="fb-surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">Lost report · LR-8K2M</p>
            <p className="mt-2 font-display text-sm font-semibold text-foreground">Black phone · iPhone 13</p>
            <p className="mt-1 text-xs text-muted-foreground">Electronics · Library block C</p>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" /> Lost 3 days ago, around 4:20 PM
            </p>
          </div>
          <div className="fb-surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">Found report · FR-3P9A</p>
            <p className="mt-2 font-display text-sm font-semibold text-foreground">Black mobile phone found</p>
            <p className="mt-1 text-xs text-muted-foreground">Electronics · Library entrance desk</p>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" /> Found 3 days ago, around 6:05 PM
            </p>
          </div>
        </div>

        <div className="relative my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-500/60 to-violet-500/60" />
          <span className="relative flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200">
            <span className="absolute -inset-1 rounded-full border border-cyan-400/30 fb-pulse-ring" />
            AI similarity 87/100
          </span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent via-cyan-500/60 to-cyan-500/60" />
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { label: 'Category', value: 'Match' },
            { label: 'Location', value: 'Very close' },
            { label: 'Date & time', value: 'Within 2 h' },
          ].map((row) => (
            <div key={row.label} className="rounded-xl border border-border bg-secondary/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{row.label}</p>
              <p className="mt-0.5 text-xs font-semibold text-foreground">{row.value}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          A score only recommends a pair for review. The owner decides whether to claim, the Global Admin approves, and
          the handover code closes the case.
        </p>
      </div>
    </div>
  );
}