'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useProductsCursor, useProductSearch, useCategories } from '../../hooks';
import { useProductListCache } from '../../hooks/useProductListCache';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { CategorySidebar } from '../CategorySidebar/CategorySidebar';
import { ProductGrid } from '../ProductGrid/ProductGrid';
import type { Product, CursorQueryParams } from '../../interfaces';
import styles from './ProductsView.module.scss';

const SORT_OPTIONS: { label: string; value: CursorQueryParams['sort'] }[] = [
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Oldest', value: 'oldest' },
];

export function ProductsView() {
  useScrollRestoration('products-scroll');

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Persist sort preference across sessions; URL param takes precedence
  const [savedSort, setSavedSort] = useLocalStorage<CursorQueryParams['sort']>('products-sort-order', undefined);

  const search = searchParams.get('search') || undefined;
  const categorySlug = searchParams.get('category') || undefined;
  const urlSort = (searchParams.get('sort') as CursorQueryParams['sort']) || undefined;
  const sort = urlSort ?? savedSort;
  const isSearching = typeof search === 'string' && search.trim().length > 0;
  const hasActiveFilters = Boolean(categorySlug || urlSort);

  // Resolve category slug → ID for the API (which takes categoryId, not slug)
  const { data: categoriesData } = useCategories();
  const matchedCategory = categoriesData?.data.find((c) => c.slug === categorySlug);
  const categoryId = matchedCategory?.id;

  const filters = {
    ...(categoryId ? { categoryId } : {}),
    ...(sort ? { sort } : {}),
  };

  // FTS path
  const { data: searchData, isLoading: searchLoading } = useProductSearch(search);

  // Browse path: cursor infinite scroll with optional filters
  const {
    data: cursorData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: browseLoading,
  } = useProductsCursor(!isSearching, filters);

  const isLoading = isSearching ? searchLoading : browseLoading;

  const products: Product[] = isSearching
    ? (searchData?.data ?? [])
    : (cursorData?.pages.flatMap((p) => p.data) ?? []);

  // Persist product list to sessionStorage for instant back-navigation
  useProductListCache(products, isLoading, filters);

  const handleSortChange = (value: string) => {
    const sortValue = (value as CursorQueryParams['sort']) || undefined;
    setSavedSort(sortValue ?? null as unknown as CursorQueryParams['sort']);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('sort', value);
    } else {
      params.delete('sort');
    }
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClearFilters = () => router.push(pathname);

  let title = 'Products';
  if (isSearching) title = `Results for "${search}"`;
  else if (matchedCategory) title = matchedCategory.name;

  return (
    <div className={styles.container}>
      <CategorySidebar />

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>{title}</h1>

          <div className={styles.controls}>
            {!isSearching && (
              <select
                className={styles.sortSelect}
                value={urlSort ?? savedSort ?? ''}
                onChange={(e) => handleSortChange(e.target.value)}
                aria-label="Sort products"
              >
                <option value="">Sort by</option>
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value ?? ''}>
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

        <p className={styles.count}>
          {isSearching
            ? `${products.length} result${products.length !== 1 ? 's' : ''}`
            : products.length > 0
              ? `${products.length} loaded`
              : ''}
        </p>

        <ProductGrid
          products={products}
          isLoading={isLoading}
          error={null}
          emptyTitle={categorySlug ? `No products in this category` : 'No products found'}
          emptyAction={hasActiveFilters ? { label: 'Clear filters', onClick: handleClearFilters } : undefined}
        />

        {!isSearching && hasNextPage && (
          <div className={styles.loadMore}>
            <button
              className={styles.loadMoreBtn}
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? 'Loading…' : 'Load More'}
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
