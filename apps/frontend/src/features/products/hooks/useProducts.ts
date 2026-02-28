// src/features/products/hooks/useProducts.ts

'use client';

import { useQuery } from '@tanstack/react-query';
import { getProductsApi } from '../api/products.api';
import type { ProductsQueryParams } from '../interfaces';

export function useProducts(params: ProductsQueryParams = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => getProductsApi(params),
  });
}
