'use client';

import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createOrderApi } from '../api/orders.api';

export function useCreateOrder() {
  const queryClient = useQueryClient();

  // One UUID per checkout intent — stable across retries so the backend returns
  // the cached response rather than creating a duplicate order.
  // Rotated after a successful order so the next checkout gets a fresh key.
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  return useMutation({
    mutationFn: () => createOrderApi(idempotencyKeyRef.current),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      idempotencyKeyRef.current = crypto.randomUUID();
    },
  });
}
