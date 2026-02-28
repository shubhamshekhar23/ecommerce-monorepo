// src/features/admin/hooks/useAdminProducts.ts

'use client';

import { useQuery } from '@tanstack/react-query';
import { getProductsApi } from '@/features/products/api/products.api';

export function useAdminProducts(page = 1, search?: string) {
  return useQuery({
    queryKey: ['admin', 'products', page, search],
    queryFn: () => getProductsApi({ page, limit: 20, text: search }),
  });
}
