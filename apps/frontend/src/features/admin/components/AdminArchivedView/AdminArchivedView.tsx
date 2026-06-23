"use client";

import {
  useArchivedProducts,
  useRestoreProduct,
  usePurgeProduct,
} from "../../hooks/useArchivedProducts";
import { AdminTableSkeleton } from "../AdminTableSkeleton/AdminTableSkeleton";
import styles from "./AdminArchivedView.module.scss";

export function AdminArchivedView() {
  const { data: products, isLoading } = useArchivedProducts();
  const { mutate: restore, isPending: isRestoring } = useRestoreProduct();
  const { mutate: purge, isPending: isPurging } = usePurgeProduct();

  if (isLoading) return <AdminTableSkeleton rows={4} columns={3} />;
  if (!products?.length)
    return <p className={styles.empty}>No archived products.</p>;

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Price</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>${Number(p.price).toFixed(2)}</td>
              <td className={styles.actions}>
                <button
                  className={styles.restoreBtn}
                  onClick={() => restore(p.id)}
                  disabled={isRestoring}
                >
                  Restore
                </button>
                <button
                  className={styles.purgeBtn}
                  onClick={() => purge(p.id)}
                  disabled={isPurging}
                >
                  Purge
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
