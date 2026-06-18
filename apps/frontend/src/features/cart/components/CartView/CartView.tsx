'use client';

import { useCart } from '../../hooks';
import { CartItemRow } from '../CartItemRow/CartItemRow';
import { CartSummary } from '../CartSummary/CartSummary';
import { CartSkeleton } from '../CartSkeleton/CartSkeleton';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import styles from './CartView.module.scss';

export function CartView() {
  const { data: cart, isLoading, error } = useCart();

  if (isLoading) {
    return <CartSkeleton />;
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
      <EmptyState
        icon="🛒"
        title="Your cart is empty"
        description="Add some items to get started."
        action={{ label: 'Browse products', href: '/products' }}
      />
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
