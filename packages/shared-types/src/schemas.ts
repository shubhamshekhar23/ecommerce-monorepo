/**
 * Shared Zod schemas — single source of truth for runtime validation.
 * Import from @ecommerce/shared-types to avoid duplicating schemas in
 * both the frontend (API boundary checks) and backend (response shaping).
 *
 * Zod is a peer dependency: the consumer provides their own zod install.
 */

import { z } from "zod";

// ─── Common ────────────────────────────────────────────────────────────────

export const PaginationMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  pages: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

export const CursorMetaSchema = z.object({
  limit: z.number().int().positive(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

// ─── Product ───────────────────────────────────────────────────────────────

export const ProductImageSchema = z.object({
  id: z.string(),
  url: z.string(),
  altText: z.string().optional(),
  isMain: z.boolean(),
  order: z.number(),
  createdAt: z.string().optional(),
});

export const CategorySchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const VariantAttributeValueSchema = z.looseObject({
  variantId: z.string().optional(),
  optionId: z.string().optional(),
  option: z.looseObject({
    id: z.string(),
    value: z.string(),
    variantType: z.looseObject({ name: z.string() }),
  }),
});

export const ProductVariantSchema = z.looseObject({
  id: z.string().optional(),
  productId: z.string().optional(),
  sku: z.string().optional(),
  // price comes as string from cursor endpoint, number from paginated endpoint
  price: z.union([z.number(), z.string()]).optional(),
  stock: z.number().optional(),
  isActive: z.boolean().optional(),
  // default to [] so variants without attributeValues don't crash iteration
  attributeValues: z.array(VariantAttributeValueSchema).default([]),
});

export const ProductSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  // price/cost/stock moved to ProductVariant — optional here for cursor responses
  // which return priceRange: { min, max } instead of flat price/cost/stock
  price: z.number().optional(),
  cost: z.number().optional(),
  stock: z.number().optional(),
  priceRange: z.object({ min: z.number(), max: z.number() }).optional(),
  categoryId: z.string(),
  images: z.array(ProductImageSchema),
  variants: z.array(ProductVariantSchema),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PaginatedProductsSchema = z.object({
  data: z.array(ProductSchema),
  meta: PaginationMetaSchema,
});

export const CursorPageProductsSchema = z.object({
  data: z.array(ProductSchema),
  meta: CursorMetaSchema,
});

// ─── Cart ──────────────────────────────────────────────────────────────────

export const CartItemSchema = z.looseObject({
  id: z.string(),
  productId: z.string(),
  quantity: z.number().int().positive(),
  subtotal: z.number(),
});

export const CartSchema = z.looseObject({
  id: z.string(),
  userId: z.string(),
  items: z.array(CartItemSchema),
  itemCount: z.number().int().nonnegative(),
  totalPrice: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ─── User ──────────────────────────────────────────────────────────────────

export const UserSchema = z.object({
  id: z.string(),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum(["USER", "ADMIN"]),
  isActive: z.boolean(),
  emailVerified: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ─── Auth ──────────────────────────────────────────────────────────────────

export const TokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const LoginResponseSchema = TokenPairSchema.extend({
  user: UserSchema,
});

// ─── Order ─────────────────────────────────────────────────────────────────

export const OrderItemSchema = z.looseObject({
  id: z.string(),
  productId: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number(),
  subtotal: z.number(),
});

export const OrderSchema = z.looseObject({
  id: z.string(),
  userId: z.string(),
  status: z.string(),
  totalAmount: z.number(),
  items: z.array(OrderItemSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PaginatedOrdersSchema = z.object({
  data: z.array(OrderSchema),
  meta: PaginationMetaSchema,
});

// ─── Categories ────────────────────────────────────────────────────────────

export const PaginatedCategoriesSchema = z.object({
  data: z.array(CategorySchema),
  meta: z.looseObject({ total: z.number() }),
});
