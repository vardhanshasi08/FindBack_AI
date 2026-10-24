import React from 'react';
import { AlertTriangle, Loader2, Search } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AdminListLayout({
  eyebrow,
  title,
  description,
  actions,
  search,
  onSearchChange,
  searchPlaceholder = 'Search',
  filters,
  filter,
  onFilterChange,
  loading,
  error,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  count,
  children,
  hasMore,
  loadingMore,
  loadMore,
  moreLabel = 'Load more',
}) {
  return (
    <div>
      <PageHeader eyebrow={eyebrow} title={title} description={description}>
        {actions}
      </PageHeader>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {filters && (
          <div className="flex flex-wrap gap-2">
            {filters.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => onFilterChange(option.key)}
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
        <div className="relative sm:ml-auto sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
            aria-label={searchPlaceholder}
          />
        </div>
      </div>

      {error && (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      {loading ? (
        <div className="grid gap-3">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-20 rounded-xl fb-shimmer" />
          ))}
        </div>
      ) : (
        <>
          {typeof count === 'number' && (
            <p className="mb-3 text-xs text-muted-foreground">
              {count} {count === 1 ? 'record' : 'records'} shown
            </p>
          )}
          {children}
          {hasMore && (
            <div className="mt-5 flex justify-center">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loadingMore ? 'Loading…' : moreLabel}
              </Button>
            </div>
          )}
        </>
      )}

      {!loading && count === 0 && (
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      )}
    </div>
  );
}