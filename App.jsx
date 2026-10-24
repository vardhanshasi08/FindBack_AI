import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import AdminRoute from '@/components/AdminRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import ReportLost from './pages/ReportLost';
import ReportFound from './pages/ReportFound';
import MyReports from './pages/MyReports';
import ReportDetail from './pages/ReportDetail';
import Matches from './pages/Matches';
import MatchDetail from './pages/MatchDetail';
import Cases from './pages/Cases';
import CaseDetail from './pages/CaseDetail';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminReports from './pages/admin/AdminReports';
import AdminMatches from './pages/admin/AdminMatches';
import AdminClaims from './pages/admin/AdminClaims';
import AdminClaimDetail from './pages/admin/AdminClaimDetail';
import AdminCases from './pages/admin/AdminCases';
import AdminAudit from './pages/admin/AdminAudit';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/report/lost" element={<ReportLost />} />
          <Route path="/report/found" element={<ReportFound />} />
          <Route path="/reports" element={<MyReports />} />
          <Route path="/reports/:type/:id" element={<ReportDetail />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/matches/:id" element={<MatchDetail />} />
          <Route path="/cases" element={<Cases />} />
          <Route path="/cases/:id" element={<CaseDetail />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/lost" element={<AdminReports kind="lost" />} />
            <Route path="/admin/found" element={<AdminReports kind="found" />} />
            <Route path="/admin/matches" element={<AdminMatches />} />
            <Route path="/admin/claims" element={<AdminClaims />} />
            <Route path="/admin/claims/:id" element={<AdminClaimDetail />} />
            <Route path="/admin/cases" element={<AdminCases />} />
            <Route path="/admin/audit" element={<AdminAudit />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App