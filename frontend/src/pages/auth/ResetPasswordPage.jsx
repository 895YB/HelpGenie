import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ mode: 'onBlur' });

  const password = watch('password');

  // No token in URL — show an error immediately
  if (!token) {
    return (
      <div className="text-center">
        <Alert
          type="error"
          message="Invalid or missing reset token. Please request a new password reset link."
        />
        <Link
          to="/forgot-password"
          className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          Request new link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
          <CheckCircle2 className="h-7 w-7 text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Password updated</h2>
        <p className="mt-2 text-sm text-gray-500">
          Your password has been reset successfully.
        </p>
        <Button
          onClick={() => navigate('/login', { replace: true })}
          size="md"
          className="mt-6"
        >
          Sign in
        </Button>
      </div>
    );
  }

  const onSubmit = async ({ password: newPassword }) => {
    setServerError('');
    setIsSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, password: newPassword });
      setSuccess(true);
    } catch (err) {
      setServerError(
        err.message || 'This link has expired or already been used. Please request a new one.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
        <p className="mt-1 text-sm text-gray-500">
          Choose a strong password for your account.
        </p>
      </div>

      <Alert type="error" message={serverError} onDismiss={() => setServerError('')} />

      <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
        <Input
          id="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          helpText="Minimum 8 characters"
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'Password must be at least 8 characters' },
          })}
        />

        <Input
          id="confirmPassword"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: (v) => v === password || 'Passwords do not match',
          })}
        />

        <Button
          type="submit"
          size="lg"
          isLoading={isSubmitting}
          className="w-full mt-2"
        >
          Reset password
        </Button>
      </form>
    </div>
  );
}
