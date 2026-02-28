// src/features/cart/hooks/useUpdateCartItem.ts

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateCartItemApi } from '../api/cart.api';
import type { Cart } from '../interfaces';

interface UpdateCartItemVariables {
  itemId: string;
  quantity: number;
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, quantity }: UpdateCartItemVariables) =>
      updateCartItemApi(itemId, quantity),
    onMutate: async ({ itemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });

      const previousCart = queryClient.getQueryData<Cart | null>(['cart']);

      queryClient.setQueryData<Cart | null>(['cart'], (old) => {
        if (!old) return old;

        const updatedItems = old.items
          .map((item) =>
            item.id === itemId
              ? { ...item, quantity, subtotal: item.product.price * quantity }
              : item,
          )
          .filter((item) => item.quantity > 0);

        const itemCount = updatedItems.length;
        const totalPrice = updatedItems.reduce((sum, item) => sum + item.subtotal, 0);

        return { ...old, items: updatedItems, itemCount, totalPrice };
      });

      return { previousCart };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCart !== undefined) {
        queryClient.setQueryData(['cart'], context.previousCart);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
