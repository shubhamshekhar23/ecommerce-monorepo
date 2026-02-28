// src/features/admin/components/AdminOrdersView/AdminOrdersView.tsx

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAdminOrders, useUpdateOrderStatus } from '../../hooks';
import type { OrderStatus } from '@/features/orders/interfaces';
import styles from './AdminOrdersView.module.scss';

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: ['REFUNDED'],
  REFUNDED: [],
};

export function AdminOrdersView() {
  const { data, isLoading } = useAdminOrders(1);
  const { mutate: updateStatus, isPending } = useUpdateOrderStatus();

  if (isLoading) {
    return <div className={styles.loading}>Loading orders...</div>;
  }

  const orders = data?.data || [];

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Orders</h1>

      {orders.length === 0 ? (
        <div className={styles.empty}>No orders found.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link href={`/orders/${order.id}`} className={styles.link}>
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>${Number(order.totalPrice).toFixed(2)}</td>
                  <td className={styles.status}>{order.status}</td>
                  <td>
                    <select
                      value={order.status}
                      onChange={(e) =>
                        updateStatus({
                          id: order.id,
                          status: e.target.value as OrderStatus,
                        })
                      }
                      disabled={isPending || TRANSITIONS[order.status].length === 0}
                      className={styles.statusSelect}
                    >
                      <option value={order.status}>{order.status}</option>
                      {TRANSITIONS[order.status].map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
