// src/features/auth/hooks/useAuthHydration.ts
// Hydrate auth state from stored tokens on app load

'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMeApi } from '../api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { tokenStorage } from '@/shared/apiClient';

export function useAuthHydration(): void {
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setStatus = useAuthStore((state) => state.setStatus);

  // Check if we have stored tokens
  const hasToken = typeof window !== 'undefined' && tokenStorage.getAccess() !== null;

  const { data, isError, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getMeApi,
    enabled: hasToken,
    staleTime: Infinity,
    retry: false,
  });

  // Update status based on loading state
  useEffect(() => {
    if (isLoading) {
      setStatus('loading');
    }
  }, [isLoading, setStatus]);

  // Update store when data loads
  useEffect(() => {
    if (data) {
      const access = tokenStorage.getAccess();
      const refresh = tokenStorage.getRefresh();
      if (access && refresh) {
        setAuth(data, access, refresh);
      }
    }
  }, [data, setAuth]);

  // Clear auth if query fails (e.g., token expired)
  useEffect(() => {
    if (isError && hasToken) {
      clearAuth();
    }
  }, [isError, hasToken, clearAuth]);

  // Mark as unauthenticated if no tokens
  useEffect(() => {
    if (!hasToken && !isLoading) {
      setStatus('unauthenticated');
    }
  }, [hasToken, isLoading, setStatus]);
}
