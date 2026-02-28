// src/app/(auth)/register/page.tsx

import type { Metadata } from 'next';
import { RegisterForm } from '@/features/auth/components/RegisterForm/RegisterForm';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create a new account',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
