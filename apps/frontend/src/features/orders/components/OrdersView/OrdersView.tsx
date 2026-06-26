"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useUserOrders } from "../../hooks";
import { OrderCard } from "../OrderCard/OrderCard";
import { OrderSkeleton } from "../OrderSkeleton/OrderSkeleton";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import type { OrderStatus } from "../../interfaces";
import styles from "./OrdersView.module.scss";

type FilterTab = "all" | "processing" | "shipped" | "delivered";

const PROCESSING_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
];

function matchesTab(status: OrderStatus, tab: FilterTab): boolean {
  if (tab === "all") return true;
  if (tab === "processing") return PROCESSING_STATUSES.includes(status);
  if (tab === "shipped") return status === "SHIPPED";
  if (tab === "delivered") return status === "DELIVERED";
  return false;
}

export function OrdersView() {
  const searchParams = useSearchParams();
  const { data, isLoading } = useUserOrders();
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const allOrders = data?.data || [];

  const counts = {
    all: allOrders.length,
    processing: allOrders.filter((o) => PROCESSING_STATUSES.includes(o.status))
      .length,
    shipped: allOrders.filter((o) => o.status === "SHIPPED").length,
    delivered: allOrders.filter((o) => o.status === "DELIVERED").length,
  };

  const visibleOrders = allOrders.filter((o) =>
    matchesTab(o.status, activeTab),
  );

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All orders" },
    { key: "processing", label: "Processing" },
    { key: "shipped", label: "Shipped" },
    { key: "delivered", label: "Delivered" },
  ];

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/" className={styles.breadcrumbLink}>
          Home
        </Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span>Orders</span>
      </nav>

      <div className={styles.pageHeader}>
        <h1 className={styles.title}>My orders</h1>
        <p className={styles.subtitle}>
          Track, return, or buy your past purchases again.
        </p>
      </div>

      {showSuccess && (
        <div className={styles.successBanner}>Order placed successfully!</div>
      )}

      {isLoading ? (
        <div className={styles.ordersList}>
          {[1, 2, 3].map((i) => (
            <OrderSkeleton key={i} />
          ))}
        </div>
      ) : allOrders.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No orders yet"
          description="You haven't placed any orders yet."
          action={{ label: "Start shopping", href: "/products" }}
        />
      ) : (
        <>
          <div className={styles.tabs} role="tablist">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                role="tab"
                aria-selected={activeTab === key}
                className={`${styles.tab} ${activeTab === key ? styles.tabActive : ""}`}
                onClick={() => setActiveTab(key)}
              >
                {label}
                {counts[key] > 0 && (
                  <span
                    className={`${styles.tabCount} ${activeTab === key ? styles.tabCountActive : ""}`}
                  >
                    {counts[key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className={styles.ordersList}>
            {visibleOrders.length === 0 ? (
              <p className={styles.emptyTab}>No {activeTab} orders.</p>
            ) : (
              visibleOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
