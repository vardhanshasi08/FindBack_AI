import {
  Bell,
  Clock,
  Gavel,
  History,
  LayoutDashboard,
  Package,
  PackageSearch,
  Sparkles,
  User,
} from 'lucide-react';

export const USER_NAV = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Report Lost', to: '/report/lost', icon: PackageSearch },
  { label: 'Report Found', to: '/report/found', icon: Package },
  { label: 'My Reports', to: '/reports', icon: History },
  { label: 'Matches', to: '/matches', icon: Sparkles },
  { label: 'Cases', to: '/cases', icon: Clock },
  { label: 'Notifications', to: '/notifications', icon: Bell },
  { label: 'Profile', to: '/profile', icon: User },
];

export const ADMIN_NAV = [
  { label: 'Admin Dashboard', to: '/admin', icon: LayoutDashboard },
  { label: 'Lost Reports', to: '/admin/lost', icon: PackageSearch },
  { label: 'Found Reports', to: '/admin/found', icon: Package },
  { label: 'AI Matches', to: '/admin/matches', icon: Sparkles },
  { label: 'Claim Requests', to: '/admin/claims', icon: Gavel },
  { label: 'Handover Cases', to: '/admin/cases', icon: Clock },
  { label: 'Notifications', to: '/notifications', icon: Bell },
  { label: 'Audit History', to: '/admin/audit', icon: History },
];