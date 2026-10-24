import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Package, Sparkles } from 'lucide-react';

import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { formatDateTime, scoreClasses } from '@/lib/status';
import usePagedList from '@/hooks/usePagedList';

const OWNER_FILTERS = [
  { key: 'waiting', label: 'Awaiting your decision' },
  { key: 'claimed', label: 'Claimed' },
  { key: 'declined', label: 'Declined' },
  { key: 'all', label: 'All matches' },
];

const RESPONSE_LABELS = {
  none: 'Awaiting your decision',
  claimed: 'You requested a claim',
  declined: 'You declined this match',
};

export default function Matches() {
  const { user } = useAuth();
  const [tab, setTab] = useState('owner');
  const [filter, setFilter] = useState('waiting');

  const ownerQuery = { owner_id: user?.id, ...(filter === 'all' ? {} : { owner_response: filter === 'waiting' ? 'none' : filter }) };
  const finderQuery = { finder_id: user?.id };

  const ownerList = usePagedList('AIMatch', ownerQuery, { pageSize: 10, enabled: tab === 'owner' && !!user?.id });
  const finderList = usePagedList('AIMatch', finderQuery, { pageSize: 10, enabled: tab === 'finder' && !!user?.id });

  const active = tab === 'owner' ? ownerList : finderList;

  return (
    <div>
      <PageHeader
        eyebrow="AI matches"
        title="Potential matches"
        description="Gemini scores every relevant report pair from 0 to 100 against a configurable threshold. A score only recommends a pair for review — it never decides ownership."
      />

      <div className="mb-5 inline-flex rounded-xl border border-border bg-secondary/50 p-1">
        {[
          { key: 'owner', label: 'For my lost items', icon: Sparkles },
          { key: 'finder', label: 'For my found reports', icon: Package },
        ].map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setTab(option.key)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === option.key ? 'fb-gradient text-white' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <option.icon className="h-4 w-4" /> {option.label}
          </button>
        ))}
      </div>

      {tab === 'owner' && (
        <div className="mb-5 flex flex-wrap gap-2">
          {OWNER_FILTERS.map((option) => (
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
      )}

      {active.error && (
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{active.error}</p>
      )}

      {active.loading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-32 rounded-xl fb-shimmer" />
          ))}
        </div>
      ) : active.items.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={tab === 'owner' ? 'No qualifying match yet' : 'No match involves your found reports yet'}
          description={
            tab === 'owner'
              ? 'Matching compares your lost reports with relevant found reports and only surfaces pairs at or above the threshold. It runs again whenever someone reports an item in the other direction.'
              : 'When someone loses an item similar to what you reported, the AI match and the claim status appear here.'
          }
          action={
            tab === 'owner' ? (
              <Button asChild className="fb-gradient mt-2 text-white">
                <Link to="/report/lost">Report a lost item</Link>
              </Button>
            ) : (
              <Button asChild className="fb-gradient mt-2 text-white">
                <Link to="/report/found">Report a found item</Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="grid gap-3">
            {active.items.map((match) => (
              <Link key={match.id} to={`/matches/${match.id}`} className="fb-card block p-5 transition-colors hover:border-violet-500/40">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                        {match.lost_report_code} ↔ {match.found_report_code}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${scoreClasses(match.score)}`}>
                        {match.score}/100
                      </span>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                        {RESPONSE_LABELS[match.owner_response] || match.owner_response}
                      </span>
                    </div>
                    <p className="mt-2 truncate font-display text-base font-semibold text-foreground">{match.item_name}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{match.explanation}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">{formatDateTime(match.created_date)}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-300">
                    Open <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {active.hasMore && (
            <div className="mt-5 flex justify-center">
              <Button variant="outline" onClick={active.loadMore} disabled={active.loadingMore}>
                {active.loadingMore ? 'Loading…' : 'Load more matches'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}