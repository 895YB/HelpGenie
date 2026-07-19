import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';

export default function RegisterPage() {
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();

  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ mode: 'onBlur' });

  const password = watch('password');

  const onSubmit = async (values) => {
    setServerError('');
    setIsSubmitting(true);
    try {
      await authRegister({
        name: values.name,
        email: values.email,
        password: values.password,
        companyName: values.companyName,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500">
          Start your 14-day free trial. No credit card required.
        </p>
      </div>

      <Alert type="error" message={serverError} onDismiss={() => setServerError('')} />

      <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
        <Input
          id="name"
          label="Full name"
          type="text"
          autoComplete="name"
          placeholder="Jane Smith"
          error={errors.name?.message}
          {...register('name', {
            required: 'Full name is required',
            minLength: { value: 2, message: 'Name must be at least 2 characters' },
          })}
        />

        <Input
          id="companyName"
          label="Company name"
          type="text"
          autoComplete="organization"
          placeholder="Acme Corp"
          error={errors.companyName?.message}
          {...register('companyName', {
            required: 'Company name is required',
            minLength: { value: 2, message: 'Company name must be at least 2 characters' },
          })}
        />

        <Input
          id="email"
          label="Work email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' },
          })}
        />

        <Input
          id="password"
          label="Password"
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
          label="Confirm password"
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
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
      </p>

      <p className="mt-4 text-center text-xs text-gray-400">
        By creating an account you agree to our{' '}
        <span className="underline cursor-pointer">Terms of Service</span> and{' '}
        <span className="underline cursor-pointer">Privacy Policy</span>.
      </p>
    </div>
  );
}
