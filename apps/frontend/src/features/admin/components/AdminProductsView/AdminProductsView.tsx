'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAdminProducts, useDeleteProduct } from '../../hooks';
import { AdminTableSkeleton } from '../AdminTableSkeleton/AdminTableSkeleton';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import styles from './AdminProductsView.module.scss';

interface AdminProductsViewProps {
  page?: number;
}

export function AdminProductsView({ page = 1 }: AdminProductsViewProps) {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useAdminProducts(page, search || undefined);
  const { mutate: deleteProduct, isPending } = useDeleteProduct();
  const [showConfirmId, setShowConfirmId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Products</h1>
        </div>
        <AdminTableSkeleton rows={8} columns={5} />
      </div>
    );
  }

  const products = data?.data || [];
  const meta = data?.meta;

  const handleDelete = (id: string): void => {
    deleteProduct(id, {
      onSettled: () => setShowConfirmId(null),
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Products</h1>
        <Link href="/admin/products/new" className={styles.addBtn}>
          + Add Product
        </Link>
      </div>

      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description={search ? `No products match "${search}"` : undefined}
          action={!search ? { label: 'Add your first product', href: '/admin/products/new' } : undefined}
        />
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Category</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className={styles.name}>{product.name}</td>
                    <td>${Number(product.price).toFixed(2)}</td>
                    <td>{product.stock}</td>
                    <td>{product.category?.name || '—'}</td>
                    <td className={styles.actions}>
                      {showConfirmId === product.id ? (
                        <div className={styles.confirm}>
                          <span className={styles.confirmText}>Delete?</span>
                          <button
                            className={styles.confirmYes}
                            onClick={() => handleDelete(product.id)}
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
                          <Link href={`/admin/products/${product.id}/edit`} className={styles.editBtn}>
                            Edit
                          </Link>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => setShowConfirmId(product.id)}
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

          {meta && meta.pages > 1 && (
            <div className={styles.pagination}>
              <span>
                Page {meta.page} of {meta.pages}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
