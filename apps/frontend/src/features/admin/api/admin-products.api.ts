// src/features/admin/api/admin-products.api.ts

"use client";

import apiClient from "@/shared/apiClient";
import type { Product } from "@/features/products/interfaces";

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

export interface UpdateProductDto {
  name?: string;
  slug?: string;
  description?: string;
  price?: number;
  cost?: number;
  stock?: number;
  categoryId?: string;
  images?: ProductImageDto[];
}

export async function createProductApi(
  dto: CreateProductDto,
): Promise<Product> {
  const response = await apiClient.post<Product>("/products", dto);
  return response.data;
}

export async function addProductImagesApi(
  id: string,
  images: ProductImageDto[],
): Promise<void> {
  await apiClient.post(`/products/${id}/images`, images);
}

export async function deleteProductImageApi(imageId: string): Promise<void> {
  await apiClient.delete(`/products/images/${imageId}`);
}

export async function deleteProductApi(id: string): Promise<void> {
  await apiClient.delete(`/products/${id}`);
}

export async function getProductByIdApi(id: string): Promise<Product> {
  const response = await apiClient.get<Product>(`/products/${id}`);
  return response.data;
}

export async function updateProductApi(
  id: string,
  dto: UpdateProductDto,
): Promise<Product> {
  const response = await apiClient.put<Product>(`/products/${id}`, dto);
  return response.data;
}
