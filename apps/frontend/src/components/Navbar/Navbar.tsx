import Link from 'next/link';
import styles from './Navbar.module.scss';

const CATEGORIES = [
  { id: 'all', label: 'All Products', href: '/products' },
  { id: 'deals', label: 'Deals', href: '/products?filter=deals' },
  { id: 'new', label: 'New In', href: '/products?sort=newest' },
  { id: 'bestsellers', label: 'Best Sellers', href: '/products?sort=popularity' },
  { id: 'gifts', label: 'Gift Cards', href: '/gifts' },
];

export function Navbar() {
  return (
    <nav className={styles.navbar} aria-label="Store categories">
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
