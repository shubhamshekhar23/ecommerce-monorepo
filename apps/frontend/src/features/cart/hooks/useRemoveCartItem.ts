"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { removeCartItemApi } from "../api/cart.api";
import type { Cart } from "../interfaces";
import { recalcCartTotals } from "../utils/cart.normalize";

export function useRemoveCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => removeCartItemApi(itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: ["cart"] });
      const previousCart = queryClient.getQueryData<Cart | null>(["cart"]);

      queryClient.setQueryData<Cart | null>(["cart"], (old) => {
        if (!old) return old;
        const items = old.items.filter((item) => item.id !== itemId);
        return { ...old, items, ...recalcCartTotals(items) };
      });

      return { previousCart };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCart !== undefined) {
        queryClient.setQueryData(["cart"], context.previousCart);
      }
      toast.error("Failed to remove item");
    },
    onSuccess: () => {
      toast.success("Item removed");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}
