// src/features/cart/components/CartSummary/CartSummary.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Cart } from '../../interfaces';
import { useClearCart } from '../../hooks';
import styles from './CartSummary.module.scss';

interface CartSummaryProps {
  cart: Cart;
}

export function CartSummary({ cart }: CartSummaryProps) {
  const router = useRouter();
  const { mutate: clearCart, isPending: isClearing } = useClearCart();
  const [showConfirm, setShowConfirm] = useState(false);

  const total = Number(cart.totalPrice).toFixed(2);
  const itemLabel = cart.itemCount === 1 ? '1 item' : `${cart.itemCount} items`;

  const handleClearClick = (): void => {
    setShowConfirm(true);
  };

  const handleConfirmClear = (): void => {
    clearCart(undefined, {
      onSettled: () => setShowConfirm(false),
    });
  };

  const handleCancelClear = (): void => {
    setShowConfirm(false);
  };

  return (
    <aside className={styles.summary}>
      <h2 className={styles.title}>Order Summary</h2>

      <div className={styles.row}>
        <span className={styles.label}>Items</span>
        <span className={styles.value}>{itemLabel}</span>
      </div>

      <div className={styles.divider} />

      <div className={`${styles.row} ${styles.totalRow}`}>
        <span className={styles.totalLabel}>Order Total</span>
        <span className={styles.totalValue}>${total}</span>
      </div>

      <button className={styles.checkoutBtn} onClick={() => router.push('/checkout')}>
        Proceed to Checkout
      </button>

      {!showConfirm ? (
        <button
          className={styles.clearBtn}
          onClick={handleClearClick}
          disabled={isClearing}
        >
          Clear Cart
        </button>
      ) : (
        <div className={styles.confirmBox}>
          <p className={styles.confirmText}>Remove all items?</p>
          <div className={styles.confirmActions}>
            <button
              className={styles.confirmYes}
              onClick={handleConfirmClear}
              disabled={isClearing}
            >
              {isClearing ? 'Clearing...' : 'Yes, clear'}
            </button>
            <button className={styles.confirmNo} onClick={handleCancelClear}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
