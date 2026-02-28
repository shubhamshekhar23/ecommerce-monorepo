// src/features/admin/hooks/useAddProductImages.ts

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ProductImageDto } from '../api/admin-products.api';
import { addProductImagesApi } from '../api/admin-products.api';

interface AddProductImagesPayload {
  id: string;
  images: ProductImageDto[];
}

export function useAddProductImages() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, AddProductImagesPayload>({
    mutationFn: (payload) =>
      addProductImagesApi(payload.id, payload.images),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
