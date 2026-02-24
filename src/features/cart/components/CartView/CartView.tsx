// src/features/cart/components/CartView/CartView.tsx

'use client';

import Link from 'next/link';
import { useCart } from '../../hooks';
import { CartItemRow } from '../CartItemRow/CartItemRow';
import { CartSummary } from '../CartSummary/CartSummary';
import styles from './CartView.module.scss';

export function CartView() {
  const { data: cart, isLoading, error } = useCart();

  if (isLoading) {
    return <CartViewSkeleton />;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>Failed to load cart. Please try again.</p>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className={styles.empty}>
        <h1 className={styles.emptyTitle}>Your cart is empty</h1>
        <p className={styles.emptyText}>Add some items to get started.</p>
        <Link href="/products" className={styles.continueShopping}>
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.itemsSection}>
        <h1 className={styles.title}>Shopping Cart</h1>
        <div className={styles.itemsList}>
          {cart.items.map((item) => (
            <CartItemRow key={item.id} item={item} />
          ))}
        </div>
      </div>

      <CartSummary cart={cart} />
    </div>
  );
}

function CartViewSkeleton() {
  return (
    <div className={styles.container}>
      <div className={styles.itemsSection}>
        <div className={styles.skeletonTitle} />
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.skeletonRow} />
        ))}
      </div>
      <div className={styles.skeletonSummary} />
    </div>
  );
}
