// src/features/admin/api/admin-products.api.ts

'use client';

import apiClient, { ApiRequestError } from '@/shared/apiClient';
import type { Product } from '@/features/products/interfaces';

export interface CreateProductDto {
  name: string;
  slug: string;
  description?: string;
  price: number;
  cost: number;
  stock?: number;
  categoryId: string;
  images?: ProductImageDto[];
}

export interface ProductImageDto {
  url: string;
  altText?: string;
  isMain?: boolean;
  order?: number;
}

export async function createProductApi(dto: CreateProductDto): Promise<Product> {
  try {
    const response = await apiClient.post<Product>('/products', dto);
    return response.data;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throw new ApiRequestError(500, 'Failed to create product');
  }
}

export async function addProductImagesApi(
  id: string,
  images: ProductImageDto[],
): Promise<void> {
  try {
    await apiClient.post(`/products/${id}/images`, images);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throw new ApiRequestError(500, 'Failed to add product images');
  }
}

export async function deleteProductImageApi(imageId: string): Promise<void> {
  try {
    await apiClient.delete(`/products/images/${imageId}`);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throw new ApiRequestError(500, 'Failed to delete product image');
  }
}

export async function deleteProductApi(id: string): Promise<void> {
  try {
    await apiClient.delete(`/products/${id}`);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throw new ApiRequestError(500, 'Failed to delete product');
  }
}
