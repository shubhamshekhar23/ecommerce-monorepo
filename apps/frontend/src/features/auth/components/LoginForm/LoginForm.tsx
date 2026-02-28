// src/features/auth/components/LoginForm/LoginForm.tsx

'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues } from '../../utils/auth.schemas';
import { useLogin } from '../../hooks';
import { FormField } from '@/components/FormField/FormField';
import styles from './LoginForm.module.scss';

export function LoginForm() {
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

      {error && (
        <div role="alert" className={styles.serverError}>
          {(error as any).message || 'Sign in failed. Please try again.'}
        </div>
      )}

      <FormField id="email" label="Email address" error={errors.email?.message}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className={styles.input}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
      </FormField>

      <FormField id="password" label="Password" error={errors.password?.message}>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className={styles.input}
          aria-describedby={errors.password ? 'password-error' : undefined}
          {...register('password')}
        />
      </FormField>

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
