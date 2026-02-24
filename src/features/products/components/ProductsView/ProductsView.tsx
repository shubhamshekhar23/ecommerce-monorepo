// src/features/products/components/ProductsView/ProductsView.tsx

'use client';

import { useSearchParams } from 'next/navigation';
import { useProducts } from '../../hooks';
import { CategorySidebar } from '../CategorySidebar/CategorySidebar';
import { ProductGrid } from '../ProductGrid/ProductGrid';
import { Pagination } from '../Pagination/Pagination';
import styles from './ProductsView.module.scss';

export function ProductsView() {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get('page')) || 1;
  const limit = 20;

  const { data, isLoading, error } = useProducts({
    page,
    limit,
  });

  const products = data?.data || [];
  const meta = data?.meta;
  const resultCount = meta?.total || 0;

  return (
    <div className={styles.container}>
      <CategorySidebar />

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>Products</h1>
          <p className={styles.count}>
            {resultCount > 0 ? `${resultCount} results` : 'No results'}
          </p>
        </div>

        <ProductGrid
          products={products}
          isLoading={isLoading}
          error={error}
        />

        {meta && meta.pages > 1 && (
          <Pagination meta={meta} />
        )}
      </main>
    </div>
  );
}
