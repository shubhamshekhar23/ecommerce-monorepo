"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
// eslint-disable-next-line no-restricted-imports -- admin is the management surface for the products domain; intentional cross-feature API coupling
import { getProductsApi } from "@/features/products/api/products.api";
// eslint-disable-next-line no-restricted-imports -- normalizer lives inside products domain; intentional
import { normalizeProduct } from "@/features/products/utils/product.normalize";

const LIMIT = 20;

export function useAdminProducts(search?: string) {
  return useInfiniteQuery({
    queryKey: ["admin", "products", search],
    queryFn: ({ pageParam }) =>
      getProductsApi({ page: pageParam, limit: LIMIT, text: search }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasMore ? lastPage.meta.page + 1 : undefined,
    select: (data) => ({
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        data: page.data.map(normalizeProduct),
      })),
    }),
  });
}
