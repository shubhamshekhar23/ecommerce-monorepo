"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { useLogout } from "@/features/auth/hooks";
import { useCart } from "@/features/cart/hooks";
import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle";
import styles from "./Header.module.scss";

export function HeaderActions() {
  const user = useAuthStore((state) => state.user);
  const { mutate: logout } = useLogout();
  const { data: cart } = useCart();
  const cartItemCount = cart?.itemCount ?? 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <div className={styles.actions}>
      {user ? (
        <div className={styles.userMenu} ref={menuRef}>
          <button
            className={styles.userMenuTrigger}
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            Hello, {user.firstName}
            <svg
              className={`${styles.chevron} ${menuOpen ? styles.chevronOpen : ""}`}
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {menuOpen && (
            <div className={styles.userMenuPanel} role="menu">
              <Link
                href="/account/profile"
                className={styles.userMenuLink}
                role="menuitem"
                onClick={close}
              >
                My Account
              </Link>
              <Link
                href="/orders"
                className={styles.userMenuLink}
                role="menuitem"
                onClick={close}
              >
                Orders
              </Link>
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className={styles.userMenuLink}
                  role="menuitem"
                  onClick={close}
                >
                  Admin Dashboard
                </Link>
              )}
              <div className={styles.userMenuDivider} />
              <button
                className={styles.userMenuSignout}
                role="menuitem"
                onClick={() => {
                  logout();
                  close();
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.account}>
          <span className={styles.greeting}>Welcome back</span>
          <Link href="/login" className={styles.signinLink}>
            Sign in
          </Link>
        </div>
      )}

      <span className={styles.divider} aria-hidden="true" />

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

      <ThemeToggle />
    </div>
  );
}
