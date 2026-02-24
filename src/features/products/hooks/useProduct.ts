// src/features/products/hooks/useProduct.ts

'use client';

import { useQuery } from '@tanstack/react-query';
import { getProductBySlugApi } from '../api/products.api';

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['products', 'slug', slug],
    queryFn: () => getProductBySlugApi(slug),
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
