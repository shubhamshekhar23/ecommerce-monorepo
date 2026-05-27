// src/features/products/components/ProductsView/ProductsView.tsx

'use client';

import { useSearchParams } from 'next/navigation';
import { useProductsCursor, useProductSearch } from '../../hooks';
import { CategorySidebar } from '../CategorySidebar/CategorySidebar';
import { ProductGrid } from '../ProductGrid/ProductGrid';
import type { Product } from '../../interfaces';
import styles from './ProductsView.module.scss';

export function ProductsView() {
  const searchParams = useSearchParams();
  const search = searchParams.get('search') || undefined;
  const isSearching = typeof search === 'string' && search.trim().length > 0;

  // FTS path: ranked by relevance, no pagination needed for a search results page
  const { data: searchData, isLoading: searchLoading } = useProductSearch(search);

  // Browse path: cursor-based infinite scroll, disabled while searching
  const {
    data: cursorData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: browseLoading,
  } = useProductsCursor(!isSearching);

  const isLoading = isSearching ? searchLoading : browseLoading;

  const products: Product[] = isSearching
    ? (searchData?.data ?? [])
    : (cursorData?.pages.flatMap((p) => p.data) ?? []);

  return (
    <div className={styles.container}>
      <CategorySidebar />

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {isSearching ? `Results for "${search}"` : 'Products'}
          </h1>
          <p className={styles.count}>
            {isSearching
              ? `${products.length} result${products.length !== 1 ? 's' : ''}`
              : products.length > 0
                ? `${products.length} loaded`
                : ''}
          </p>
        </div>

        <ProductGrid products={products} isLoading={isLoading} error={null} />

        {/* Load More — only shown in browse mode, hidden during search */}
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
