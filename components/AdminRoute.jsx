import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

/** Server-side rules stay authoritative; this only keeps admin screens out of reach. */
export default function AdminRoute() {
  const { user, isLoadingAuth, authChecked } = useAuth();

  if (isLoadingAuth || !authChecked) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-violet-500" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}