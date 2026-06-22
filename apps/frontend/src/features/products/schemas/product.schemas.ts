// Re-export from the shared package — single source of truth.
// Both frontend API-boundary checks and backend response shaping
// use the same Zod schemas from @ecommerce/shared-types.
export {
  ProductImageSchema,
  CategorySchema,
  ProductVariantSchema,
  ProductSchema,
  PaginatedProductsSchema,
  CursorPageProductsSchema,
} from "@ecommerce/shared-types";
