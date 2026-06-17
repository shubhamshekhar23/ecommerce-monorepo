// src/features/admin/api/admin-categories.api.ts

"use client";

import apiClient from "@/shared/apiClient";
import type { Category } from "@/features/products/interfaces";

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

export async function createCategoryApi(
  dto: CreateCategoryDto,
): Promise<Category> {
  const response = await apiClient.post<Category>("/categories", dto);
  return response.data;
}

export async function getCategoryByIdApi(id: string): Promise<Category> {
  const response = await apiClient.get<Category>(`/categories/${id}`);
  return response.data;
}

export async function updateCategoryApi(
  id: string,
  dto: UpdateCategoryDto,
): Promise<Category> {
  const response = await apiClient.put<Category>(`/categories/${id}`, dto);
  return response.data;
}

export async function deleteCategoryApi(id: string): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}
