const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Bell, LogOut, Menu, ShieldCheck, User as UserIcon, X } from 'lucide-react';

import { useAuth } from '@/lib/AuthContext';
import Logo from '@/components/Logo';
import { ADMIN_NAV, USER_NAV } from '@/lib/nav';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = user?.role === 'admin';
  const items = isAdmin ? ADMIN_NAV : USER_NAV;

  const refreshUnread = useCallback(async () => {
    if (!user?.id) return;
    try {
      const count = await db.entities.Notification.count({ recipient_id: user.id, is_read: false });
      setUnread(typeof count === 'number' ? count : 0);
    } catch (error) {
      setUnread(0);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshUnread();
    let unsubscribe = () => {};
    try {
      unsubscribe = db.entities.Notification.subscribe(() => refreshUnread());
    } catch (error) {
      unsubscribe = () => {};
    }
    return () => unsubscribe();
  }, [refreshUnread, location.pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const linkClasses = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
    }`;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6">
          <Link to={isAdmin ? '/admin' : '/dashboard'} className="shrink-0">
            <Logo size="sm" />
          </Link>
          <nav className="ml-3 hidden items-center gap-0.5 lg:flex">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/admin'} className={linkClasses}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <Link
              to="/notifications"
              className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-semibold text-white">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm text-foreground transition-colors hover:border-violet-500/40"
                >
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="hidden max-w-[130px] truncate sm:inline">
                    {user?.full_name || user?.email || 'Account'}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="truncate text-sm text-foreground">{user?.full_name || 'FindBack AI user'}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-violet-300">
                    {isAdmin ? (
                      <>
                        <ShieldCheck className="h-3 w-3" /> Global Admin
                      </>
                    ) : (
                      'Registered user'
                    )}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-red-300">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="border-t border-border bg-card/60 px-4 py-3 lg:hidden">
            <div className="grid grid-cols-2 gap-1.5">
              {items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/admin'} className={linkClasses}>
                  <span className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </span>
                </NavLink>
              ))}
              <button
                type="button"
                onClick={() => logout()}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-secondary/60"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>
      <footer className="border-t border-border py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <span>FindBack AI — AI suggests, the owner decides, the Global Admin approves, the code closes the case.</span>
          <span>Ownership details are never shared with finders and never sent to AI.</span>
        </div>
      </footer>
    </div>
  );
}