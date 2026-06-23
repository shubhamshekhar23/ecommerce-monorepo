// src/features/cart/components/CartSummary/CartSummary.tsx

"use client";

import { useReducer } from "react";
import { useRouter } from "next/navigation";
import type { Cart } from "../../interfaces";
import { useClearCart } from "../../hooks";
import { useCartTotalsWorker } from "../../hooks/useCartTotalsWorker";
import { cartUiReducer, cartUiInitialState } from "../../cartReducer";
import { CouponInput, useCoupon } from "@/features/coupons";
import styles from "./CartSummary.module.scss";

interface CartSummaryProps {
  cart: Cart;
}

export function CartSummary({ cart }: CartSummaryProps) {
  const router = useRouter();
  const { mutate: clearCart, isPending: isClearing } = useClearCart();
  const [state, dispatch] = useReducer(cartUiReducer, cartUiInitialState);
  const {
    appliedCoupon,
    apply: applyCoupon,
    remove: removeCoupon,
    isPending: isCouponPending,
    computeDiscount,
  } = useCoupon();

  // Worker computes totals off the main thread. Falls back to the backend-provided
  // value on the first tick before the worker responds.
  const workerTotals = useCartTotalsWorker(cart.items);
  const subtotal = workerTotals?.totalPrice ?? Number(cart.totalPrice);
  const discount = computeDiscount(subtotal);
  const displayTotal = (subtotal - discount).toFixed(2);
  const displayItemCount = workerTotals?.itemCount ?? cart.itemCount;
  const itemLabel =
    displayItemCount === 1 ? "1 item" : `${displayItemCount} items`;

  const handleConfirmClear = (): void => {
    dispatch({ type: "CONFIRM_CLEAR" });
    clearCart(undefined);
  };

  return (
    <aside className={styles.summary}>
      <h2 className={styles.title}>Order Summary</h2>

      <div className={styles.row}>
        <span className={styles.label}>Items</span>
        <span className={styles.value}>{itemLabel}</span>
      </div>

      <CouponInput
        onApply={applyCoupon}
        onRemove={removeCoupon}
        appliedCoupon={appliedCoupon}
        isPending={isCouponPending}
      />

      {discount > 0 && (
        <div className={styles.row}>
          <span className={styles.label}>Discount</span>
          <span
            className={styles.value}
            style={{ color: "var(--color-error)" }}
          >
            −${discount.toFixed(2)}
          </span>
        </div>
      )}

      <div className={styles.divider} />

      <div className={`${styles.row} ${styles.totalRow}`}>
        <span className={styles.totalLabel}>Order Total</span>
        <span className={styles.totalValue}>${displayTotal}</span>
      </div>

      <button
        className={styles.checkoutBtn}
        onClick={() => router.push("/checkout")}
      >
        Proceed to Checkout
      </button>

      {state.phase === "browsing" ? (
        <button
          className={styles.clearBtn}
          onClick={() => dispatch({ type: "REQUEST_CLEAR" })}
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
              {isClearing ? "Clearing..." : "Yes, clear"}
            </button>
            <button
              className={styles.confirmNo}
              onClick={() => dispatch({ type: "CANCEL" })}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
