"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAdminProducts, useDeleteProduct } from "../../hooks";
import { AdminTableSkeleton } from "../AdminTableSkeleton/AdminTableSkeleton";
import { AdminArchivedView } from "../AdminArchivedView/AdminArchivedView";
import { CsvImportModal } from "../CsvImportModal/CsvImportModal";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { useUrlState } from "@/hooks/useUrlState";
import styles from "./AdminProductsView.module.scss";

type ProductTab = "active" | "archived";

export function AdminProductsView() {
  const [isPending, startTransition] = useTransition();
  const [urlSearch, setUrlSearch] = useUrlState("search");
  const [localSearch, setLocalSearch] = useState(urlSearch ?? "");
  const [productTab, setProductTab] = useState<ProductTab>("active");
  const [showImportModal, setShowImportModal] = useState(false);
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAdminProducts(urlSearch || undefined);
  const { mutate: deleteProduct, isPending: isDeleting } = useDeleteProduct();
  const [showConfirmId, setShowConfirmId] = useState<string | null>(null);
  const deleteBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const products = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.meta.total ?? 0;

  const parentRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 5,
  });

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

  const handleDelete = (id: string): void => {
    deleteProduct(id, {
      onSettled: () => setShowConfirmId(null),
    });
  };

  const handleCancelDelete = (id: string): void => {
    setShowConfirmId(null);
    requestAnimationFrame(() => deleteBtnRefs.current[id]?.focus());
  };

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? totalSize - virtualItems[virtualItems.length - 1].end
      : 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Products</h1>
        <div className={styles.headerActions}>
          <button
            onClick={() => setShowImportModal(true)}
            className={styles.importBtn}
          >
            Import CSV
          </button>
          <Link href="/admin/products/new" className={styles.addBtn}>
            + Add Product
          </Link>
        </div>
      </div>

      <div className={styles.tabBar}>
        <button
          className={productTab === "active" ? styles.tabActive : styles.tab}
          onClick={() => setProductTab("active")}
        >
          Active
        </button>
        <button
          className={productTab === "archived" ? styles.tabActive : styles.tab}
          onClick={() => setProductTab("archived")}
        >
          Archived
        </button>
      </div>

      {productTab === "archived" && <AdminArchivedView />}

      {productTab === "active" && (
        <>
          <div className={styles.searchBar}>
            <input
              type="text"
              placeholder="Search products..."
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                startTransition(() => {
                  setUrlSearch(e.target.value || null);
                });
              }}
              className={styles.searchInput}
            />
          </div>

          {products.length === 0 ? (
            <EmptyState
              title="No products yet"
              description={
                urlSearch ? `No products match "${urlSearch}"` : undefined
              }
              action={
                !urlSearch
                  ? {
                      label: "Add your first product",
                      href: "/admin/products/new",
                    }
                  : undefined
              }
            />
          ) : (
            <>
              <div
                style={{
                  opacity: isPending ? 0.6 : 1,
                  transition: "opacity 200ms",
                }}
              >
                <div ref={parentRef} className={styles.tableWrapper}>
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
                      {paddingTop > 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            style={{ height: paddingTop, padding: 0 }}
                          />
                        </tr>
                      )}
                      {virtualItems.map((virtualRow) => {
                        const product = products[virtualRow.index];
                        return (
                          <tr key={product.id}>
                            <td className={styles.name}>{product.name}</td>
                            <td>${Number(product.price).toFixed(2)}</td>
                            <td>{product.stock}</td>
                            <td>{product.category?.name || "—"}</td>
                            <td className={styles.actions}>
                              {showConfirmId === product.id ? (
                                <div className={styles.confirm}>
                                  <span className={styles.confirmText}>
                                    Delete?
                                  </span>
                                  <button
                                    className={styles.confirmYes}
                                    onClick={() => handleDelete(product.id)}
                                    disabled={isDeleting}
                                    autoFocus
                                  >
                                    {isDeleting ? "..." : "Yes"}
                                  </button>
                                  <button
                                    className={styles.confirmNo}
                                    onClick={() =>
                                      handleCancelDelete(product.id)
                                    }
                                    disabled={isDeleting}
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <div className={styles.actionButtons}>
                                  <Link
                                    href={`/admin/products/${product.id}/edit`}
                                    className={styles.editBtn}
                                  >
                                    Edit
                                  </Link>
                                  <button
                                    ref={(el) => {
                                      deleteBtnRefs.current[product.id] = el;
                                    }}
                                    className={styles.deleteBtn}
                                    onClick={() => setShowConfirmId(product.id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {paddingBottom > 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            style={{ height: paddingBottom, padding: 0 }}
                          />
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={styles.footer}>
                <span className={styles.count}>
                  Showing {products.length} of {total} product
                  {total !== 1 ? "s" : ""}
                </span>

                {hasNextPage && (
                  <button
                    className={styles.loadMoreBtn}
                    onClick={() => void fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? "Loading…" : "Load More"}
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}

      {showImportModal && (
        <CsvImportModal onClose={() => setShowImportModal(false)} />
      )}
    </div>
  );
}
