// src/features/admin/hooks/useAdminProducts.ts

'use client';

import { useQuery } from '@tanstack/react-query';
import { getProductsApi } from '@/features/products/api/products.api';

export function useAdminProducts(page = 1) {
  return useQuery({
    queryKey: ['admin', 'products', page],
    queryFn: () => getProductsApi({ page, limit: 20 }),
  });
}
