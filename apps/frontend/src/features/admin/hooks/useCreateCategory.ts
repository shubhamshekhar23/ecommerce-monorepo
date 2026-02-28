// src/features/admin/hooks/useCreateCategory.ts

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Category } from '@/features/products/interfaces';
import type { CreateCategoryDto } from '../api/admin-categories.api';
import { createCategoryApi } from '../api/admin-categories.api';

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation<Category, Error, CreateCategoryDto>({
    mutationFn: (payload) => createCategoryApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
