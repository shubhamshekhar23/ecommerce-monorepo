// src/features/admin/hooks/useAdminCategories.ts

'use client';

import { useQuery } from '@tanstack/react-query';
import { getCategoriesApi } from '@/features/products/api/categories.api';

export function useAdminCategories() {
  return useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: getCategoriesApi,
  });
}
