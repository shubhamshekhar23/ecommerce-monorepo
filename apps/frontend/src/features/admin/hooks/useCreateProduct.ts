// src/features/admin/hooks/useCreateProduct.ts

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Product } from '@/features/products/interfaces';
import type { CreateProductDto } from '../api/admin-products.api';
import { createProductApi } from '../api/admin-products.api';

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation<Product, Error, CreateProductDto>({
    mutationFn: (payload) => createProductApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
