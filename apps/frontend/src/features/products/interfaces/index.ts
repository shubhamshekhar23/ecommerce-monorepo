// src/features/products/interfaces/index.ts

export interface ProductImage {
  id: string;
  productId?: string;
  url: string;
  altText?: string;
  isMain: boolean;
  order: number;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  parentId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTree extends Category {
  children: CategoryTree[];
}

// ── Variant types (Phase 1) ───────────────────────────────────────────────────

export interface VariantType {
  id: string;
  name: string; // "Size", "Color"
}

export interface VariantAttributeValue {
  variantId: string;
  optionId: string;
  option: {
    id: string;
    value: string; // "S", "M", "Red"
    variantTypeId: string;
    variantType: VariantType;
  };
}

export interface VariantImage {
  id: string;
  url: string;
  altText?: string;
  isMain: boolean;
  order: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  isActive: boolean;
  images: VariantImage[];
  attributeValues: VariantAttributeValue[];
  createdAt: string;
  updatedAt: string;
}

// Derived on the client from variants — avoids a separate variantTypes API call.
export interface DerivedVariantType {
  name: string;
  options: string[];
}

// ── Product ───────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  // Base/legacy price and stock. When variants exist, use the selected variant's values.
  price: number;
  cost: number;
  stock: number;
  categoryId: string;
  categoryName?: string | null;
  category?: Category;
  images: ProductImage[];
  // Empty on list endpoints; populated on GET /products/:id and GET /products/slug/:slug
  variants: ProductVariant[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasMore: boolean;
}

export interface PaginatedProducts {
  data: Product[];
  meta: PaginationMeta;
}

export interface PaginatedCategories {
  data: Category[];
  meta: PaginationMeta;
}

// Cursor pagination — returned by GET /products/cursor and GET /products/search
export interface CursorMeta {
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface CursorPageProducts {
  data: Product[];
  meta: CursorMeta;
}

// ── Query params ──────────────────────────────────────────────────────────────

export interface ProductsQueryParams {
  page?: number;
  limit?: number;
  text?: string;
}

export interface CursorQueryParams {
  cursor?: string;
  limit?: number;
}
