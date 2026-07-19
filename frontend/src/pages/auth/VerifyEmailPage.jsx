import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import Button from '@/components/ui/Button';

const STATUS = {
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState(STATUS.LOADING);
  const [errorMessage, setErrorMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!token) {
      setStatus(STATUS.ERROR);
      setErrorMessage('No verification token found. Please use the link from your email.');
      return;
    }

    api
      .post('/auth/verify-email', { token })
      .then(() => setStatus(STATUS.SUCCESS))
      .catch((err) => {
        setStatus(STATUS.ERROR);
        setErrorMessage(
          err.message || 'This verification link has expired or already been used.'
        );
      });
  }, [token]);

  const handleResend = async () => {
    setIsResending(true);
    try {
      await api.post('/auth/resend-verification');
      setResendSuccess(true);
    } catch {
      // Silently ignore — prevents email enumeration
      setResendSuccess(true);
    } finally {
      setIsResending(false);
    }
  };

  if (status === STATUS.LOADING) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
        <p className="text-sm text-gray-500">Verifying your email address&hellip;</p>
      </div>
    );
  }

  if (status === STATUS.SUCCESS) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
          <CheckCircle2 className="h-7 w-7 text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Email verified!</h2>
        <p className="mt-2 text-sm text-gray-500">
          Your email address has been confirmed. You can now use all features.
        </p>
        <Link to="/dashboard" replace>
          <Button size="md" className="mt-6">
            Go to dashboard
          </Button>
        </Link>
      </div>
    );
  }

  // ERROR state
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <XCircle className="h-7 w-7 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900">Verification failed</h2>
      <p className="mt-2 text-sm text-gray-500">{errorMessage}</p>

      <div className="mt-6 flex flex-col items-center gap-3">
        {resendSuccess ? (
          <p className="text-sm text-green-600 font-medium">
            A new verification email has been sent — check your inbox.
          </p>
        ) : (
          <Button
            variant="secondary"
            size="md"
            isLoading={isResending}
            onClick={handleResend}
          >
            Resend verification email
          </Button>
        )}

        <Link
          to="/login"
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
