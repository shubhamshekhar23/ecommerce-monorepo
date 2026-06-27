"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { useLogout } from "@/features/auth/hooks";
import { useCart } from "@/features/cart/hooks";
import { SearchBar } from "@/components/SearchBar/SearchBar";
import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle";
import styles from "./Header.module.scss";

export function Header() {
  const user = useAuthStore((state) => state.user);
  const { mutate: logout } = useLogout();
  const { data: cart } = useCart();
  const cartItemCount = cart?.itemCount ?? 0;

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Brand */}
        <Link href="/" className={styles.brand}>
          <Image
            src="/images/logo-icon.png"
            alt="ShopHub"
            width={44}
            height={44}
            className={styles.brandMark}
            priority
          />
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>ShopHub</span>
            <span className={styles.brandSub}>Curated everyday commerce</span>
          </div>
        </Link>

        {/* Search */}
        <div className={styles.searchWrap}>
          <SearchBar />
        </div>

        {/* Right actions */}
        <div className={styles.actions}>
          {/* Account */}
          <div className={styles.account}>
            {user ? (
              <>
                <span className={styles.greeting}>Hello, {user.firstName}</span>
                <button onClick={() => logout()} className={styles.signoutLink}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <span className={styles.greeting}>Welcome back</span>
                <Link href="/login" className={styles.signinLink}>
                  Sign in
                </Link>
              </>
            )}
          </div>

          <ThemeToggle />
          <span className={styles.divider} aria-hidden="true" />

          {/* Orders */}
          <Link href="/orders" className={styles.ordersLink}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path d="M3 9h18" stroke="currentColor" strokeWidth="1.8" />
              <path d="M9 21V9" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            Orders
          </Link>

          {/* Admin */}
          {user?.role === "ADMIN" && (
            <Link href="/admin" className={styles.adminLink}>
              Admin
            </Link>
          )}

          {/* Cart */}
          <Link
            href="/cart"
            className={styles.cartLink}
            aria-label={
              cartItemCount > 0
                ? `Cart, ${cartItemCount} item${cartItemCount !== 1 ? "s" : ""}`
                : "Cart"
            }
          >
            <span className={styles.cartIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 5h2l2.2 10.2A2 2 0 0 0 9.2 17H18a2 2 0 0 0 1.94-1.5L21 8H7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="10" cy="20" r="1" fill="currentColor" />
                <circle cx="18" cy="20" r="1" fill="currentColor" />
              </svg>
            </span>
            <span aria-hidden="true">Cart</span>
            {cartItemCount > 0 && (
              <span className={styles.cartBadge} aria-hidden="true">
                {cartItemCount > 99 ? "99+" : cartItemCount}
              </span>
            )}
            <span className="sr-only" aria-live="polite" aria-atomic="true">
              {cartItemCount > 0
                ? `${cartItemCount} item${cartItemCount !== 1 ? "s" : ""} in cart`
                : ""}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
