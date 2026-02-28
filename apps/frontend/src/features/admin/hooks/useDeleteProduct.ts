// src/features/admin/hooks/useDeleteProduct.ts

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteProductApi } from '../api/admin-products.api';

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id: string) => deleteProductApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
