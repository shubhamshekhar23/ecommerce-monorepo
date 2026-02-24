// src/features/admin/components/AdminNav/AdminNav.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminNav.module.scss';

export function AdminNav() {
  const pathname = usePathname();

  const isActive = (path: string): boolean => {
    if (path === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(path);
  };

  const navItems = [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Products', href: '/admin/products' },
    { label: 'Categories', href: '/admin/categories' },
    { label: 'Orders', href: '/admin/orders' },
    { label: 'Users', href: '/admin/users' },
  ];

  return (
    <nav className={styles.nav}>
      <div className={styles.header}>
        <Link href="/" className={styles.logo}>
          ShopHub Admin
        </Link>
      </div>

      <div className={styles.menu}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.link} ${isActive(item.href) ? styles.active : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className={styles.footer}>
        <Link href="/" className={styles.storeLink}>
          ← Back to Store
        </Link>
      </div>
    </nav>
  );
}
