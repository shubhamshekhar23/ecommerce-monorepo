// src/features/admin/hooks/useAdminProduct.ts

'use client';

import { useQuery } from '@tanstack/react-query';
import { getProductByIdApi } from '../api/admin-products.api';

export function useAdminProduct(id: string) {
  return useQuery({
    queryKey: ['admin', 'product', id],
    queryFn: () => getProductByIdApi(id),
  });
}
