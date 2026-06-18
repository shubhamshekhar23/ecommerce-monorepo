"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cancelOrderApi } from "../api/orders.api";
import type { Order, PaginatedOrders } from "../interfaces";

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelOrderApi(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["orders"] });

      // Snapshot all order queries for rollback
      const previousData = queryClient.getQueriesData<Order | PaginatedOrders>({
        queryKey: ["orders"],
      });

      // Update single order detail cache (key: ['orders', id])
      queryClient.setQueryData<Order | undefined>(["orders", id], (old) =>
        old ? { ...old, status: "CANCELLED" } : old,
      );

      // Update paginated list caches (keys: ['orders', page, limit])
      queryClient.setQueriesData<PaginatedOrders>(
        { queryKey: ["orders"], exact: false },
        (old) => {
          if (!old || !Array.isArray(old.data)) return old;
          return {
            ...old,
            data: old.data.map((o) =>
              o.id === id ? { ...o, status: "CANCELLED" } : o,
            ),
          };
        },
      );

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      context?.previousData.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      toast.error("Failed to cancel order");
    },
    onSuccess: () => {
      toast.success("Order cancelled");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
