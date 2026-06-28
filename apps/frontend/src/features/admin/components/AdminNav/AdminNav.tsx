// src/features/admin/components/AdminNav/AdminNav.tsx

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useLogout } from "@/features/auth";
import { useAdminOrders } from "../../hooks";
import styles from "./AdminNav.module.scss";

export function AdminNav() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const { data: ordersData } = useAdminOrders();

  const totalOrders = ordersData?.pages[0]?.meta.total ?? 0;

  const isActive = (path: string): boolean => {
    if (path === "/admin") return pathname.endsWith("/admin");
    return pathname.includes(path.replace("/admin", ""));
  };

  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "?";

  return (
    <nav className={styles.nav}>
      {/* Logo */}
      <div className={styles.logoSection}>
        <Link href="/admin" className={styles.logoLink}>
          <Image
            src="/images/logo-icon.png"
            alt="ShopHub logo"
            width={36}
            height={36}
            className={styles.logoImage}
          />
          <div className={styles.logoText}>
            <span className={styles.logoName}>ShopHub</span>
            <span className={styles.logoSub}>Admin console</span>
          </div>
        </Link>
      </div>

      {/* Search */}
      <div className={styles.searchWrap}>
        <svg
          className={styles.searchIcon}
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle
            cx="6"
            cy="6"
            r="4.5"
            stroke="currentColor"
            strokeWidth="1.3"
          />
          <path
            d="M9.5 9.5L13 13"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
        <input
          type="search"
          placeholder="Search..."
          className={styles.searchInput}
          readOnly
          aria-label="Search (non-functional)"
        />
      </div>

      {/* Navigation menu */}
      <div className={styles.menu}>
        {/* CATALOG */}
        <div className={styles.group}>
          <span className={styles.groupLabel}>Catalog</span>

          <Link
            href="/admin"
            className={`${styles.link} ${isActive("/admin") ? styles.active : ""}`}
          >
            <span className={styles.linkIcon}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect
                  x="1"
                  y="1"
                  width="5.5"
                  height="5.5"
                  rx="1"
                  fill="currentColor"
                />
                <rect
                  x="8.5"
                  y="1"
                  width="5.5"
                  height="5.5"
                  rx="1"
                  fill="currentColor"
                />
                <rect
                  x="1"
                  y="8.5"
                  width="5.5"
                  height="5.5"
                  rx="1"
                  fill="currentColor"
                />
                <rect
                  x="8.5"
                  y="8.5"
                  width="5.5"
                  height="5.5"
                  rx="1"
                  fill="currentColor"
                />
              </svg>
            </span>
            Dashboard
          </Link>

          <Link
            href="/admin/products"
            className={`${styles.link} ${isActive("/admin/products") ? styles.active : ""}`}
          >
            <span className={styles.linkIcon}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M7.5 1L13 4.25V10.75L7.5 14L2 10.75V4.25L7.5 1Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
                <path
                  d="M7.5 1L7.5 14M2 4.25L13 10.75M13 4.25L2 10.75"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
              </svg>
            </span>
            Products
          </Link>

          <Link
            href="/admin/categories"
            className={`${styles.link} ${isActive("/admin/categories") ? styles.active : ""}`}
          >
            <span className={styles.linkIcon}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M2 4.5C2 3.4 2.9 2.5 4 2.5H7.5L9.5 4.5H12C13.1 4.5 14 5.4 14 6.5V11C14 12.1 13.1 13 12 13H4C2.9 13 2 12.1 2 11V4.5Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Categories
          </Link>
        </div>

        {/* OPERATIONS */}
        <div className={styles.group}>
          <span className={styles.groupLabel}>Operations</span>

          <Link
            href="/admin/orders"
            className={`${styles.link} ${isActive("/admin/orders") ? styles.active : ""}`}
          >
            <span className={styles.linkIcon}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M1 2h2l1.5 7h7l1.5-5H4.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="6.5" cy="12.5" r="1" fill="currentColor" />
                <circle cx="11" cy="12.5" r="1" fill="currentColor" />
              </svg>
            </span>
            Orders
            {totalOrders > 0 && (
              <span className={styles.badge}>
                {totalOrders > 99 ? "99+" : totalOrders}
              </span>
            )}
          </Link>

          <Link
            href="/admin/returns"
            className={`${styles.link} ${isActive("/admin/returns") ? styles.active : ""}`}
          >
            <span className={styles.linkIcon}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M3.5 5.5H9A3.5 3.5 0 1 1 9 12.5H2"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5.5 3L3 5.5L5.5 8"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Returns
          </Link>

          <Link
            href="/admin/users"
            className={`${styles.link} ${isActive("/admin/users") ? styles.active : ""}`}
          >
            <span className={styles.linkIcon}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle
                  cx="7.5"
                  cy="5"
                  r="2.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
                <path
                  d="M2 13.5C2 11 4.5 9 7.5 9S13 11 13 13.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            Users
          </Link>
        </div>

        {/* BUSINESS */}
        <div className={styles.group}>
          <span className={styles.groupLabel}>Business</span>

          <Link
            href="/admin/promotion-rules"
            className={`${styles.link} ${isActive("/admin/promotion-rules") ? styles.active : ""}`}
          >
            <span className={styles.linkIcon}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle
                  cx="5"
                  cy="5"
                  r="1.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
                <circle
                  cx="10"
                  cy="10"
                  r="1.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
                <path
                  d="M11.5 3.5L3.5 11.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            Promotion Rules
          </Link>
        </div>

        {/* SYSTEM */}
        <div className={styles.group}>
          <span className={styles.groupLabel}>System</span>

          <Link
            href="/admin/queue"
            className={`${styles.link} ${isActive("/admin/queue") ? styles.active : ""}`}
          >
            <span className={styles.linkIcon}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M2 4h11M2 7.5h8M2 11h5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            Queue
          </Link>

          <Link
            href="/admin/feature-flags"
            className={`${styles.link} ${isActive("/admin/feature-flags") ? styles.active : ""}`}
          >
            <span className={styles.linkIcon}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M3 2v11M3 2l8 3.5L3 9"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Feature Flags
          </Link>

          <Link
            href="/admin/db-analytics"
            className={`${styles.link} ${isActive("/admin/db-analytics") ? styles.active : ""}`}
          >
            <span className={styles.linkIcon}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect
                  x="2"
                  y="9"
                  width="2.5"
                  height="4"
                  rx="0.5"
                  fill="currentColor"
                />
                <rect
                  x="6.25"
                  y="6"
                  width="2.5"
                  height="7"
                  rx="0.5"
                  fill="currentColor"
                />
                <rect
                  x="10.5"
                  y="3"
                  width="2.5"
                  height="10"
                  rx="0.5"
                  fill="currentColor"
                />
              </svg>
            </span>
            DB Analytics
          </Link>

          <Link
            href="/admin/settings"
            className={`${styles.link} ${isActive("/admin/settings") ? styles.active : ""}`}
          >
            <span className={styles.linkIcon}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle
                  cx="7.5"
                  cy="7.5"
                  r="2"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
                <path
                  d="M7.5 1v1.5M7.5 12.5V14M14 7.5h-1.5M2.5 7.5H1M11.7 3.3l-1.1 1.1M4.4 10.6l-1.1 1.1M11.7 11.7l-1.1-1.1M4.4 4.4L3.3 3.3"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            Settings
          </Link>
        </div>
      </div>

      {/* Footer: user info + logout */}
      <div className={styles.footer}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.userDetails}>
            <span className={styles.userName}>
              {user ? `${user.firstName} ${user.lastName}` : "—"}
            </span>
            <span className={styles.userEmail}>{user?.email ?? "—"}</span>
          </div>
        </div>
        <button
          className={styles.logoutBtn}
          onClick={() => logout.mutate()}
          aria-label="Logout"
          title="Logout"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M5.5 2H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2.5"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <path
              d="M10 10.5L13 7.5L10 4.5"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13 7.5H6"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </nav>
  );
}
