"use client";

import Link from "next/link";
import { useState } from "react";
import { useCancelOrder } from "../../hooks";
import type { Order, OrderStatus } from "../../interfaces";
import styles from "./OrderCard.module.scss";

interface OrderCardProps {
  order: Order;
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Processing",
  CONFIRMED: "Processing",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

const STATUS_META: Record<OrderStatus, string> = {
  PENDING: "Preparing your order",
  CONFIRMED: "Confirmed, preparing",
  PROCESSING: "Packing your order",
  SHIPPED: "In transit",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled · refunded",
  REFUNDED: "Refunded",
};

const STATUS_CLASS: Record<OrderStatus, string> = {
  PENDING: "statusProcessing",
  CONFIRMED: "statusProcessing",
  PROCESSING: "statusProcessing",
  SHIPPED: "statusShipped",
  DELIVERED: "statusDelivered",
  CANCELLED: "statusCancelled",
  REFUNDED: "statusCancelled",
};

export function OrderCard({ order }: OrderCardProps) {
  const { mutate: cancelOrder, isPending: isCanceling } = useCancelOrder();
  const [showConfirm, setShowConfirm] = useState(false);

  const isCancellable = ["PENDING", "CONFIRMED", "PROCESSING"].includes(
    order.status,
  );
  const isDeliveredOrCancelled = [
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
  ].includes(order.status);

  const date = new Date(order.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const total = Number(order.totalPrice).toFixed(2);
  const itemCount = order.items.length;
  const productNames = order.items.map((i) => i.productName).join(", ");
  const meta = `${itemCount} ${itemCount === 1 ? "item" : "items"} · ${STATUS_META[order.status]}`;

  const handleCancel = (): void => {
    cancelOrder(order.id, { onSettled: () => setShowConfirm(false) });
  };

  return (
    <div className={styles.card}>
      {/* ── Top header bar ── */}
      <div className={styles.cardHeader}>
        <div className={styles.headerLeft}>
          <span className={styles.orderNumber}>{order.orderNumber}</span>
          <span
            className={`${styles.badge} ${styles[STATUS_CLASS[order.status]]}`}
          >
            {STATUS_LABEL[order.status]}
          </span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.totalLabel}>Total</span>
          <span className={styles.totalValue}>${total}</span>
        </div>
      </div>

      <p className={styles.dateLine}>Ordered {date}</p>

      {/* ── Content row ── */}
      <div className={styles.content}>
        <div className={styles.avatars}>
          {order.items.slice(0, 3).map((item) => (
            <span
              key={item.id}
              className={styles.avatar}
              title={item.productName}
            >
              {item.productName.charAt(0).toUpperCase()}
            </span>
          ))}
          {order.items.length > 3 && (
            <span className={`${styles.avatar} ${styles.avatarMore}`}>
              +{order.items.length - 3}
            </span>
          )}
        </div>

        <div className={styles.itemInfo}>
          <p className={styles.productNames}>{productNames}</p>
          <p className={styles.meta}>{meta}</p>
        </div>

        <div className={styles.actions}>
          {!showConfirm ? (
            <>
              {order.status === "SHIPPED" && (
                <Link
                  href={`/orders/${order.id}`}
                  className={styles.secondaryBtn}
                >
                  Track package
                </Link>
              )}
              {isDeliveredOrCancelled && (
                <Link href="/products" className={styles.secondaryBtn}>
                  Buy again
                </Link>
              )}
              {isCancellable && (
                <button
                  className={styles.secondaryBtn}
                  onClick={() => setShowConfirm(true)}
                  disabled={isCanceling}
                >
                  Cancel order
                </button>
              )}
              <Link href={`/orders/${order.id}`} className={styles.primaryBtn}>
                View details
                <svg
                  width="14"
                  height="14"
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
              </Link>
            </>
          ) : (
            <div className={styles.confirmInline}>
              <span className={styles.confirmText}>Cancel this order?</span>
              <button
                className={styles.confirmYes}
                onClick={handleCancel}
                disabled={isCanceling}
              >
                {isCanceling ? "…" : "Yes"}
              </button>
              <button
                className={styles.confirmNo}
                onClick={() => setShowConfirm(false)}
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
