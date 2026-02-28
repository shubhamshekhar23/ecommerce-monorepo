// src/features/admin/hooks/useUpdateCategory.ts

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Category } from '@/features/products/interfaces';
import type { UpdateCategoryDto } from '../api/admin-categories.api';
import { updateCategoryApi } from '../api/admin-categories.api';

interface UpdateCategoryPayload {
  id: string;
  data: UpdateCategoryDto;
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation<Category, Error, UpdateCategoryPayload>({
    mutationFn: (payload) =>
      updateCategoryApi(payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
