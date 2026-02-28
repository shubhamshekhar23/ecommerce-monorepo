// src/features/products/api/categories.api.ts

import apiClient, { ApiRequestError } from '@/shared/apiClient';
import type { PaginatedCategories } from '../interfaces';

export async function getCategoriesApi(): Promise<PaginatedCategories> {
  try {
    const response = await apiClient.get<PaginatedCategories>('/categories', {
      params: { limit: 100 },
    });
    return response.data;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throw new ApiRequestError(500, 'Failed to fetch categories');
  }
}
