"use client";

import Link from "next/link";
import { useProducts, useCategories } from "@/features/products/hooks";
import { useAdminOrders, useAdminUsers } from "@/features/admin/hooks";
import type { Order, OrderStatus } from "@/features/orders/interfaces";
import styles from "./page.module.scss";

function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "DELIVERED":
      return "Fulfilled";
    case "PENDING":
    case "CONFIRMED":
      return "Pending";
    case "PROCESSING":
    case "SHIPPED":
      return "Processing";
    case "REFUNDED":
      return "Refunded";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

function getStatusClass(status: OrderStatus): string {
  switch (status) {
    case "DELIVERED":
      return styles.statusFulfilled;
    case "PENDING":
    case "CONFIRMED":
      return styles.statusPending;
    case "PROCESSING":
    case "SHIPPED":
      return styles.statusProcessing;
    case "REFUNDED":
      return styles.statusRefunded;
    case "CANCELLED":
      return styles.statusCancelled;
    default:
      return "";
  }
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? `${str.slice(0, maxLen)}…` : str;
}

export function AdminDashboard() {
  const { data: productsData } = useProducts({ page: 1, limit: 1 });
  const { data: categoriesData } = useCategories();
  const { data: ordersData } = useAdminOrders();
  const { data: usersData } = useAdminUsers();

  const totalProducts = productsData?.meta.total ?? 0;
  const totalCategories = categoriesData?.meta.total ?? 0;
  const totalOrders = ordersData?.pages[0]?.meta.total ?? 0;
  const totalUsers = usersData?.length ?? 0;

  const recentOrders: Order[] = ordersData?.pages[0]?.data.slice(0, 5) ?? [];

  // Compute order status counts across the first page of orders
  const allOrders: Order[] = ordersData?.pages[0]?.data ?? [];
  const fulfilledCount = allOrders.filter(
    (o) => o.status === "DELIVERED",
  ).length;
  const pendingCount = allOrders.filter((o) =>
    ["PENDING", "CONFIRMED", "PROCESSING"].includes(o.status),
  ).length;
  const refundedCount = allOrders.filter((o) => o.status === "REFUNDED").length;
  const statusTotal = allOrders.length || 1;

  return (
    <div className={styles.dashboard}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Admin Dashboard</h1>
          <p className={styles.pageSubtitle}>
            Monitor store activity and manage catalog operations.
          </p>
        </div>
        <button className={styles.exportBtn}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M7 1v8M4 6l3 3 3-3M2 11h10"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Export report
        </button>
      </div>

      {/* Stats grid */}
      <div className={styles.statsGrid}>
        {/* Products */}
        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIcon} ${styles.iconOrange}`}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M10 2L17 5.75V13.25L10 17L3 13.25V5.75L10 2Z"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 2L10 17M3 5.75L17 13.25M17 5.75L3 13.25"
                  stroke="white"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
            <span className={styles.statChange}>Live data</span>
          </div>
          <p className={styles.statValue}>{totalProducts}</p>
          <p className={styles.statLabel}>Total Products</p>
        </div>

        {/* Categories */}
        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIcon} ${styles.iconOrange}`}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M3 6.5C3 5.1 4.1 4 5.5 4H10.5L13 6.5H16C17.4 6.5 18.5 7.6 18.5 9V15C18.5 16.4 17.4 17.5 16 17.5H5.5C4.1 17.5 3 16.4 3 15V6.5Z"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className={styles.statChange}>Live data</span>
          </div>
          <p className={styles.statValue}>{totalCategories}</p>
          <p className={styles.statLabel}>Total Categories</p>
        </div>

        {/* Orders */}
        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIcon} ${styles.iconOrange}`}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M2 3h2.5l2 9H15l2-6H6"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="9" cy="16.5" r="1.2" fill="white" />
                <circle cx="14" cy="16.5" r="1.2" fill="white" />
              </svg>
            </div>
            <span className={styles.statChange}>Live data</span>
          </div>
          <p className={styles.statValue}>{totalOrders}</p>
          <p className={styles.statLabel}>Total Orders</p>
        </div>

        {/* Users */}
        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIcon} ${styles.iconGreen}`}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle
                  cx="10"
                  cy="7"
                  r="3.5"
                  stroke="white"
                  strokeWidth="1.5"
                />
                <path
                  d="M3 18C3 14.5 6.1 12 10 12S17 14.5 17 18"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className={styles.statChange}>Live data</span>
          </div>
          <p className={styles.statValue}>{totalUsers}</p>
          <p className={styles.statLabel}>Total Users</p>
        </div>
      </div>

      {/* Content grid */}
      <div className={styles.contentGrid}>
        {/* Recent orders table */}
        <section className={styles.recentOrders}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Orders</h2>
            <Link href="/admin/orders" className={styles.viewAllLink}>
              View all →
            </Link>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ORDER</th>
                  <th>PRODUCT</th>
                  <th>STATUS</th>
                  <th>DATE</th>
                  <th>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className={styles.orderNumber}>{order.orderNumber}</td>
                    <td>{truncate(order.items[0]?.productName ?? "—", 30)}</td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${getStatusClass(order.status)}`}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td>
                      {new Date(order.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className={styles.orderTotal}>
                      ${order.totalPrice.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className={styles.emptyRow}>
                      No orders yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right column */}
        <div className={styles.rightColumn}>
          {/* Quick actions */}
          <section className={styles.quickActions}>
            <h3 className={styles.sectionTitle}>Quick Actions</h3>
            <div className={styles.actionList}>
              <Link
                href="/admin/products/new"
                className={styles.actionBtnPrimary}
              >
                Add Product
              </Link>
              <Link
                href="/admin/promotion-rules/new"
                className={styles.actionBtn}
              >
                Create Promotion
              </Link>
              <button className={styles.actionBtn}>Export Report</button>
              <Link href="/admin/returns" className={styles.actionBtn}>
                View Returns
              </Link>
            </div>
          </section>

          {/* Order status */}
          <section className={styles.orderStatus}>
            <h3 className={styles.sectionTitle}>Order Status</h3>
            <div className={styles.statusRows}>
              <div className={styles.statusRow}>
                <div className={styles.statusRowHeader}>
                  <span className={styles.statusRowLabel}>Fulfilled</span>
                  <span className={styles.statusRowCount}>
                    {fulfilledCount} of {allOrders.length}
                  </span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={`${styles.progressFill} ${styles.progressGreen}`}
                    style={{
                      width: `${(fulfilledCount / statusTotal) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className={styles.statusRow}>
                <div className={styles.statusRowHeader}>
                  <span className={styles.statusRowLabel}>Pending</span>
                  <span className={styles.statusRowCount}>
                    {pendingCount} of {allOrders.length}
                  </span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={`${styles.progressFill} ${styles.progressOrange}`}
                    style={{ width: `${(pendingCount / statusTotal) * 100}%` }}
                  />
                </div>
              </div>

              <div className={styles.statusRow}>
                <div className={styles.statusRowHeader}>
                  <span className={styles.statusRowLabel}>Refunded</span>
                  <span className={styles.statusRowCount}>
                    {refundedCount} of {allOrders.length}
                  </span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={`${styles.progressFill} ${styles.progressGray}`}
                    style={{ width: `${(refundedCount / statusTotal) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
