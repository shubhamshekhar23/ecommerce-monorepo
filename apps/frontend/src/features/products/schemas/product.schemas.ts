import { z } from "zod";

// Zod schemas mirror the TypeScript interfaces in ../interfaces/index.ts.
// Applied at the API boundary to catch backend shape drift at runtime.

export const ProductImageSchema = z.object({
  id: z.string(),
  url: z.string(),
  altText: z.string().optional(),
  isMain: z.boolean(),
  order: z.number(),
});

export const CategorySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough(); // allow optional fields (description, image, parentId) without enumerating

export const ProductVariantSchema = z
  .object({
    id: z.string(),
    productId: z.string(),
    sku: z.string(),
    price: z.number(),
    stock: z.number(),
    isActive: z.boolean(),
  })
  .passthrough();

export const ProductSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    price: z.number(),
    cost: z.number(),
    stock: z.number(),
    categoryId: z.string(),
    images: z.array(ProductImageSchema),
    variants: z.array(ProductVariantSchema),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough(); // allow optional/extra fields (description, categoryName, category)

export const PaginatedProductsSchema = z.object({
  data: z.array(ProductSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    pages: z.number(),
    hasMore: z.boolean(),
  }),
});

export const CursorPageProductsSchema = z.object({
  data: z.array(ProductSchema),
  meta: z.object({
    limit: z.number(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
