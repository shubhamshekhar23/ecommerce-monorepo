// src/features/products/hooks/useProducts.ts

"use client";

import { useQuery } from "@tanstack/react-query";
import { getProductsApi } from "../api/products.api";
import type { ProductsQueryParams } from "../interfaces";
import { normalizeProduct } from "../utils/product.normalize";

export function useProducts(params: ProductsQueryParams = {}) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => getProductsApi(params),
    select: (data) => ({ ...data, data: data.data.map(normalizeProduct) }),
  });
}
