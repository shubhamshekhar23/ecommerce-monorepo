import styles from './page.module.scss';

export default function HomePage() {
  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Welcome to ShopHub</h1>
        <p className={styles.subtitle}>Discover amazing products at unbeatable prices</p>
        <a href="/products" className={styles.cta}>
          Start Shopping
        </a>
      </div>
    </div>
  );
}
