import styles from './CartSkeleton.module.scss';

export function CartSkeleton() {
  return (
    <div className={styles.container}>
      <div className={styles.itemsSection}>
        <div className={styles.title} />
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.row}>
            <div className={styles.image} />
            <div className={styles.details}>
              <div className={styles.name} />
              <div className={styles.price} />
              <div className={styles.stepper} />
            </div>
          </div>
        ))}
      </div>
      <div className={styles.summary} />
    </div>
  );
}
