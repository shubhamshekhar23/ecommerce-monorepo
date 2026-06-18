'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues } from '../../utils/auth.schemas';
import { useLogin } from '../../hooks';
import { resolveAuthError } from '../../utils/auth.utils';
import { Input } from '@/components/Form';
import styles from './LoginForm.module.scss';

interface LoginFormProps {
  sessionExpired?: boolean;
}

export function LoginForm({ sessionExpired = false }: LoginFormProps) {
  const { mutate: login, isPending, error } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (values: LoginFormValues): void => {
    login({ email: values.email, password: values.password });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
      <h1 className={styles.title}>Sign in</h1>

      {sessionExpired && (
        <div role="alert" className={styles.sessionExpiredBanner}>
          Your session expired. Please sign in again.
        </div>
      )}

      {error && (
        <div role="alert" className={styles.serverError}>
          {resolveAuthError(error, 'Sign in failed. Please try again.')}
        </div>
      )}

      <Input
        {...register('email')}
        id="email"
        label="Email address"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
      />

      <Input
        {...register('password')}
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
      />

      <button type="submit" disabled={isPending} className={styles.submit}>
        {isPending ? 'Signing in...' : 'Sign in'}
      </button>

      <div className={styles.footer}>
        <p className={styles.footerText}>
          New to us?{' '}
          <Link href="/register" className={styles.link}>
            Create your account
          </Link>
        </p>
      </div>
    </form>
  );
}
