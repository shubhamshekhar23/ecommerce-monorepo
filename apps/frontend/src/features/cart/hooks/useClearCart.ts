// src/features/cart/hooks/useClearCart.ts

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clearCartApi } from '../api/cart.api';

export function useClearCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearCartApi,
    onSuccess: () => {
      queryClient.setQueryData(['cart'], null);
    },
  });
}
