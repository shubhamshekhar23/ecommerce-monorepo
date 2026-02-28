// src/features/auth/components/RegisterForm/RegisterForm.tsx

'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterFormValues } from '../../utils/auth.schemas';
import { useRegister } from '../../hooks';
import { FormField } from '@/components/FormField/FormField';
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
    // Strip confirmPassword before sending to API
    const { confirmPassword: _, ...payload } = values;
    register(payload);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
      <h1 className={styles.title}>Create account</h1>

      {error && (
        <div role="alert" className={styles.serverError}>
          {(error as any).message || 'Registration failed. Please try again.'}
        </div>
      )}

      <div className={styles.nameRow}>
        <FormField id="firstName" label="First name" error={errors.firstName?.message}>
          <input
            id="firstName"
            type="text"
            autoComplete="given-name"
            className={styles.input}
            aria-describedby={errors.firstName ? 'firstName-error' : undefined}
            {...formRegister('firstName')}
          />
        </FormField>

        <FormField id="lastName" label="Last name" error={errors.lastName?.message}>
          <input
            id="lastName"
            type="text"
            autoComplete="family-name"
            className={styles.input}
            aria-describedby={errors.lastName ? 'lastName-error' : undefined}
            {...formRegister('lastName')}
          />
        </FormField>
      </div>

      <FormField id="email" label="Email address" error={errors.email?.message}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className={styles.input}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...formRegister('email')}
        />
      </FormField>

      <FormField id="password" label="Password" error={errors.password?.message}>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          className={styles.input}
          aria-describedby={errors.password ? 'password-error' : undefined}
          {...formRegister('password')}
        />
      </FormField>

      <FormField id="confirmPassword" label="Confirm password" error={errors.confirmPassword?.message}>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          className={styles.input}
          aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
          {...formRegister('confirmPassword')}
        />
      </FormField>

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
