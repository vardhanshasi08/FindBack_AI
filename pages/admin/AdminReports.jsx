import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, PackageSearch } from 'lucide-react';

import AdminListLayout from '@/components/admin/AdminListLayout';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTime, regexSearch } from '@/lib/status';
import usePagedList from '@/hooks/usePagedList';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Reported' },
  { key: 'matched', label: 'Potential match' },
  { key: 'claim', label: 'In claim or handover' },
  { key: 'returned', label: 'Returned' },
  { key: 'rejected', label: 'Claim rejected' },
];

const GROUPS = {
  open: ['LOST_REPORTED', 'FOUND_REPORTED'],
  matched: ['MATCH_FOUND'],
  claim: ['CLAIM_PENDING', 'CLAIM_APPROVED', 'AWAITING_HANDOVER_DETAILS', 'HANDOVER_SCHEDULED'],
  returned: ['RETURNED'],
  rejected: ['CLAIM_REJECTED'],
};

export default function AdminReports({ kind = 'lost' }) {
  const isLost = kind === 'lost';
  const [filter, setFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const query = useMemo(() => {
    const next = {};
    if (search) {
      next.$or = [{ item_name: { $regex: regexSearch(search) } }, { report_code: { $regex: regexSearch(search) } }];
    }
    if (GROUPS[filter]) next.status = { $in: GROUPS[filter] };
    return next;
  }, [search, filter]);

  const { items, loading, loadingMore, error, hasMore, loadMore } = usePagedList(
    isLost ? 'LostReport' : 'FoundReport',
    query,
    { pageSize: 12 }
  );

  return (
    <AdminListLayout
      eyebrow="Global Admin"
      title={isLost ? 'Lost reports' : 'Found reports'}
      description={
        isLost
          ? 'Every lost report on the platform, with its owner, match status and current case state.'
          : 'Every found report on the platform. Finder contact details stay with the case workflow.'
      }
      search={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="Search by item name or report ID"
      filters={FILTERS}
      filter={filter}
      onFilterChange={setFilter}
      loading={loading}
      error={error}
      count={items.length}
      emptyIcon={isLost ? PackageSearch : Package}
      emptyTitle={search ? 'No report matches that search' : 'No reports in this filter'}
      emptyDescription={search ? 'Try a different item name or report ID.' : 'Reports appear here as users submit them.'}
      hasMore={hasMore}
      loadingMore={loadingMore}
      loadMore={loadMore}
      moreLabel="Load more reports"
    >
      <div className="grid gap-3">
        {items.map((report) => (
          <div key={report.id} className="fb-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                    {report.report_code}
                  </span>
                  <StatusBadge status={report.status} />
                  {report.match_status === 'failed' && (
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300">
                      matching failed
                    </span>
                  )}
                  {typeof report.has_secret_detail === 'boolean' && report.has_secret_detail && (
                    <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[11px] text-violet-200">
                      protected detail on file
                    </span>
                  )}
                </div>
                <p className="mt-2 truncate font-display text-base font-semibold text-foreground">{report.item_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {report.category}
                  {report.color ? ` · ${report.color}` : ''} ·{' '}
                  {isLost ? report.lost_location : report.found_location} ·{' '}
                  {isLost ? report.owner_name : report.finder_name}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {isLost ? 'Reported lost' : 'Reported found'} {formatDateTime(isLost ? report.lost_datetime : report.found_datetime)} ·
                  submitted {formatDateTime(report.created_date)}
                </p>
              </div>
              <Link
                to={`/reports/${kind}/${report.id}`}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-violet-300 transition-colors hover:border-violet-500/40"
              >
                Open report
              </Link>
            </div>
          </div>
        ))}
      </div>
    </AdminListLayout>
  );
}