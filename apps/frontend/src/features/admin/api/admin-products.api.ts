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

// ── Variants ──────────────────────────────────────────────────────────────────

export interface CreateVariantTypeDto {
  name: string;
}
export interface AddVariantOptionDto {
  value: string;
}

export async function createVariantTypeApi(
  productId: string,
  dto: CreateVariantTypeDto,
) {
  const res = await apiClient.post(`/products/${productId}/variant-types`, dto);
  return res.data;
}

export async function addVariantOptionApi(
  productId: string,
  typeId: string,
  dto: AddVariantOptionDto,
) {
  const res = await apiClient.post(
    `/products/${productId}/variant-types/${typeId}/options`,
    dto,
  );
  return res.data;
}

export async function deleteVariantApi(productId: string, variantId: string) {
  await apiClient.delete(`/products/${productId}/variants/${variantId}`);
}

export async function updateVariantStockApi(
  productId: string,
  variantId: string,
  stock: number,
) {
  const res = await apiClient.patch(
    `/products/${productId}/variants/${variantId}/stock`,
    { stock },
  );
  return res.data;
}

// ── Soft-delete lifecycle ──────────────────────────────────────────────────────

export async function getArchivedProductsApi(): Promise<Product[]> {
  const res = await apiClient.get<Product[]>("/products/archived");
  return res.data;
}

export async function restoreProductApi(id: string): Promise<Product> {
  const res = await apiClient.patch<Product>(`/products/${id}/restore`);
  return res.data;
}

export async function purgeProductApi(id: string): Promise<void> {
  await apiClient.delete(`/products/${id}/purge`);
}

// ── CSV import ─────────────────────────────────────────────────────────────────

export interface CsvImportResult {
  imported: number;
  failed: number;
  errors: string[];
}

export async function importProductsCsvApi(
  file: File,
): Promise<CsvImportResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiClient.post<CsvImportResult>(
    "/products/import/csv",
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return res.data;
}
