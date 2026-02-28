// src/features/cart/hooks/useRemoveCartItem.ts

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { removeCartItemApi } from '../api/cart.api';

export function useRemoveCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => removeCartItemApi(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
