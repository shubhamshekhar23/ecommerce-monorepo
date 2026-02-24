// src/app/products/page.tsx

import { Suspense } from 'react';
import { ProductsView } from '@/features/products/components/ProductsView/ProductsView';

export const metadata = {
  title: 'Products | ShopHub',
  description: 'Browse our collection of products.',
};

function ProductsLoading() {
  return <div>Loading products...</div>;
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProductsView />
    </Suspense>
  );
}
