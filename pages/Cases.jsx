import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';

import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { formatDateTime, relativeTime } from '@/lib/status';
import usePagedList from '@/hooks/usePagedList';

const FILTERS = [
  { key: 'all', label: 'All cases' },
  { key: 'claim', label: 'Claim review' },
  { key: 'handover', label: 'Handover scheduled' },
  { key: 'returned', label: 'Returned' },
];

const QUERIES = {
  all: null,
  claim: { claim_status: 'CLAIM_PENDING' },
  handover: { case_status: 'HANDOVER_SCHEDULED' },
  returned: { case_status: 'RETURNED' },
};

export default function Cases() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [filter, setFilter] = useState(params.get('filter') || 'all');

  const query = useMemo(
    () => ({
      $or: [{ owner_id: user?.id }, { finder_id: user?.id }],
      ...(QUERIES[filter] || {}),
    }),
    [user?.id, filter]
  );

  const { items, loading, loadingMore, error, hasMore, loadMore } = usePagedList('RecoveryCase', query, {
    pageSize: 10,
    enabled: !!user?.id,
  });

  return (
    <div>
      <PageHeader
        eyebrow="Recovery cases"
        title="Your handover cases"
        description="A case is created when a claim is requested. It stays open until the finder enters the handover code at the meeting — only then does it close as returned."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setFilter(option.key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === option.key
                ? 'border-violet-500/50 bg-violet-500/10 text-violet-200'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

      {loading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-24 rounded-xl fb-shimmer" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No cases here yet"
          description="Cases appear when you claim a matched item, or when someone claims an item you reported finding. Every step — claim review, handover and closure — is tracked here."
          action={
            <Button asChild className="fb-gradient mt-2 text-white">
              <Link to="/matches">Review my matches</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-3">
            {items.map((item) => (
              <Link key={item.id} to={`/cases/${item.id}`} className="fb-card block p-5 transition-colors hover:border-violet-500/40">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                        {item.case_code}
                      </span>
                      <StatusBadge status={item.case_status} />
                      <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                        {item.owner_id === user?.id ? 'You are the owner' : 'You are the finder'}
                      </span>
                      {typeof item.match_score === 'number' && (
                        <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-300">
                          AI {item.match_score}/100
                        </span>
                      )}
                    </div>
                    <p className="mt-2 truncate font-display text-base font-semibold text-foreground">{item.item_name}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {item.returned_at
                        ? `Returned ${formatDateTime(item.returned_at)}`
                        : `Updated ${relativeTime(item.updated_date)}`}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-300">
                    Open case <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {hasMore && (
            <div className="mt-5 flex justify-center">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more cases'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}