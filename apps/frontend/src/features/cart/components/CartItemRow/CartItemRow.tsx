"use client";

import React from "react";
import Link from "next/link";
import type { CartItem } from "../../interfaces";
import { useUpdateCartItem, useRemoveCartItem } from "../../hooks";
import styles from "./CartItemRow.module.scss";

interface CartItemRowProps {
  item: CartItem;
}

function CartItemRowComponent({ item }: CartItemRowProps) {
  const { mutate: updateItem, isPending: isUpdating } = useUpdateCartItem();
  const { mutate: removeItem, isPending: isRemoving } = useRemoveCartItem();

  const price = Number(item.product.price).toFixed(2);
  const subtotal = Number(item.subtotal).toFixed(2);
  const inStock = item.product.stock > 0;

  const handleDecrement = (): void => {
    if (item.quantity <= 1) return;
    updateItem({ itemId: item.id, quantity: item.quantity - 1 });
  };

  const handleIncrement = (): void => {
    if (item.quantity >= item.product.stock) return;
    updateItem({ itemId: item.id, quantity: item.quantity + 1 });
  };

  const handleRemove = (): void => {
    removeItem(item.id);
  };

  const isDisabled = isUpdating || isRemoving;

  return (
    <div className={`${styles.row} ${isRemoving ? styles.rowRemoving : ""}`}>
      <div className={styles.imageWrapper}>
        <span className={styles.placeholder}>
          {item.product.name.charAt(0).toUpperCase()}
        </span>
      </div>

      <div className={styles.details}>
        <Link href={`/products/${item.product.slug}`} className={styles.name}>
          {item.product.name}
        </Link>
        <div className={styles.meta}>
          ${price} each
          <span className={styles.dot}>·</span>
          <span className={inStock ? styles.inStock : styles.outOfStock}>
            {inStock ? "in stock" : "out of stock"}
          </span>
        </div>
      </div>

      <div className={styles.quantityControl}>
        <button
          className={styles.qtyBtnMinus}
          onClick={handleDecrement}
          disabled={isDisabled || item.quantity <= 1}
          aria-label="Decrease quantity"
        >
          −
        </button>
        <span className={styles.qty}>{item.quantity}</span>
        <button
          className={styles.qtyBtnPlus}
          onClick={handleIncrement}
          disabled={isDisabled || item.quantity >= item.product.stock}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      <div className={styles.subtotal}>${subtotal}</div>

      <button
        className={styles.removeBtn}
        onClick={handleRemove}
        disabled={isDisabled}
        aria-label={`Remove ${item.product.name} from cart`}
      >
        {isRemoving ? (
          <span className={styles.removingDots}>…</span>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
}

export const CartItemRow = React.memo(CartItemRowComponent);
