// src/components/Footer/Footer.tsx
// Amazon-like footer with links and back-to-top

'use client';

import Link from 'next/link';
import { useState } from 'react';
import styles from './Footer.module.scss';

const FOOTER_LINKS = {
  shop: [
    { label: 'Browse All Products', href: '/products' },
    { label: 'Today\'s Deals', href: '/deals' },
    { label: 'Bestsellers', href: '/bestsellers' },
    { label: 'New Arrivals', href: '/new' },
  ],
  account: [
    { label: 'Your Account', href: '/account' },
    { label: 'Your Orders', href: '/orders' },
    { label: 'Saved Items', href: '/saved' },
    { label: 'Gift Cards', href: '/gifts' },
  ],
  help: [
    { label: 'Help Center', href: '/help' },
    { label: 'Contact Us', href: '/contact' },
    { label: 'Shipping Info', href: '/shipping' },
    { label: 'FAQ', href: '/faq' },
  ],
  company: [
    { label: 'About Us', href: '/about' },
    { label: 'Careers', href: '/careers' },
    { label: 'Press', href: '/press' },
    { label: 'Blog', href: '/blog' },
  ],
};

export function Footer() {
  const [scrolled, setScrolled] = useState(false);

  const handleScrollToTop = (): void => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className={styles.footer}>
      {/* Back to Top */}
      <button className={styles.backToTop} onClick={handleScrollToTop}>
        Back to top
      </button>

      {/* Footer Content */}
      <div className={styles.content}>
        <div className={styles.container}>
          {/* Link Columns */}
          {Object.entries(FOOTER_LINKS).map(([key, links]) => (
            <div key={key} className={styles.column}>
              <h4 className={styles.heading}>{capitalize(key)}</h4>
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

      {/* Copyright */}
      <div className={styles.copyright}>
        <p className={styles.copyrightText}>
          &copy; {new Date().getFullYear()} ShopHub. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
