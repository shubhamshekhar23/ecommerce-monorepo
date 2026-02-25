// src/features/admin/components/AdminCategoriesView/AdminCategoriesView.tsx

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAdminCategories, useDeleteCategory } from '../../hooks';
import styles from './AdminCategoriesView.module.scss';

export function AdminCategoriesView() {
  const { data, isLoading } = useAdminCategories();
  const { mutate: deleteCategory, isPending } = useDeleteCategory();
  const [showConfirmId, setShowConfirmId] = useState<string | null>(null);

  if (isLoading) {
    return <div className={styles.loading}>Loading categories...</div>;
  }

  const categories = data?.data || [];

  const handleDelete = (id: string): void => {
    deleteCategory(id, {
      onSettled: () => setShowConfirmId(null),
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Categories</h1>
        <Link href="/admin/categories/new" className={styles.addBtn}>
          + Add Category
        </Link>
      </div>

      {categories.length === 0 ? (
        <div className={styles.empty}>
          <p>No categories found. <Link href="/admin/categories/new">Create one</Link>.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Parent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td className={styles.name}>{category.name}</td>
                  <td>{category.slug}</td>
                  <td>{category.parentId ? '(sub)' : '—'}</td>
                  <td className={styles.actions}>
                    {showConfirmId === category.id ? (
                      <div className={styles.confirm}>
                        <span className={styles.confirmText}>Delete?</span>
                        <button
                          className={styles.confirmYes}
                          onClick={() => handleDelete(category.id)}
                          disabled={isPending}
                        >
                          {isPending ? '...' : 'Yes'}
                        </button>
                        <button
                          className={styles.confirmNo}
                          onClick={() => setShowConfirmId(null)}
                          disabled={isPending}
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className={styles.actionButtons}>
                        <Link href={`/admin/categories/${category.id}/edit`} className={styles.editBtn}>
                          Edit
                        </Link>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => setShowConfirmId(category.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
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
