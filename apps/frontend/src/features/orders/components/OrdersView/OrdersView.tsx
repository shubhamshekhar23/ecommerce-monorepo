'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUserOrders } from '../../hooks';
import { OrderCard } from '../OrderCard/OrderCard';
import { OrderSkeleton } from '../OrderSkeleton/OrderSkeleton';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import styles from './OrdersView.module.scss';

export function OrdersView() {
  const searchParams = useSearchParams();
  const { data, isLoading } = useUserOrders();
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>My Orders</h1>
        <div className={styles.loadingContainer}>
          {[1, 2, 3].map((i) => <OrderSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  const orders = data?.data || [];

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>My Orders</h1>

      {showSuccess && (
        <div className={styles.successBanner}>
          ✓ Order placed successfully!
        </div>
      )}

      {orders.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No orders yet"
          description="You haven't placed any orders yet."
          action={{ label: 'Start shopping', href: '/products' }}
        />
      ) : (
        <div className={styles.ordersList}>
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
