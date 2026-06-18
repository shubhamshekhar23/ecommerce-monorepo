// src/features/orders/components/OrdersView/OrdersView.tsx

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useUserOrders } from '../../hooks';
import { OrderCard } from '../OrderCard/OrderCard';
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
          <div className={styles.skeleton} />
          <div className={styles.skeleton} />
          <div className={styles.skeleton} />
        </div>
      </div>
    );
  }

  const orders = data?.data || [];
  const hasOrders = orders.length > 0;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>My Orders</h1>

      {showSuccess && (
        <div className={styles.successBanner}>
          ✓ Order placed successfully!
        </div>
      )}

      {!hasOrders ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyMessage}>You haven&apos;t placed any orders yet.</p>
          <Link href="/products" className={styles.continueShopping}>
            Continue Shopping
          </Link>
        </div>
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
