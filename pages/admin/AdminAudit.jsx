import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { History } from 'lucide-react';

import AdminListLayout from '@/components/admin/AdminListLayout';
import { formatDateTime, regexSearch, statusLabel } from '@/lib/status';
import usePagedList from '@/hooks/usePagedList';

const FILTERS = [
  { key: 'all', label: 'All events' },
  { key: 'reports', label: 'Report events' },
  { key: 'claim', label: 'Claim decisions' },
  { key: 'handover', label: 'Handover & code' },
  { key: 'returned', label: 'Closures' },
];

const QUERIES = {
  all: {},
  reports: { action: { $in: ['LOST_REPORT_SUBMITTED', 'FOUND_REPORT_SUBMITTED', 'LOST_REPORT_UPDATED', 'FOUND_REPORT_UPDATED'] } },
  claim: { action: { $in: ['CLAIM_REQUESTED', 'CLAIM_APPROVED', 'CLAIM_REJECTED', 'MATCH_DECLINED', 'SECRET_VIEWED'] } },
  handover: { action: { $in: ['HANDOVER_SCHEDULED', 'HANDOVER_UPDATED', 'OTP_ISSUED', 'OTP_MISMATCH'] } },
  returned: { action: { $in: ['CASE_RETURNED'] } },
};

const ACTION_LABELS = {
  LOST_REPORT_SUBMITTED: 'Lost report submitted',
  FOUND_REPORT_SUBMITTED: 'Found report submitted',
  LOST_REPORT_UPDATED: 'Lost report edited',
  FOUND_REPORT_UPDATED: 'Found report edited',
  AI_MATCH_RUN: 'AI matching run',
  AI_MATCH_FAILED: 'AI matching failed',
  MATCH_DECLINED: 'Match declined by owner',
  CLAIM_REQUESTED: 'Claim requested',
  CLAIM_APPROVED: 'Claim approved',
  CLAIM_REJECTED: 'Claim rejected',
  HANDOVER_SCHEDULED: 'Handover scheduled',
  HANDOVER_UPDATED: 'Handover updated',
  OTP_ISSUED: 'Handover code generated',
  OTP_MISMATCH: 'Incorrect handover code',
  CASE_RETURNED: 'Case closed as returned',
  SECRET_VIEWED: 'Protected detail opened',
};

export default function AdminAudit() {
  const [filter, setFilter] = useState('all');
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
        { summary: { $regex: regexSearch(search) } },
      ];
    }
    return next;
  }, [filter, search]);

  const { items, loading, loadingMore, error, hasMore, loadMore } = usePagedList('CaseHistory', query, {
    pageSize: 20,
  });

  return (
    <AdminListLayout
      eyebrow="Global Admin"
      title="Audit history"
      description="An append-only record of what happened, who did it and which status changed. Handover codes, passwords and ownership details are never written here."
      search={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="Search by case ID or event text"
      filters={FILTERS}
      filter={filter}
      onFilterChange={setFilter}
      loading={loading}
      error={error}
      count={items.length}
      emptyIcon={History}
      emptyTitle="No audit events in this filter"
      emptyDescription="Events are written as soon as reports, claims, handovers or codes change state."
      hasMore={hasMore}
      loadingMore={loadingMore}
      loadMore={loadMore}
      moreLabel="Load more events"
    >
      <div className="grid gap-3">
        {items.map((event) => (
          <div key={event.id} className="fb-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-200">
                {ACTION_LABELS[event.action] || event.action}
              </span>
              {event.case_code && (
                <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                  {event.case_code}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground">{formatDateTime(event.created_date)}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground">{event.summary}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {event.actor_name ? `By ${event.actor_name}` : 'By system'}
              {event.actor_role ? ` (${event.actor_role})` : ''}
              {event.previous_status && event.new_status
                ? ` · ${statusLabel(event.previous_status)} → ${statusLabel(event.new_status)}`
                : ''}
            </p>
            {event.case_id && (
              <Link to={`/cases/${event.case_id}`} className="mt-2 inline-block text-[11px] font-medium text-violet-300 hover:text-violet-200">
                Open case
              </Link>
            )}
          </div>
        ))}
      </div>
    </AdminListLayout>
  );
}