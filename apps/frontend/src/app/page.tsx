import Link from 'next/link';
import styles from './page.module.scss';

const FEATURED = [
  { title: 'Smart Home Essentials', href: '/products?category=smart-home' },
  { title: 'Everyday Tech', href: '/products?category=electronics' },
  { title: 'Wellness Picks', href: '/products?category=health' },
];

export default function HomePage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>New season collection</p>
          <h1>Shop premium essentials, minus the noise.</h1>
          <p className={styles.subtitle}>
            Discover curated products with transparent pricing and fast checkout.
          </p>
          <div className={styles.actions}>
            <Link href="/products" className={styles.primaryCta}>
              Explore products
            </Link>
            <Link href="/products?filter=deals" className={styles.secondaryCta}>
              View deals
            </Link>
          </div>
        </div>
        <div className={styles.heroPanel}>
          <p>Trusted by modern shoppers</p>
          <ul>
            <li>Fast delivery</li>
            <li>Secure checkout</li>
            <li>Flexible returns</li>
          </ul>
        </div>
      </section>

      <section className={styles.valueStrip}>
        <p>Free shipping over $50</p>
        <p>30-day return window</p>
        <p>24/7 customer support</p>
      </section>

      <section className={styles.featured}>
        <h2>Featured categories</h2>
        <div className={styles.cards}>
          {FEATURED.map((item) => (
            <Link key={item.title} href={item.href} className={styles.card}>
              <h3>{item.title}</h3>
              <span>Shop now</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
