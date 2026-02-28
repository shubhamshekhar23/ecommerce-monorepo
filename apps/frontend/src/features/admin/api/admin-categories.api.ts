// src/features/admin/api/admin-categories.api.ts

'use client';

import apiClient, { ApiRequestError } from '@/shared/apiClient';
import type { Category } from '@/features/products/interfaces';

export interface CreateCategoryDto {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  slug?: string;
  description?: string;
  image?: string;
  parentId?: string;
}

export async function createCategoryApi(dto: CreateCategoryDto): Promise<Category> {
  try {
    const response = await apiClient.post<Category>('/categories', dto);
    return response.data;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throw new ApiRequestError(500, 'Failed to create category');
  }
}

export async function getCategoryByIdApi(id: string): Promise<Category> {
  try {
    const response = await apiClient.get<Category>(`/categories/${id}`);
    return response.data;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throw new ApiRequestError(500, 'Failed to fetch category');
  }
}

export async function updateCategoryApi(id: string, dto: UpdateCategoryDto): Promise<Category> {
  try {
    const response = await apiClient.put<Category>(`/categories/${id}`, dto);
    return response.data;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throw new ApiRequestError(500, 'Failed to update category');
  }
}

export async function deleteCategoryApi(id: string): Promise<void> {
  try {
    await apiClient.delete(`/categories/${id}`);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throw new ApiRequestError(500, 'Failed to delete category');
  }
}
