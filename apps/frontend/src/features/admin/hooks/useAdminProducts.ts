"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getProductsApi } from "@/features/products/api/products.api";

const LIMIT = 20;

export function useAdminProducts(search?: string) {
  return useInfiniteQuery({
    queryKey: ["admin", "products", search],
    queryFn: ({ pageParam }) =>
      getProductsApi({ page: pageParam, limit: LIMIT, text: search }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasMore ? lastPage.meta.page + 1 : undefined,
  });
}
