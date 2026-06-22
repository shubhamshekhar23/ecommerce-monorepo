import styles from "./AdminTableSkeleton.module.scss";

interface AdminTableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function AdminTableSkeleton({
  rows = 8,
  columns = 5,
}: AdminTableSkeletonProps) {
  return (
    <div className={styles.table} role="status" aria-label="Loading...">
      <div className={styles.header}>
        {Array(columns)
          .fill(0)
          .map((_, i) => (
            <div key={i} className={styles.headerCell} />
          ))}
      </div>
      {Array(rows)
        .fill(0)
        .map((_, i) => (
          <div key={i} className={styles.row}>
            {Array(columns)
              .fill(0)
              .map((_, j) => (
                <div key={j} className={styles.cell} />
              ))}
          </div>
        ))}
    </div>
  );
}
