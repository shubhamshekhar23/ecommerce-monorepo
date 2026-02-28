// src/features/admin/hooks/useAdminOrders.ts

'use client';

import { useQuery } from '@tanstack/react-query';
import { getAllOrdersApi } from '../api/admin-orders.api';

export function useAdminOrders(page = 1) {
  return useQuery({
    queryKey: ['admin', 'orders', page],
    queryFn: () => getAllOrdersApi(page, 20),
  });
}
