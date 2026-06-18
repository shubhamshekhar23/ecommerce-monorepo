// src/features/admin/hooks/useAdminCategories.ts

"use client";

import { useQuery } from "@tanstack/react-query";
// eslint-disable-next-line no-restricted-imports -- admin is the management surface for the products domain; intentional cross-feature API coupling
import { getCategoriesApi } from "@/features/products/api/categories.api";

export function useAdminCategories() {
  return useQuery({
    queryKey: ["admin", "categories"],
    queryFn: getCategoriesApi,
  });
}
