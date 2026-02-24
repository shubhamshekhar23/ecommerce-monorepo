// src/components/Header/Header.tsx
// Amazon-like header with logo, search, and account/cart links

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/features/auth/hooks';
import { useCart } from '@/features/cart/hooks';
import styles from './Header.module.scss';

export function Header() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const user = useAuthStore((state) => state.user);
  const { mutate: logout } = useLogout();
  const { data: cart } = useCart();
  const cartItemCount = cart?.itemCount ?? 0;

  const handleSearch = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchInput)}`);
      setSearchInput('');
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <span className={styles.logoText}>ShopHub</span>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search products..."
            className={styles.searchInput}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className={styles.searchBtn}>
            🔍
          </button>
        </form>

        {/* Account & Cart Links */}
        <div className={styles.nav}>
          {user?.role === 'ADMIN' && (
            <div className={styles.navItem}>
              <span className={styles.subtext}>Manage</span>
              <Link href="/admin" className={styles.navLink}>
                Admin
              </Link>
            </div>
          )}

          <div className={styles.navItem}>
            {user ? (
              <>
                <span className={styles.greeting}>Hello, {user.firstName}</span>
                <button onClick={() => logout()} className={styles.signoutLink}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <span className={styles.greeting}>Hello, sign in</span>
                <Link href="/login" className={styles.navLink}>
                  Sign in
                </Link>
              </>
            )}
          </div>

          <div className={styles.navItem}>
            <span className={styles.subtext}>Returns</span>
            <Link href="/orders" className={styles.navLink}>
              Orders
            </Link>
          </div>

          <div className={styles.navItem}>
            <span className={styles.cartIcon}>🛒</span>
            <Link href="/cart" className={styles.navLink}>
              Cart
              {cartItemCount > 0 && (
                <span className={styles.cartBadge}>
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
