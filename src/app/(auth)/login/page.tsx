// src/app/(auth)/login/page.tsx

import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/components/LoginForm/LoginForm';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your account',
};

export default function LoginPage() {
  return <LoginForm />;
}
