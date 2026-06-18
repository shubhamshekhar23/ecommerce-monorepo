import styles from './OrderSkeleton.module.scss';

export function OrderSkeleton() {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.orderId} />
        <div className={styles.status} />
      </div>
      <div className={styles.meta}>
        <div className={styles.date} />
        <div className={styles.price} />
      </div>
      <div className={styles.items}>
        <div className={styles.item} />
        <div className={styles.item} />
      </div>
    </div>
  );
}
