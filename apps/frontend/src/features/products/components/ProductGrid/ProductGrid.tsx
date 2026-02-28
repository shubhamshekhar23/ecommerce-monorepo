// src/features/products/components/ProductGrid/ProductGrid.tsx

'use client';

import Link from 'next/link';
import type { Product } from '../../interfaces';
import { ProductCard } from '../ProductCard/ProductCard';
import { ProductSkeleton } from '../ProductSkeleton/ProductSkeleton';
import styles from './ProductGrid.module.scss';

interface ProductGridProps {
  products?: Product[];
  isLoading: boolean;
  error?: Error | null;
}

export function ProductGrid({ products, isLoading, error }: ProductGridProps) {
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
        {Array(8)
          .fill(0)
          .map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No products found.</p>
        <Link href="/">Return to home</Link>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
