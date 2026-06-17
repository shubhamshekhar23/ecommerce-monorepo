// src/features/products/api/categories.api.ts

import apiClient from "@/shared/apiClient";
import type { PaginatedCategories } from "../interfaces";

export async function getCategoriesApi(): Promise<PaginatedCategories> {
  const response = await apiClient.get<PaginatedCategories>("/categories", {
    params: { limit: 100 },
  });
  return response.data;
}
