// src/app/products/page.tsx

import { Suspense } from 'react';
import { ProductsView } from '@/features/products/components/ProductsView/ProductsView';
import styles from './page.module.scss';

export const metadata = {
  title: 'Products | ShopHub',
  description: 'Browse our collection of products.',
};

function ProductsLoading() {
  return (
    <div className={styles.loadingState} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <p className={styles.loadingText}>Loading products...</p>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProductsView />
    </Suspense>
  );
}
