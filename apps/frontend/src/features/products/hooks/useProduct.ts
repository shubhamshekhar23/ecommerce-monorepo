// src/features/products/hooks/useProduct.ts

"use client";

import { useQuery } from "@tanstack/react-query";
import { getProductBySlugApi } from "../api/products.api";
import { normalizeProduct } from "../utils/product.normalize";

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ["products", "slug", slug],
    queryFn: () => getProductBySlugApi(slug),
    select: normalizeProduct,
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  });
}
