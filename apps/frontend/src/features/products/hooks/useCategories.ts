// src/features/products/hooks/useCategories.ts

'use client';

import { useQuery } from '@tanstack/react-query';
import { getCategoriesApi } from '../api/categories.api';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategoriesApi(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
