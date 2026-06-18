// Core types come from the shared package — single source of truth with the backend
export type {
  Product,
  ProductImage,
  ProductVariant,
  VariantType,
  VariantAttributeValue,
  VariantImage,
  Category,
  CategoryTree,
  PaginationMeta,
  PaginatedProducts,
  PaginatedCategories,
  CursorMeta,
  CursorPageProducts,
  ProductsQueryParams,
  CursorQueryParams,
} from "@ecommerce/shared-types";

// Frontend-only derived type: computed from variants for UI display, not part of the API response
export interface DerivedVariantType {
  name: string;
  options: string[];
}
