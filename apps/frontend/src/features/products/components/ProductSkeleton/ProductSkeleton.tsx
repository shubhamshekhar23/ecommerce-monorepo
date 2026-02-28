// src/features/products/components/ProductSkeleton/ProductSkeleton.tsx

import styles from './ProductSkeleton.module.scss';

export function ProductSkeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.imageWrapper} />
      <div className={styles.content}>
        <div className={styles.name} />
        <div className={styles.price} />
        <div className={styles.stock} />
        <div className={styles.button} />
      </div>
    </div>
  );
}
