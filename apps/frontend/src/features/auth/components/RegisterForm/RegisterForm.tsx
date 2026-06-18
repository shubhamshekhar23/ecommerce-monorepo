'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterFormValues } from '../../utils/auth.schemas';
import { useRegister } from '../../hooks';
import { resolveAuthError } from '../../utils/auth.utils';
import { Input } from '@/components/Form';
import styles from './RegisterForm.module.scss';

export function RegisterForm() {
  const { mutate: register, isPending, error } = useRegister();

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (values: RegisterFormValues): void => {
    const { confirmPassword: _confirmPassword, ...payload } = values;
    register(payload);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
      <h1 className={styles.title}>Create account</h1>

      {error && (
        <div role="alert" className={styles.serverError}>
          {resolveAuthError(error, 'Registration failed. Please try again.')}
        </div>
      )}

      <div className={styles.nameRow}>
        <Input
          {...formRegister('firstName')}
          id="firstName"
          label="First name"
          type="text"
          autoComplete="given-name"
          error={errors.firstName?.message}
        />
        <Input
          {...formRegister('lastName')}
          id="lastName"
          label="Last name"
          type="text"
          autoComplete="family-name"
          error={errors.lastName?.message}
        />
      </div>

      <Input
        {...formRegister('email')}
        id="email"
        label="Email address"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
      />

      <Input
        {...formRegister('password')}
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
      />

      <Input
        {...formRegister('confirmPassword')}
        id="confirmPassword"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
      />

      <button type="submit" disabled={isPending} className={styles.submit}>
        {isPending ? 'Creating account...' : 'Create account'}
      </button>

      <div className={styles.footer}>
        <p className={styles.footerText}>
          Already have an account?{' '}
          <Link href="/login" className={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </form>
  );
}
