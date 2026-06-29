// Public API — import from here, not from internal paths
export { ProductCard } from "./components/ProductCard/ProductCard";
export { ProductGrid } from "./components/ProductGrid/ProductGrid";
export { ProductsView } from "./components/ProductsView/ProductsView";
export { ProductDetailView } from "./components/ProductDetailView/ProductDetailView";
export { CategorySidebar } from "./components/CategorySidebar/CategorySidebar";
export { ProductSkeleton } from "./components/ProductSkeleton/ProductSkeleton";

export { useProducts } from "./hooks/useProducts";
export { useProduct } from "./hooks/useProduct";
export { useProductsCursor } from "./hooks/useProductsCursor";
export { useProductSearch } from "./hooks/useProductSearch";
export { useCategories } from "./hooks/useCategories";

export { ProductDetailPage } from "./pages/ProductDetailPage";
export { fetchProductDetail } from "./api/fetchProductDetail";
export { getProductsCursorApi } from "./api/products.api";
export { getCategoriesApi } from "./api/categories.api";

export type {
  Product,
  Category,
  CategoryTree,
  ProductImage,
  ProductVariant,
  PaginatedProducts,
  PaginatedCategories,
  CursorPageProducts,
  CursorQueryParams,
  ProductsQueryParams,
} from "./interfaces";
