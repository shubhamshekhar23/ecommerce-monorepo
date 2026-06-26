"use client";

import Link from "next/link";
import { useReducer } from "react";
import { useCart, useClearCart } from "../../hooks";
import { cartUiReducer, cartUiInitialState } from "../../cartReducer";
import { CartItemRow } from "../CartItemRow/CartItemRow";
import { CartSummary } from "../CartSummary/CartSummary";
import { CartSkeleton } from "../CartSkeleton/CartSkeleton";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import styles from "./CartView.module.scss";

export function CartView() {
  const { data: cart, isLoading, error } = useCart();
  const { mutate: clearCart, isPending: isClearing } = useClearCart();
  const [state, dispatch] = useReducer(cartUiReducer, cartUiInitialState);

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
        action={{ label: "Browse products", href: "/products" }}
      />
    );
  }

  const itemCount = cart.itemCount;

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/" className={styles.breadcrumbLink}>
          Home
        </Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span>Cart</span>
      </nav>

      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Shopping cart</h1>
        <p className={styles.subtitle}>
          You have <strong>{itemCount}</strong>{" "}
          {itemCount === 1 ? "item" : "items"} in your cart
        </p>
      </div>

      <div className={styles.container}>
        <div className={styles.itemsSection}>
          <div className={styles.itemsList}>
            {cart.items.map((item) => (
              <CartItemRow key={item.id} item={item} />
            ))}
          </div>

          <div className={styles.itemsFooter}>
            <Link href="/products" className={styles.continueShopping}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M19 12H5M12 5l-7 7 7 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Continue shopping
            </Link>

            {state.phase === "browsing" ? (
              <button
                className={styles.clearCartBtn}
                onClick={() => dispatch({ type: "REQUEST_CLEAR" })}
                disabled={isClearing}
              >
                Clear cart
              </button>
            ) : (
              <div className={styles.confirmInline}>
                <span className={styles.confirmText}>Remove all items?</span>
                <button
                  className={styles.confirmYes}
                  onClick={() => {
                    dispatch({ type: "CONFIRM_CLEAR" });
                    clearCart(undefined);
                  }}
                  disabled={isClearing}
                >
                  {isClearing ? "Clearing…" : "Yes"}
                </button>
                <button
                  className={styles.confirmNo}
                  onClick={() => dispatch({ type: "CANCEL" })}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <CartSummary cart={cart} />
      </div>
    </div>
  );
}
