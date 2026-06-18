'use client';

import type { Product } from '../../interfaces';
import { ProductCard } from '../ProductCard/ProductCard';
import { ProductSkeleton } from '../ProductSkeleton/ProductSkeleton';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import styles from './ProductGrid.module.scss';

interface ProductGridProps {
  products?: Product[];
  isLoading: boolean;
  error?: Error | null;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; href?: string; onClick?: () => void };
  searchQuery?: string;
}

export function ProductGrid({
  products,
  isLoading,
  error,
  emptyTitle = 'No products found',
  emptyDescription,
  emptyAction,
  searchQuery,
}: ProductGridProps) {
  if (error) {
    return (
      <div className={styles.error}>
        <p>Failed to load products. Please try again.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.grid}>
        {Array(8).fill(0).map((_, i) => (
          <ProductSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div className={styles.grid}>
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index === 0} searchQuery={searchQuery} />
      ))}
    </div>
  );
}
