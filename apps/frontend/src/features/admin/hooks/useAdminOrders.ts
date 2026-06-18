"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getAllOrdersApi } from "../api/admin-orders.api";

const LIMIT = 20;

export function useAdminOrders() {
  return useInfiniteQuery({
    queryKey: ["admin", "orders"],
    queryFn: ({ pageParam }) => getAllOrdersApi(pageParam, LIMIT),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasMore ? lastPage.meta.page + 1 : undefined,
  });
}
