// src/features/products/api/products.api.ts

import apiClient, { ApiRequestError } from '@/shared/apiClient';
import type { PaginatedProducts, Product, ProductsQueryParams } from '../interfaces';

export async function getProductsApi(params: ProductsQueryParams): Promise<PaginatedProducts> {
  try {
    const response = await apiClient.get<PaginatedProducts>('/products', { params });
    return response.data;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throw new ApiRequestError(500, 'Failed to fetch products');
  }
}

export async function getProductBySlugApi(slug: string): Promise<Product> {
  try {
    const response = await apiClient.get<Product>(`/products/slug/${slug}`);
    return response.data;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throw new ApiRequestError(500, 'Failed to fetch product');
  }
}
