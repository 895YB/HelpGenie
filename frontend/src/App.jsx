import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import AuthLayout from '@/layouts/AuthLayout';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage';

// Dashboard pages added in Module 10+
const DashboardPlaceholder = () => (
  <div className="flex h-screen items-center justify-center text-gray-500">
    Dashboard — coming soon
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public auth routes ─────────────────────────────── */}
        <Route element={<AuthLayout />}>
          <Route path="/login"          element={<LoginPage />} />
          <Route path="/register"       element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email"   element={<VerifyEmailPage />} />
        </Route>

        {/* ── Protected dashboard routes ─────────────────────── */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard/*" element={<DashboardPlaceholder />} />
        </Route>

        {/* ── Default redirect ───────────────────────────────── */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
