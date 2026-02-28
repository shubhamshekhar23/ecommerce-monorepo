// src/app/orders/page.tsx

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrdersView } from '@/features/orders/components/OrdersView/OrdersView';

export const metadata: Metadata = {
  title: 'My Orders | ShopHub',
  description: 'View your order history and details.',
};

function OrdersPageSkeleton() {
  return (
    <div style={{ padding: '24px', textAlign: 'center', minHeight: '400px' }}>
      Loading orders...
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersPageSkeleton />}>
      <OrdersView />
    </Suspense>
  );
}
