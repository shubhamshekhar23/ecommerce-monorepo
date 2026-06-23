// src/features/admin/components/AdminNav/AdminNav.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminReturns } from "../../hooks";
import styles from "./AdminNav.module.scss";

export function AdminNav() {
  const pathname = usePathname();
  const { data: returns } = useAdminReturns();
  const pendingReturns =
    returns?.filter((r) => r.status === "PENDING").length ?? 0;

  const isActive = (path: string): boolean => {
    if (path === "/admin") return pathname === "/admin";
    return pathname.startsWith(path);
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.header}>
        <Link href="/" className={styles.logo}>
          ShopHub Admin
        </Link>
      </div>

      <div className={styles.menu}>
        <div className={styles.group}>
          <span className={styles.groupLabel}>Catalog</span>
          <Link
            href="/admin"
            className={`${styles.link} ${isActive("/admin") ? styles.active : ""}`}
          >
            Dashboard
          </Link>
          <Link
            href="/admin/products"
            className={`${styles.link} ${isActive("/admin/products") ? styles.active : ""}`}
          >
            Products
          </Link>
          <Link
            href="/admin/categories"
            className={`${styles.link} ${isActive("/admin/categories") ? styles.active : ""}`}
          >
            Categories
          </Link>
        </div>

        <div className={styles.group}>
          <span className={styles.groupLabel}>Operations</span>
          <Link
            href="/admin/orders"
            className={`${styles.link} ${isActive("/admin/orders") ? styles.active : ""}`}
          >
            Orders
          </Link>
          <Link
            href="/admin/returns"
            className={`${styles.link} ${isActive("/admin/returns") ? styles.active : ""}`}
          >
            Returns
            {pendingReturns > 0 && (
              <span className={styles.badge}>{pendingReturns}</span>
            )}
          </Link>
          <Link
            href="/admin/users"
            className={`${styles.link} ${isActive("/admin/users") ? styles.active : ""}`}
          >
            Users
          </Link>
        </div>

        <div className={styles.group}>
          <span className={styles.groupLabel}>Business</span>
          <Link
            href="/admin/promotion-rules"
            className={`${styles.link} ${isActive("/admin/promotion-rules") ? styles.active : ""}`}
          >
            Promotion Rules
          </Link>
        </div>

        <div className={styles.group}>
          <span className={styles.groupLabel}>System</span>
          <Link
            href="/admin/queue"
            className={`${styles.link} ${isActive("/admin/queue") ? styles.active : ""}`}
          >
            Queue
          </Link>
          <Link
            href="/admin/feature-flags"
            className={`${styles.link} ${isActive("/admin/feature-flags") ? styles.active : ""}`}
          >
            Feature Flags
          </Link>
          <Link
            href="/admin/db-analytics"
            className={`${styles.link} ${isActive("/admin/db-analytics") ? styles.active : ""}`}
          >
            DB Analytics
          </Link>
        </div>
      </div>

      <div className={styles.footer}>
        <Link href="/" className={styles.storeLink}>
          ← Back to Store
        </Link>
      </div>
    </nav>
  );
}
