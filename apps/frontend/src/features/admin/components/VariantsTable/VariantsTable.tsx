"use client";

import { useState } from "react";
import {
  useDeleteVariant,
  useUpdateVariantStock,
} from "../../hooks/useVariants";
import type { ProductVariant } from "@/features/products/interfaces";
import styles from "./VariantsTable.module.scss";

interface VariantsTableProps {
  productId: string;
  variants: ProductVariant[];
}

export function VariantsTable({ productId, variants }: VariantsTableProps) {
  const { mutate: deleteVariant, isPending: isDeleting } =
    useDeleteVariant(productId);
  const { mutate: updateStock, isPending: isUpdatingStock } =
    useUpdateVariantStock(productId);
  const [editingStock, setEditingStock] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!variants.length) {
    return (
      <p className={styles.empty}>
        No variants yet. Add a variant type above to generate combinations.
      </p>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Attributes</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((v) => {
            const attrLabel =
              v.attributeValues
                ?.map((a) => `${a.option.variantType.name}: ${a.option.value}`)
                .join(", ") ?? "—";

            return (
              <tr key={v.id}>
                <td className={styles.sku}>{v.sku}</td>
                <td>{attrLabel}</td>
                <td>${Number(v.price).toFixed(2)}</td>
                <td>
                  <div className={styles.stockCell}>
                    <input
                      type="number"
                      min={0}
                      value={editingStock[v.id] ?? String(v.stock)}
                      onChange={(e) =>
                        setEditingStock((prev) => ({
                          ...prev,
                          [v.id]: e.target.value,
                        }))
                      }
                      className={styles.stockInput}
                    />
                    {editingStock[v.id] !== undefined &&
                      editingStock[v.id] !== String(v.stock) && (
                        <button
                          className={styles.saveBtn}
                          disabled={isUpdatingStock}
                          onClick={() => {
                            const stock = parseInt(editingStock[v.id], 10);
                            if (!isNaN(stock)) {
                              updateStock(
                                { variantId: v.id, stock },
                                {
                                  onSuccess: () =>
                                    setEditingStock((prev) => {
                                      const next = { ...prev };
                                      delete next[v.id];
                                      return next;
                                    }),
                                },
                              );
                            }
                          }}
                        >
                          Save
                        </button>
                      )}
                  </div>
                </td>
                <td>
                  {confirmDeleteId === v.id ? (
                    <div className={styles.confirm}>
                      <span className={styles.confirmText}>Delete?</span>
                      <button
                        className={styles.confirmYes}
                        onClick={() =>
                          deleteVariant(v.id, {
                            onSettled: () => setConfirmDeleteId(null),
                          })
                        }
                        disabled={isDeleting}
                      >
                        Yes
                      </button>
                      <button
                        className={styles.confirmNo}
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      className={styles.deleteBtn}
                      onClick={() => setConfirmDeleteId(v.id)}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
