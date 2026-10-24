import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const TONE_ICON = {
  violet: 'text-violet-300 bg-violet-500/10 border-violet-500/30',
  cyan: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30',
  amber: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
  green: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  red: 'text-red-300 bg-red-500/10 border-red-500/30',
  slate: 'text-muted-foreground bg-secondary border-border',
};

export default function StatCard({ label, value, icon: Icon, tone = 'violet', hint, to, loading = false }) {
  const body = (
    <div className="group fb-card flex h-full flex-col justify-between p-5 transition-colors hover:border-violet-500/40">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${TONE_ICON[tone] || TONE_ICON.slate}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="font-display text-3xl font-semibold text-foreground">
          {loading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : value}
        </p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );

  if (!to) return body;
  return (
    <Link to={to} className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {body}
    </Link>
  );
}