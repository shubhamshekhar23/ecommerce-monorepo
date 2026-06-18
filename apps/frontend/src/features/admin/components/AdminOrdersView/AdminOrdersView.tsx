'use client';

import Link from 'next/link';
import { useAdminOrders, useUpdateOrderStatus } from '../../hooks';
import { AdminTableSkeleton } from '../AdminTableSkeleton/AdminTableSkeleton';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { useUrlState } from '@/hooks/useUrlState';
import type { OrderStatus } from '@/features/orders/interfaces';
import styles from './AdminOrdersView.module.scss';

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED',
];

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
  const [statusFilter, setStatusFilter] = useUrlState('status');
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAdminOrders();
  const { mutate: updateStatus, isPending } = useUpdateOrderStatus();

  if (isLoading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Orders</h1>
        <AdminTableSkeleton rows={10} columns={5} />
      </div>
    );
  }

  const allOrders = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.meta.total ?? 0;
  const orders = statusFilter
    ? allOrders.filter((o) => o.status === statusFilter)
    : allOrders;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Orders</h1>

        <div className={styles.filters}>
          <select
            className={styles.statusFilter}
            value={statusFilter ?? ''}
            onChange={(e) => setStatusFilter(e.target.value || null)}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {statusFilter && (
            <button className={styles.clearBtn} onClick={() => setStatusFilter(null)}>
              Clear
            </button>
          )}
        </div>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description={statusFilter ? `No orders with status "${statusFilter}"` : 'Orders placed by customers will appear here.'}
          action={statusFilter ? { label: 'Clear filter', onClick: () => setStatusFilter(null) } : undefined}
        />
      ) : (
        <>
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
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.footer}>
            <span className={styles.count}>
              {statusFilter
                ? `${orders.length} of ${allOrders.length} loaded (${total} total)`
                : `Showing ${orders.length} of ${total} order${total !== 1 ? 's' : ''}`}
            </span>

            {hasNextPage && !statusFilter && (
              <button
                className={styles.loadMoreBtn}
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? 'Loading…' : 'Load More'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
