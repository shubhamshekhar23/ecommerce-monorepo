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

export interface VariantType {
  id: string;
  name: string;
}

export interface VariantAttributeValue {
  variantId: string;
  optionId: string;
  option: {
    id: string;
    value: string;
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

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  cost: number;
  stock: number;
  categoryId: string;
  categoryName?: string | null;
  category?: Category;
  images: ProductImage[];
  variants: ProductVariant[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

import type { PaginationMeta } from './common.types';
export type { PaginationMeta };

export interface PaginatedProducts {
  data: Product[];
  meta: PaginationMeta;
}

export interface PaginatedCategories {
  data: Category[];
  meta: PaginationMeta;
}

export interface CursorMeta {
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface CursorPageProducts {
  data: Product[];
  meta: CursorMeta;
}

export interface ProductsQueryParams {
  page?: number;
  limit?: number;
  text?: string;
}

export interface CursorQueryParams {
  cursor?: string;
  limit?: number;
  categoryId?: string;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'oldest';
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}
