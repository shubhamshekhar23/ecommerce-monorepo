// src/features/orders/hooks/useOrder.ts

'use client';

import { useQuery } from '@tanstack/react-query';
import { getOrderApi } from '../api/orders.api';

export function useOrder(id?: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => getOrderApi(id!),
    enabled: Boolean(id),
  });
}
