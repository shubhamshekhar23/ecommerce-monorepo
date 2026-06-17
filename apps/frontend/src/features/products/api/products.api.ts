// src/features/products/api/products.api.ts

import apiClient from "@/shared/apiClient";
import type {
  PaginatedProducts,
  Product,
  ProductsQueryParams,
  CursorPageProducts,
  CursorQueryParams,
} from "../interfaces";

export async function getProductsApi(
  params: ProductsQueryParams,
): Promise<PaginatedProducts> {
  const response = await apiClient.get<PaginatedProducts>("/products", {
    params,
  });
  return response.data;
}

export async function getProductBySlugApi(slug: string): Promise<Product> {
  const response = await apiClient.get<Product>(`/products/slug/${slug}`);
  return response.data;
}

// Cursor-based pagination — O(log n) regardless of page depth.
// Use this instead of getProductsApi for browse/listing pages.
export async function getProductsCursorApi(
  params: CursorQueryParams,
): Promise<CursorPageProducts> {
  const response = await apiClient.get<CursorPageProducts>("/products/cursor", {
    params,
  });
  return response.data;
}

// Full-text search using PostgreSQL tsvector + GIN index.
// Results are ranked by ts_rank (relevance), not just recency.
export async function searchProductsApi(
  q: string,
  params?: CursorQueryParams,
): Promise<CursorPageProducts> {
  const response = await apiClient.get<CursorPageProducts>("/products/search", {
    params: { q, ...params },
  });
  return response.data;
}
