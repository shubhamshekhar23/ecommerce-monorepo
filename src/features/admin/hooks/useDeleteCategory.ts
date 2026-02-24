// src/features/admin/hooks/useDeleteCategory.ts

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteCategoryApi } from '../api/admin-categories.api';

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id: string) => deleteCategoryApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
