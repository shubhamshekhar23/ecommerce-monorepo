// src/features/admin/hooks/useUpdateOrderStatus.ts

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateOrderStatusApi } from '../api/admin-orders.api';
import type { Order, OrderStatus } from '@/features/orders/interfaces';

interface UpdateOrderStatusPayload {
  id: string;
  status: OrderStatus;
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation<Order, Error, UpdateOrderStatusPayload>({
    mutationFn: (payload) =>
      updateOrderStatusApi(payload.id, payload.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
  });
}
