"use client";

import { useCallback } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { enqueueCartMutation } from "../utils/cartQueue";
import { useAddToCart } from "./useAddToCart";
import type { UseMutationResult } from "@tanstack/react-query";
import type { Cart, AddToCartPayload } from "../interfaces";

interface UseAddToCartOfflineReturn extends Omit<
  UseMutationResult<Cart, Error, AddToCartPayload>,
  "mutate"
> {
  addToCart: (payload: AddToCartPayload) => Promise<void>;
  isOfflineQueued: boolean;
}

/**
 * Drop-in replacement for useAddToCart that falls back to an IndexedDB queue
 * when the browser is offline. The queue is drained by useDrainCartQueue
 * (mounted once in Providers) when connectivity is restored.
 */
export function useAddToCartOffline(): UseAddToCartOfflineReturn {
  const isOnline = useOnlineStatus();
  const { mutate, ...rest } = useAddToCart();

  const addToCart = useCallback(
    async (payload: AddToCartPayload) => {
      if (!isOnline) {
        await enqueueCartMutation({ action: "ADD", payload });
        return;
      }
      mutate(payload);
    },
    [isOnline, mutate],
  );

  return { addToCart, isOfflineQueued: !isOnline, ...rest };
}
