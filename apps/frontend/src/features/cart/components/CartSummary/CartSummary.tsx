"use client";

import { useRouter } from "next/navigation";
import type { Cart } from "../../interfaces";
import { useCartTotalsWorker } from "../../hooks/useCartTotalsWorker";
import { CouponInput, useCoupon } from "@/features/coupons";
import styles from "./CartSummary.module.scss";

const TAX_RATE = 0.08;

interface CartSummaryProps {
  cart: Cart;
}

export function CartSummary({ cart }: CartSummaryProps) {
  const router = useRouter();
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
  const afterDiscount = subtotal - discount;
  const tax = afterDiscount * TAX_RATE;
  const orderTotal = afterDiscount + tax;
  const displayItemCount = workerTotals?.itemCount ?? cart.itemCount;

  return (
    <aside className={styles.summary}>
      <h2 className={styles.title}>Order summary</h2>

      <CouponInput
        onApply={applyCoupon}
        onRemove={removeCoupon}
        appliedCoupon={appliedCoupon}
        isPending={isCouponPending}
      />

      <div className={styles.rows}>
        <div className={styles.row}>
          <span className={styles.label}>
            Subtotal ({displayItemCount}{" "}
            {displayItemCount === 1 ? "item" : "items"})
          </span>
          <span className={styles.value}>${afterDiscount.toFixed(2)}</span>
        </div>

        {discount > 0 && (
          <div className={styles.row}>
            <span className={styles.label}>Discount</span>
            <span className={`${styles.value} ${styles.discount}`}>
              −${discount.toFixed(2)}
            </span>
          </div>
        )}

        <div className={styles.row}>
          <span className={styles.label}>Shipping</span>
          <span className={`${styles.value} ${styles.free}`}>Free</span>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>Estimated tax</span>
          <span className={styles.value}>${tax.toFixed(2)}</span>
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.totalRow}>
        <span className={styles.totalLabel}>Order total</span>
        <span className={styles.totalValue}>${orderTotal.toFixed(2)}</span>
      </div>

      <button
        className={styles.checkoutBtn}
        onClick={() => router.push("/checkout")}
      >
        Proceed to checkout
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 12h14M12 5l7 7-7 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <p className={styles.trustBadge}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Secure checkout · 30-day returns
      </p>
    </aside>
  );
}
