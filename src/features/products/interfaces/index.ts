// src/features/products/interfaces/index.ts
// Products feature type definitions

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

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  cost: number;
  stock: number;
  categoryId: string;
  category?: Category;
  images: ProductImage[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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

export interface ProductsQueryParams {
  page?: number;
  limit?: number;
  text?: string;
}
