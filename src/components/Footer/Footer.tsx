'use client';

import Link from 'next/link';
import styles from './Footer.module.scss';

const FOOTER_LINKS = {
  shop: [
    { label: 'Browse Products', href: '/products' },
    { label: 'Today\'s Deals', href: '/deals' },
    { label: 'New Arrivals', href: '/new' },
  ],
  account: [
    { label: 'Your Orders', href: '/orders' },
    { label: 'Your Cart', href: '/cart' },
    { label: 'Sign In', href: '/login' },
  ],
  support: [
    { label: 'Help Center', href: '/help' },
    { label: 'Shipping Info', href: '/shipping' },
    { label: 'Contact Us', href: '/contact' },
  ],
};

export function Footer() {
  const handleScrollToTop = (): void => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className={styles.footer}>
      <button className={styles.backToTop} onClick={handleScrollToTop}>
        Back to top
      </button>

      <div className={styles.content}>
        <div className={styles.brandColumn}>
          <p className={styles.brand}>ShopHub</p>
          <p className={styles.tagline}>Elevated shopping for every day essentials and standout finds.</p>
        </div>

        <div className={styles.linksGrid}>
          {Object.entries(FOOTER_LINKS).map(([key, links]) => (
            <div key={key} className={styles.column}>
              <h4 className={styles.heading}>{key}</h4>
              <ul className={styles.list}>
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={styles.link}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.copyright}>
        <p>© {new Date().getFullYear()} ShopHub. All rights reserved.</p>
      </div>
    </footer>
  );
}
