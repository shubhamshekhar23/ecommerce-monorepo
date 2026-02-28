// src/features/auth/hooks/useRegister.ts
// Register mutation hook

'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { registerApi } from '../api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import type { RegisterPayload } from '../interfaces';

export function useRegister() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: (payload: RegisterPayload) => registerApi(payload),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      router.push('/');
    },
  });
}
