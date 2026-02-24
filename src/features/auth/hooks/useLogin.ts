// src/features/auth/hooks/useLogin.ts
// Login mutation hook

'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { loginApi } from '../api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import type { LoginPayload } from '../interfaces';

export function useLogin() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: (payload: LoginPayload) => loginApi(payload),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      router.push('/');
    },
  });
}
