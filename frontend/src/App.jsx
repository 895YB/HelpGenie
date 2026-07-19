import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import AuthLayout from '@/layouts/AuthLayout';
import DashboardLayout from '@/layouts/DashboardLayout';

import LoginPage          from '@/pages/auth/LoginPage';
import RegisterPage       from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage  from '@/pages/auth/ResetPasswordPage';
import VerifyEmailPage    from '@/pages/auth/VerifyEmailPage';
import OverviewPage       from '@/pages/dashboard/OverviewPage';
import DocumentsPage      from '@/pages/dashboard/DocumentsPage';
import AnalyticsPage      from '@/pages/dashboard/AnalyticsPage';
import ConversationsPage  from '@/pages/dashboard/ConversationsPage';
import SettingsPage       from '@/pages/dashboard/SettingsPage';
import TeamPage           from '@/pages/dashboard/TeamPage';
import SubscriptionPage   from '@/pages/dashboard/SubscriptionPage';

// Placeholder for pages added in upcoming modules
const ComingSoon = ({ name }) => (
  <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-gray-200">
    <p className="text-sm text-gray-400">{name} — coming soon</p>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Auth routes (public, redirect to /dashboard if logged in) ── */}
        <Route element={<AuthLayout />}>
          <Route path="/login"           element={<LoginPage />} />
          <Route path="/register"        element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password"  element={<ResetPasswordPage />} />
          <Route path="/verify-email"    element={<VerifyEmailPage />} />
        </Route>

        {/* ── Protected dashboard routes ───────────────────────────────── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard"               element={<OverviewPage />} />
            <Route path="/dashboard/documents"     element={<DocumentsPage />} />
            <Route path="/dashboard/analytics"     element={<AnalyticsPage />} />
            <Route path="/dashboard/conversations" element={<ConversationsPage />} />
            <Route path="/dashboard/team"          element={<TeamPage />} />
            <Route path="/dashboard/settings"      element={<SettingsPage />} />
            <Route path="/dashboard/subscription"  element={<SubscriptionPage />} />
          </Route>
        </Route>

        {/* ── Fallback ─────────────────────────────────────────────────── */}
        <Route path="/"  element={<Navigate to="/dashboard" replace />} />
        <Route path="*"  element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
