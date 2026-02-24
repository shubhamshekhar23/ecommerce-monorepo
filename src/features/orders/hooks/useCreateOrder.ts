// src/features/orders/hooks/useCreateOrder.ts

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createOrderApi } from '../api/orders.api';

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrderApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
