const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bell, CheckCheck, Loader2 } from 'lucide-react';

import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { NOTIFICATION_TITLES, formatDateTime, relativeTime } from '@/lib/status';
import usePagedList from '@/hooks/usePagedList';
import { extractError } from '@/lib/errors';

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const query = {
    recipient_id: user?.id,
    ...(filter === 'unread' ? { is_read: false } : {}),
  };
  const { items, loading, loadingMore, hasMore, loadMore, reload, setItems } = usePagedList('Notification', query, {
    pageSize: 15,
    enabled: !!user?.id,
  });

  const unreadCount = items.filter((item) => !item.is_read).length;

  const openNotification = async (notification) => {
    if (!notification.is_read) {
      try {
        await db.functions.invoke('markNotifications', { ids: [notification.id] });
        setItems((prev) => prev.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)));
      } catch (err) {
        // A failed read-marking must not block navigation.
      }
    }
    if (notification.link) navigate(notification.link);
  };

  const markAllRead = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await db.functions.invoke('markNotifications', { all: true });
      if (res.data?.error) throw new Error(res.data.error);
      reload();
    } catch (err) {
      setError(extractError(err, 'Notifications could not be marked as read.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Notifications"
        title="Your notification history"
        description="Matches, claim decisions, handover changes and closures — stored in your account so nothing is lost after a refresh."
      >
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllRead} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
            Mark all as read
          </Button>
        )}
      </PageHeader>

      <div className="mb-5 flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'unread', label: 'Unread' },
        ].map((option) => (
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
            <div key={index} className="h-20 rounded-xl fb-shimmer" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === 'unread' ? 'Nothing unread' : 'No notifications yet'}
          description={
            filter === 'unread'
              ? 'You have read every notification in your account.'
              : 'You will be notified here when a report is submitted, a potential match is found, a claim is decided or a handover is scheduled.'
          }
        />
      ) : (
        <>
          <ul className="grid gap-3">
            {items.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => openNotification(notification)}
                  className={`fb-card flex w-full items-start gap-3 p-4 text-left transition-colors hover:border-violet-500/40 ${
                    notification.is_read ? '' : 'border-violet-500/40'
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.is_read ? 'bg-slate-600' : 'bg-violet-400'}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{notification.title}</span>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {NOTIFICATION_TITLES[notification.type] || 'Update'}
                      </span>
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{notification.message}</span>
                    <span className="mt-1.5 block text-[11px] text-muted-foreground">
                      {formatDateTime(notification.created_date)} ({relativeTime(notification.created_date)})
                    </span>
                  </span>
                  {notification.link && <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-violet-300" />}
                </button>
              </li>
            ))}
          </ul>
          {hasMore && (
            <div className="mt-5 flex justify-center">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more notifications'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}