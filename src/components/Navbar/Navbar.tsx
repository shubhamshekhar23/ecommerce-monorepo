// src/components/Navbar/Navbar.tsx
// Category navigation strip below header

import Link from 'next/link';
import styles from './Navbar.module.scss';

const CATEGORIES = [
  { id: 'all', label: '☰ All', href: '/products' },
  { id: 'deals', label: "Today's Deals", href: '/products?filter=deals' },
  { id: 'new', label: 'New Arrivals', href: '/products?sort=newest' },
  { id: 'bestsellers', label: 'Best Sellers', href: '/products?sort=popularity' },
  { id: 'gifts', label: 'Gift Cards', href: '/gifts' },
];

export function Navbar() {
  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        {CATEGORIES.map((category) => (
          <Link key={category.id} href={category.href} className={styles.link}>
            {category.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
