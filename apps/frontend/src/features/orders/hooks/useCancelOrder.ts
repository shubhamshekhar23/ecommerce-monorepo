// src/features/orders/hooks/useCancelOrder.ts

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelOrderApi } from '../api/orders.api';

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelOrderApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
