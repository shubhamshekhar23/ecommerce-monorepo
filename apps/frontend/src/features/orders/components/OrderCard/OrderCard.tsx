// src/features/orders/components/OrderCard/OrderCard.tsx

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCancelOrder } from '../../hooks';
import type { Order } from '../../interfaces';
import styles from './OrderCard.module.scss';

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  const { mutate: cancelOrder, isPending: isCanceling } = useCancelOrder();
  const [showConfirm, setShowConfirm] = useState(false);

  const isCancellable = ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(order.status);
  const date = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const total = Number(order.totalPrice).toFixed(2);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'PENDING':
        return styles.statusPending;
      case 'CONFIRMED':
      case 'PROCESSING':
        return styles.statusProcessing;
      case 'SHIPPED':
        return styles.statusShipped;
      case 'DELIVERED':
        return styles.statusDelivered;
      case 'CANCELLED':
      case 'REFUNDED':
        return styles.statusCancelled;
      default:
        return '';
    }
  };

  const handleCancel = (): void => {
    cancelOrder(order.id, {
      onSettled: () => setShowConfirm(false),
    });
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.orderInfo}>
          <h3 className={styles.orderNumber}>{order.orderNumber}</h3>
          <p className={styles.date}>{date}</p>
        </div>
        <div className={`${styles.status} ${getStatusColor(order.status)}`}>
          {order.status}
        </div>
      </div>

      <div className={styles.details}>
        <div className={styles.row}>
          <span className={styles.label}>Items</span>
          <span className={styles.value}>{order.items.length}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Total</span>
          <span className={`${styles.value} ${styles.total}`}>${total}</span>
        </div>
      </div>

      <div className={styles.actions}>
        <Link href={`/orders/${order.id}`} className={styles.viewBtn}>
          View Details
        </Link>

        {!showConfirm ? (
          isCancellable && (
            <button
              className={styles.cancelBtn}
              onClick={() => setShowConfirm(true)}
              disabled={isCanceling}
            >
              {isCanceling ? 'Canceling...' : 'Cancel Order'}
            </button>
          )
        ) : (
          <div className={styles.confirmBox}>
            <p className={styles.confirmText}>Cancel this order?</p>
            <div className={styles.confirmActions}>
              <button
                className={styles.confirmYes}
                onClick={handleCancel}
                disabled={isCanceling}
              >
                {isCanceling ? '...' : 'Yes'}
              </button>
              <button
                className={styles.confirmNo}
                onClick={() => setShowConfirm(false)}
                disabled={isCanceling}
              >
                No
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
