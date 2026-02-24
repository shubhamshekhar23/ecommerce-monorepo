// src/features/cart/hooks/useAddToCart.ts

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { addToCartApi } from '../api/cart.api';
import type { AddToCartPayload } from '../interfaces';

export function useAddToCart() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const status = useAuthStore((state) => state.status);

  return useMutation({
    mutationFn: (payload: AddToCartPayload) => addToCartApi(payload),
    onMutate: () => {
      if (status !== 'authenticated') {
        router.push('/login');
        throw new Error('Not authenticated');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
