"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getCartQueue, removeCartQueueItem } from "../utils/cartQueue";
import { addToCartApi } from "../api/cart.api";

/**
 * Drains the IndexedDB cart queue when connectivity is restored.
 * Mount this once near the top of the component tree (e.g., Providers).
 * Each pending ADD mutation is replayed in timestamp order; on success the
 * item is removed from the queue so it is never sent twice.
 */
export function useDrainCartQueue(): void {
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOnline) return;

    let cancelled = false;

    getCartQueue().then(async (items) => {
      const sorted = [...items].sort((a, b) => a.timestamp - b.timestamp);
      for (const item of sorted) {
        if (cancelled) break;
        try {
          if (item.action === "ADD") {
            const updatedCart = await addToCartApi(item.payload);
            queryClient.setQueryData(["cart"], updatedCart);
          }
          await removeCartQueueItem(item.id);
        } catch {
          // leave in queue — retry on next reconnect
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isOnline, queryClient]);
}
