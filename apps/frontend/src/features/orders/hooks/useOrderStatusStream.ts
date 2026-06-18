"use client";

import { useEffect } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { API_URL } from "@/shared/config";
import type { Order, OrderStatus } from "../interfaces";

// Terminal statuses — once reached, the stream closes itself on the server side.
const TERMINAL_STATUSES = new Set<OrderStatus>([
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
]);

interface StatusChangedPayload {
  orderId: string;
  status: OrderStatus;
  updatedAt: string;
}

// Subscribes to the backend SSE stream for a single order's status changes.
// Patches the TanStack Query cache directly so the UI reflects updates without
// a full refetch. Returns nothing — callers react via the existing useOrder query.
export function useOrderStatusStream(orderId: string | undefined) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!orderId || !accessToken) return;

    const abortController = new AbortController();

    fetchEventSource(`${API_URL}/orders/${orderId}/status-stream`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "text/event-stream",
      },
      signal: abortController.signal,
      // Do not retry on auth errors — abort instead of looping on 401.
      async onopen(response) {
        if (!response.ok && response.status === 401) {
          abortController.abort();
        }
      },
      onmessage(event) {
        if (event.event !== "order.status_changed") return;
        try {
          const payload = JSON.parse(event.data) as StatusChangedPayload;
          queryClient.setQueryData<Order>(["orders", orderId], (prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: payload.status,
              updatedAt: payload.updatedAt,
            };
          });
          if (TERMINAL_STATUSES.has(payload.status)) {
            abortController.abort();
          }
        } catch {
          // Malformed JSON from server — skip the event.
        }
      },
      onerror() {
        // fetchEventSource retries by default; returning without throwing keeps
        // retries going. Throwing would stop the loop permanently.
      },
    });

    return () => {
      abortController.abort();
    };
  }, [orderId, accessToken, queryClient]);
}
