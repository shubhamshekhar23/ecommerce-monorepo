"use client";

import Link from "next/link";
import {
  usePromotionRules,
  useUpdatePromotionRule,
  useDeletePromotionRule,
} from "@/features/admin";
import { AdminTableSkeleton } from "@/features/admin";
import styles from "./PromotionRulesPage.module.scss";

export function PromotionRulesPage() {
  const { data: rules, isLoading } = usePromotionRules();
  const { mutate: update, isPending: isUpdating } = useUpdatePromotionRule();
  const { mutate: remove, isPending: isRemoving } = useDeletePromotionRule();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Promotion Rules</h1>
        <Link href="/admin/promotion-rules/new" className={styles.addBtn}>
          + New Rule
        </Link>
      </div>

      {isLoading && <AdminTableSkeleton rows={4} columns={5} />}

      {!isLoading && !rules?.length && (
        <p className={styles.empty}>
          No promotion rules yet. Create one to start applying automatic
          discounts.
        </p>
      )}

      {!isLoading && !!rules?.length && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Priority</th>
                <th>Active</th>
                <th>Stackable</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td>
                    <div className={styles.ruleName}>{rule.name}</div>
                    {rule.description && (
                      <div className={styles.ruleDesc}>{rule.description}</div>
                    )}
                  </td>
                  <td>{rule.priority}</td>
                  <td>
                    <button
                      className={
                        rule.active ? styles.toggleOn : styles.toggleOff
                      }
                      onClick={() =>
                        update({
                          id: rule.id,
                          payload: { active: !rule.active },
                        })
                      }
                      disabled={isUpdating}
                    >
                      {rule.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td>{rule.stackable ? "Yes" : "No"}</td>
                  <td className={styles.actions}>
                    <Link
                      href={`/admin/promotion-rules/${rule.id}/edit`}
                      className={styles.editBtn}
                    >
                      Edit
                    </Link>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => remove(rule.id)}
                      disabled={isRemoving}
                    >
                      Deactivate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
