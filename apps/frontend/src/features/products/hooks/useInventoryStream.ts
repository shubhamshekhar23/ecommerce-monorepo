"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { config } from "@/shared/config/config";
import type { Product } from "@ecommerce/shared-types";

interface StockUpdatePayload {
  productId: string;
  variantId: string;
  stock: number;
}

/**
 * Subscribes to real-time stock updates for a single product via WebSocket.
 * Patches the TanStack Query cache in place so every component reading
 * ["products", "slug", slug] automatically re-renders with the new stock.
 */
export function useInventoryStream(productId: string | undefined): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!productId) return;

    const socket = io(`${config.apiUrl}/inventory`, {
      transports: ["websocket"],
      reconnectionAttempts: 3,
    });

    socket.on("connect", () => {
      socket.emit("subscribeProduct", productId);
    });

    socket.on("inventory:stockUpdate", (payload: StockUpdatePayload) => {
      if (payload.productId !== productId) return;

      queryClient.setQueriesData<Product>(
        { queryKey: ["products", "slug"] },
        (cached) => {
          if (!cached || cached.id !== payload.productId) return cached;
          return {
            ...cached,
            variants: cached.variants.map((v) =>
              v.id === payload.variantId ? { ...v, stock: payload.stock } : v,
            ),
          };
        },
      );
    });

    return () => {
      socket.emit("unsubscribeProduct", productId);
      socket.disconnect();
    };
  }, [productId, queryClient]);
}
