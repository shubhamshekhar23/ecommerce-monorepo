// src/features/orders/hooks/useUserOrders.ts

'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { getUserOrdersApi } from '../api/orders.api';

export function useUserOrders(page = 1, limit = 20) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: ['orders', page, limit],
    queryFn: () => getUserOrdersApi(page, limit),
    enabled: status === 'authenticated',
    staleTime: 30 * 1000,
  });
}
