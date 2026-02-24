// src/features/cart/hooks/useCart.ts

'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { getCartApi } from '../api/cart.api';

export function useCart() {
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'authenticated';

  return useQuery({
    queryKey: ['cart'],
    queryFn: getCartApi,
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}
