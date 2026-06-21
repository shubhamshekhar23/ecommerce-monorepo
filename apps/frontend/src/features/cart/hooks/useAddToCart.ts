"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { eventBus } from "@/shared/eventBus";
import { trackAddToCart } from "@/shared/analytics/trackEvent";
import { handleMutationError } from "@/shared/mutationError";
import { addToCartApi } from "../api/cart.api";
import type { Cart, AddToCartPayload } from "../interfaces";
import {
  selectCartItemByProductId,
  recalcCartTotals,
} from "../utils/cart.normalize";

export function useAddToCart() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const status = useAuthStore((state) => state.status);

  const mutation = useMutation({
    mutationFn: (payload: AddToCartPayload) => addToCartApi(payload),
    onMutate: async (payload) => {
      if (status !== "authenticated") {
        router.push("/login");
        throw new Error("Not authenticated");
      }

      await queryClient.cancelQueries({ queryKey: ["cart"] });
      const previousCart = queryClient.getQueryData<Cart | null>(["cart"]);

      // Optimistic: if item is already in cart, increment quantity immediately.
      // For new items, we don't have product data in cache, so skip optimistic add —
      // onSuccess will populate from server response.
      queryClient.setQueryData<Cart | null>(["cart"], (old) => {
        if (!old) return old;
        const existing = selectCartItemByProductId(old, payload.productId);
        if (!existing) return old;

        const newQty = existing.quantity + payload.quantity;
        const updatedItems = old.items.map((item) =>
          item.id === existing.id
            ? {
                ...item,
                quantity: newQty,
                subtotal: item.product.price * newQty,
              }
            : item,
        );
        return {
          ...old,
          items: updatedItems,
          ...recalcCartTotals(updatedItems),
        };
      });

      return { previousCart };
    },
    onSuccess: (updatedCart, payload) => {
      // Server returns the full cart — use it directly for accuracy
      queryClient.setQueryData(["cart"], updatedCart);
      const addedItem = updatedCart.items.find(
        (item) => item.productId === payload.productId,
      );
      eventBus.emit("cart:item-added", {
        productName: addedItem?.product.name ?? "Item",
      });
      if (addedItem) {
        trackAddToCart({
          id: addedItem.productId,
          name: addedItem.product.name,
          price: Number(addedItem.product.price),
          quantity: payload.quantity ?? 1,
        });
      }
    },
    onError: (err, vars, context) => {
      if (context?.previousCart !== undefined) {
        queryClient.setQueryData(["cart"], context.previousCart);
      }
      handleMutationError(err, "Failed to add to cart", () =>
        mutation.mutate(vars),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
  return mutation;
}
