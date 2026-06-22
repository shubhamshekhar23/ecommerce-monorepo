import styles from "./CheckoutSkeleton.module.scss";

export function CheckoutSkeleton() {
  return (
    <div className={styles.container}>
      <div className={styles.form}>
        <div className={styles.sectionTitle} />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={styles.field} />
        ))}
        <div className={styles.sectionTitle} />
        <div className={styles.paymentBox} />
        <div className={styles.button} />
      </div>
      <div className={styles.summary}>
        <div className={styles.summaryTitle} />
        {[1, 2].map((i) => (
          <div key={i} className={styles.summaryRow} />
        ))}
        <div className={styles.summaryTotal} />
      </div>
    </div>
  );
}
