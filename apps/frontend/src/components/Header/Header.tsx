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
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark}>S</span>
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>ShopHub</span>
            <span className={styles.brandSub}>Curated everyday commerce</span>
          </div>
        </Link>

        <form onSubmit={handleSearch} className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search products, brands, categories"
            className={styles.searchInput}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search products"
          />
          <button type="submit" className={styles.searchBtn} aria-label="Search">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z" stroke="currentColor" strokeWidth="2" />
              <path d="m20 20-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </form>

        <div className={styles.actions}>
          {user?.role === 'ADMIN' && (
            <Link href="/admin" className={styles.adminLink}>
              Admin
            </Link>
          )}

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

          <Link href="/orders" className={styles.ordersLink}>
            Orders
          </Link>

          <Link href="/cart" className={styles.cartLink}>
            <span className={styles.cartIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M3 5h2l2.2 10.2A2 2 0 0 0 9.2 17H18a2 2 0 0 0 1.94-1.5L21 8H7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="10" cy="20" r="1" fill="currentColor" />
                <circle cx="18" cy="20" r="1" fill="currentColor" />
              </svg>
            </span>
            <span>Cart</span>
            {cartItemCount > 0 && (
              <span className={styles.cartBadge}>{cartItemCount > 99 ? '99+' : cartItemCount}</span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
