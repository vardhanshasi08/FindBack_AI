import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';

import AdminListLayout from '@/components/admin/AdminListLayout';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTime, regexSearch } from '@/lib/status';
import usePagedList from '@/hooks/usePagedList';

const FILTERS = [
  { key: 'awaiting', label: 'Awaiting details' },
  { key: 'scheduled', label: 'Handover scheduled' },
  { key: 'returned', label: 'Returned' },
  { key: 'all', label: 'All cases' },
];

const QUERIES = {
  awaiting: { case_status: 'AWAITING_HANDOVER_DETAILS' },
  scheduled: { case_status: 'HANDOVER_SCHEDULED' },
  returned: { case_status: 'RETURNED' },
  all: {},
};

export default function AdminCases() {
  const [filter, setFilter] = useState('scheduled');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const query = useMemo(() => {
    const next = { ...QUERIES[filter] };
    if (search) {
      next.$or = [
        { case_code: { $regex: regexSearch(search) } },
        { item_name: { $regex: regexSearch(search) } },
      ];
    }
    return next;
  }, [filter, search]);

  const { items, loading, loadingMore, error, hasMore, loadMore } = usePagedList('RecoveryCase', query, {
    pageSize: 12,
  });

  return (
    <AdminListLayout
      eyebrow="Global Admin"
      title="Handover cases"
      description="Monitor who is meeting whom, when the handover is planned and whether the code has been used. A verified code closes the case — no admin action is needed at handover."
      search={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="Search by case ID or item"
      filters={FILTERS}
      filter={filter}
      onFilterChange={setFilter}
      loading={loading}
      error={error}
      count={items.length}
      emptyIcon={Clock}
      emptyTitle="No cases in this filter"
      emptyDescription="Cases appear after a claim is approved and the finder schedules the meeting."
      hasMore={hasMore}
      loadingMore={loadingMore}
      loadMore={loadMore}
      moreLabel="Load more cases"
    >
      <div className="grid gap-3">
        {items.map((item) => (
          <div key={item.id} className="fb-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                    {item.case_code}
                  </span>
                  <StatusBadge status={item.case_status} />
                  <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-300">
                    AI {item.match_score ?? '—'}/100
                  </span>
                </div>
                <p className="mt-2 truncate font-display text-base font-semibold text-foreground">{item.item_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Owner: {item.owner_name || 'unknown'} · Finder: {item.finder_name || 'unknown'}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Approved {item.approved_at ? formatDateTime(item.approved_at) : '—'}
                  {item.returned_at ? ` · returned ${formatDateTime(item.returned_at)}` : ''}
                </p>
              </div>
              <Link
                to={`/cases/${item.id}`}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-violet-300 transition-colors hover:border-violet-500/40"
              >
                Open case
              </Link>
            </div>
          </div>
        ))}
      </div>
    </AdminListLayout>
  );
}