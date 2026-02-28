// src/features/auth/components/AuthProvider/AuthProvider.tsx

'use client';

import { useAuthHydration } from '../../hooks';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  useAuthHydration();
  return <>{children}</>;
}
