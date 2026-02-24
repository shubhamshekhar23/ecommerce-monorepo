// src/features/admin/hooks/useDeleteProductImage.ts

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteProductImageApi } from '../api/admin-products.api';

export function useDeleteProductImage() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (imageId: string) => deleteProductImageApi(imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
