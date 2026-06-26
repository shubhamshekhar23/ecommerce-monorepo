"use client";

import { useTransition, useDeferredValue, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  useProductsCursor,
  useProductSearch,
  useCategories,
} from "../../hooks";
import { useProductListCache } from "../../hooks/useProductListCache";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { CategorySidebar } from "../CategorySidebar/CategorySidebar";
import { ProductGrid } from "../ProductGrid/ProductGrid";
import type { Product, CursorQueryParams } from "../../interfaces";
import styles from "./ProductsView.module.scss";

const SORT_OPTIONS: { label: string; value: CursorQueryParams["sort"] }[] = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Oldest", value: "oldest" },
];

export function ProductsView() {
  useScrollRestoration("products-scroll");

  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Persist sort preference across sessions; URL param takes precedence
  const [savedSort, setSavedSort] = useLocalStorage<CursorQueryParams["sort"]>(
    "products-sort-order",
    undefined,
  );

  const search = searchParams.get("search") || undefined;
  const categorySlug = searchParams.get("category") || undefined;
  const urlSort =
    (searchParams.get("sort") as CursorQueryParams["sort"]) || undefined;
  const sort = urlSort ?? savedSort;
  const minPrice = searchParams.get("minPrice")
    ? Number(searchParams.get("minPrice"))
    : undefined;
  const maxPrice = searchParams.get("maxPrice")
    ? Number(searchParams.get("maxPrice"))
    : undefined;
  const isSearching = typeof search === "string" && search.trim().length > 0;
  const hasActiveFilters = Boolean(
    categorySlug || urlSort || minPrice !== undefined || maxPrice !== undefined,
  );

  // Resolve category slug → ID for the API (which takes categoryId, not slug)
  const { data: categoriesData } = useCategories();
  const matchedCategory = categoriesData?.data.find(
    (c) => c.slug === categorySlug,
  );
  const categoryId = matchedCategory?.id;

  // Memoize filters so useDeferredValue can detect reference equality
  const filters = useMemo(
    () => ({
      ...(categoryId ? { categoryId } : {}),
      ...(sort ? { sort } : {}),
      ...(minPrice !== undefined ? { minPrice } : {}),
      ...(maxPrice !== undefined ? { maxPrice } : {}),
    }),
    [categoryId, sort, minPrice, maxPrice],
  );

  // Defer the filter value that drives the expensive product grid re-render.
  // The grid shows stale results at reduced opacity while the transition is pending.
  const deferredFilters = useDeferredValue(filters);

  // FTS path
  const { data: searchData, isLoading: searchLoading } =
    useProductSearch(search);

  // Browse path: cursor infinite scroll with optional filters
  const {
    data: cursorData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: browseLoading,
  } = useProductsCursor(!isSearching, deferredFilters);

  const isLoading = isSearching ? searchLoading : browseLoading;

  const products: Product[] = isSearching
    ? (searchData?.data ?? [])
    : (cursorData?.pages.flatMap((p) => p.data) ?? []);

  // Persist product list to sessionStorage for instant back-navigation
  useProductListCache(products, isLoading, deferredFilters);

  const handleSortChange = (value: string) => {
    const sortValue = (value as CursorQueryParams["sort"]) || undefined;
    setSavedSort(sortValue ?? (null as unknown as CursorQueryParams["sort"]));
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("sort", value);
    } else {
      params.delete("sort");
    }
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleClearFilters = () => startTransition(() => router.push(pathname));

  let title = "All Products";
  if (isSearching) title = `Results for "${search}"`;
  else if (matchedCategory) title = matchedCategory.name;

  const subtitle = isSearching
    ? `${products.length} result${products.length !== 1 ? "s" : ""}`
    : products.length > 0
      ? `Showing ${products.length} curated item${products.length !== 1 ? "s" : ""}`
      : "";

  return (
    <div className={styles.container}>
      <CategorySidebar />

      <main className={styles.main}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/" className={styles.breadcrumbLink}>
            Home
          </Link>
          <span className={styles.breadcrumbSep}>/</span>
          <span>Products</span>
        </nav>

        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>{title}</h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>

          <div className={styles.controls}>
            {!isSearching && (
              <select
                className={styles.sortSelect}
                value={urlSort ?? savedSort ?? ""}
                onChange={(e) => handleSortChange(e.target.value)}
                aria-label="Sort products"
              >
                <option value="">Sort by</option>
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value ?? ""}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}

            {hasActiveFilters && (
              <button className={styles.clearBtn} onClick={handleClearFilters}>
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div
          style={{ opacity: isPending ? 0.6 : 1, transition: "opacity 200ms" }}
        >
          <ProductGrid
            products={products}
            isLoading={isLoading}
            error={null}
            searchQuery={isSearching ? search : undefined}
            emptyTitle={
              isSearching
                ? `No results for "${search}"`
                : categorySlug
                  ? "No products in this category"
                  : "No products found"
            }
            emptyDescription={
              isSearching
                ? "Try a different spelling or browse all products"
                : undefined
            }
            emptyAction={
              isSearching
                ? { label: "Browse all products", href: "/products" }
                : hasActiveFilters
                  ? { label: "Clear filters", onClick: handleClearFilters }
                  : undefined
            }
          />
        </div>

        {!isSearching && hasNextPage && (
          <div className={styles.loadMore}>
            <button
              className={styles.loadMoreBtn}
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Loading…" : "Load More"}
            </button>
          </div>
        )}

        {!isSearching && !hasNextPage && products.length > 0 && (
          <p className={styles.endOfList}>You&apos;ve seen all products</p>
        )}
      </main>
    </div>
  );
}
