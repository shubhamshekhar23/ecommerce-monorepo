// src/features/orders/components/OrderDetailView/OrderDetailView.tsx

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useOrder, useCancelOrder } from '../../hooks';
import { Breadcrumb } from '@/components/Breadcrumb/Breadcrumb';
import type { OrderStatus, PaymentStatus } from '../../interfaces';

const PAYMENT_LABELS: Partial<Record<PaymentStatus, string>> = {
  SUCCEEDED: 'Paid',
  FAILED: 'Payment Failed',
  REFUNDED: 'Refunded',
  CANCELED: 'Payment Canceled',
};

const PAYMENT_STYLE_MAP: Partial<Record<PaymentStatus, string>> = {
  SUCCEEDED: 'paymentSucceeded',
  FAILED: 'paymentFailed',
  REFUNDED: 'paymentRefunded',
  CANCELED: 'paymentCanceled',
};
import styles from './OrderDetailView.module.scss';

interface OrderDetailViewProps {
  id: string;
}

export function OrderDetailView({ id }: OrderDetailViewProps) {
  const { data: order, isLoading, error } = useOrder(id);
  const { mutate: cancelOrder, isPending: isCanceling } = useCancelOrder();
  const [showConfirm, setShowConfirm] = useState(false);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h1>Order Not Found</h1>
          <p>This order doesn&apos;t exist or you don&apos;t have permission to view it.</p>
          <Link href="/orders">← Back to Orders</Link>
        </div>
      </div>
    );
  }

  const isCancellable = ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(order.status);
  const statuses: OrderStatus[] = [
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
  ];
  const statusTimeline = statuses.map((status) => ({
    status,
    completed: statuses.indexOf(status) < statuses.indexOf(order.status as OrderStatus),
    current: status === order.status,
  }));

  const handleCancel = (): void => {
    cancelOrder(order.id, {
      onSettled: () => setShowConfirm(false),
    });
  };

  return (
    <div className={styles.container}>
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'My Orders', href: '/orders' },
        { label: order.orderNumber },
      ]} />

      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>{order.orderNumber}</h1>
          <p className={styles.date}>
            {new Date(order.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className={styles.headerBadges}>
          <div className={styles.status}>{order.status}</div>
          {PAYMENT_LABELS[order.paymentStatus] && (
            <div className={`${styles.paymentBadge} ${styles[PAYMENT_STYLE_MAP[order.paymentStatus] ?? ''] ?? ''}`}>
              {PAYMENT_LABELS[order.paymentStatus]}
            </div>
          )}
        </div>
      </div>

      {order.paymentStatus === 'FAILED' && (
        <div className={styles.paymentWarning}>
          Payment was declined — your order has not been charged. Please contact support.
        </div>
      )}

      <div className={styles.timeline}>
        <h2 className={styles.timelineTitle}>Order Status</h2>
        <div className={styles.timelineTrack}>
          {statusTimeline.map((item, idx) => (
            <div key={item.status} className={styles.timelineItem}>
              <div
                className={`${styles.timelinePoint} ${
                  item.completed ? styles.completed : item.current ? styles.current : ''
                }`}
              />
              {idx < statusTimeline.length - 1 && (
                <div
                  className={`${styles.timelineConnector} ${
                    item.completed ? styles.completed : ''
                  }`}
                />
              )}
              <p className={styles.timelineLabel}>{item.status}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.itemsSection}>
        <h2 className={styles.sectionTitle}>Order Items</h2>
        <div className={styles.itemsList}>
          {order.items.map((item) => (
            <div key={item.id} className={styles.itemRow}>
              <div className={styles.itemInfo}>
                <p className={styles.itemName}>{item.productName}</p>
                <p className={styles.itemPrice}>
                  ${Number(item.price).toFixed(2)} × {item.quantity}
                </p>
              </div>
              <div className={styles.itemSubtotal}>
                ${Number(item.subtotal).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <span className={styles.label}>Total</span>
          <span className={styles.value}>${Number(order.totalPrice).toFixed(2)}</span>
        </div>
      </div>

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
              {isCanceling ? '...' : 'Yes, Cancel'}
            </button>
            <button
              className={styles.confirmNo}
              onClick={() => setShowConfirm(false)}
              disabled={isCanceling}
            >
              No, Keep Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
