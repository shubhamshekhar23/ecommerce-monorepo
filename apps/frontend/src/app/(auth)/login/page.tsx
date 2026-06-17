// src/app/(auth)/login/page.tsx

import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/components/LoginForm/LoginForm';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your account',
};

interface LoginPageProps {
  searchParams: Promise<{ session_expired?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  return <LoginForm sessionExpired={params.session_expired === '1'} />;
}
