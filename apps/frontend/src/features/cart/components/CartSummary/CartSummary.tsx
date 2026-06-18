// src/features/cart/components/CartSummary/CartSummary.tsx

"use client";

import { useReducer } from "react";
import { useRouter } from "next/navigation";
import type { Cart } from "../../interfaces";
import { useClearCart } from "../../hooks";
import { cartUiReducer, cartUiInitialState } from "../../cartReducer";
import styles from "./CartSummary.module.scss";

interface CartSummaryProps {
  cart: Cart;
}

export function CartSummary({ cart }: CartSummaryProps) {
  const router = useRouter();
  const { mutate: clearCart, isPending: isClearing } = useClearCart();
  const [state, dispatch] = useReducer(cartUiReducer, cartUiInitialState);

  const total = Number(cart.totalPrice).toFixed(2);
  const itemLabel = cart.itemCount === 1 ? "1 item" : `${cart.itemCount} items`;

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

      <div className={styles.divider} />

      <div className={`${styles.row} ${styles.totalRow}`}>
        <span className={styles.totalLabel}>Order Total</span>
        <span className={styles.totalValue}>${total}</span>
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
