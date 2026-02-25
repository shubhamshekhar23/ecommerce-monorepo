// src/features/admin/hooks/useUpdateProduct.ts

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Product } from '@/features/products/interfaces';
import type { UpdateProductDto } from '../api/admin-products.api';
import { updateProductApi } from '../api/admin-products.api';

interface UpdateProductPayload {
  id: string;
  dto: UpdateProductDto;
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation<Product, Error, UpdateProductPayload>({
    mutationFn: (payload) => updateProductApi(payload.id, payload.dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
