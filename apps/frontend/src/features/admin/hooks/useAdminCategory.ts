// src/features/admin/hooks/useAdminCategory.ts

'use client';

import { useQuery } from '@tanstack/react-query';
import { getCategoryByIdApi } from '../api/admin-categories.api';

export function useAdminCategory(id: string) {
  return useQuery({
    queryKey: ['admin', 'category', id],
    queryFn: () => getCategoryByIdApi(id),
  });
}
