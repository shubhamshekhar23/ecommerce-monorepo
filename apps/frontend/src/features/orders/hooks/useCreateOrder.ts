"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createOrderApi } from "../api/orders.api";
import { handleMutationError } from "@/shared/mutationError";
import { eventBus } from "@/shared/eventBus";
import { trackPurchase } from "@/shared/analytics/trackEvent";

const IDEMPOTENCY_KEY_STORAGE = "checkout-idempotency-key";

// Read from sessionStorage so the same key is reused if the page is refreshed
// mid-checkout. The backend deduplicates on this key and returns the cached order.
// Key is intentionally NOT cleared on order creation — only cleared after confirmed
// payment so that retries after a declined card reuse the same order rather than
// creating a duplicate.
function getOrCreateIdempotencyKey(): string {
  try {
    const existing = sessionStorage.getItem(IDEMPOTENCY_KEY_STORAGE);
    if (existing) return existing;
    const key = crypto.randomUUID();
    sessionStorage.setItem(IDEMPOTENCY_KEY_STORAGE, key);
    return key;
  } catch {
    // sessionStorage blocked (rare — private mode with strict settings)
    return crypto.randomUUID();
  }
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => createOrderApi(getOrCreateIdempotencyKey()),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      eventBus.emit("order:placed", {
        orderId: order.id,
        orderNumber: order.orderNumber,
      });
      trackPurchase({
        id: order.id,
        orderNumber: order.orderNumber,
        total: Number(order.totalPrice),
        itemCount: order.items.length,
      });
    },
    onError: (err) => {
      // Idempotency key ensures retrying place-order on network failure
      // creates the same order rather than a duplicate.
      handleMutationError(err, "Failed to place order", () =>
        mutation.mutate(),
      );
    },
  });
  return mutation;
}
