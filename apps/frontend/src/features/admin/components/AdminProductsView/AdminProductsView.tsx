"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAdminProducts, useDeleteProduct } from "../../hooks";
import { AdminArchivedView } from "../AdminArchivedView/AdminArchivedView";
import { AdminTableSkeleton } from "../AdminTableSkeleton/AdminTableSkeleton";
import { CsvImportModal } from "../CsvImportModal/CsvImportModal";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { useCategories } from "@/features/products/hooks";
import { useUrlState } from "@/hooks/useUrlState";
import type { Product } from "@/features/products/interfaces";
import styles from "./AdminProductsView.module.scss";

type ProductTab = "active" | "archived";
type SortOption = "newest" | "oldest" | "price-high" | "price-low";
type StockStatus = "all" | "in-stock" | "low-stock" | "out-of-stock";

function stockStatus(stock: number): Exclude<StockStatus, "all"> {
  if (stock === 0) return "out-of-stock";
  if (stock <= 10) return "low-stock";
  return "in-stock";
}

function stockLabel(stock: number): string {
  if (stock === 0) return "Out of Stock";
  if (stock <= 10) return "Low Stock";
  return "In Stock";
}

function stockNumClass(stock: number): string {
  if (stock === 0) return styles.numRed;
  if (stock <= 10) return styles.numOrange;
  return styles.numGreen;
}

function badgeClass(stock: number): string {
  if (stock === 0) return styles.badgeRed;
  if (stock <= 10) return styles.badgeOrange;
  return styles.badgeGreen;
}

function matchesStatus(stock: number, filter: StockStatus): boolean {
  if (filter === "all") return true;
  return stockStatus(stock) === filter;
}

export function AdminProductsView() {
  const [isPending, startTransition] = useTransition();
  const [urlSearch, setUrlSearch] = useUrlState("search");
  const [localSearch, setLocalSearch] = useState(urlSearch ?? "");
  const [productTab, setProductTab] = useState<ProductTab>("active");
  const [showImportModal, setShowImportModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StockStatus>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showConfirmId, setShowConfirmId] = useState<string | null>(null);
  const deleteBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAdminProducts(urlSearch || undefined);
  const { data: categoriesData } = useCategories();
  const { mutate: deleteProduct, isPending: isDeleting } = useDeleteProduct();

  const total = data?.pages[0]?.meta.total ?? 0;
  const categories = categoriesData?.data ?? [];

  const filteredProducts = useMemo((): Product[] => {
    const allProducts = data?.pages.flatMap((p) => p.data) ?? [];
    let result = allProducts;

    if (categoryFilter) {
      result = result.filter(
        (p) => (p.categoryName ?? p.category?.name) === categoryFilter,
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((p) => matchesStatus(p.stock, statusFilter));
    }

    return [...result].sort((a, b) => {
      if (sortBy === "oldest") return a.createdAt.localeCompare(b.createdAt);
      if (sortBy === "price-high") return b.price - a.price;
      if (sortBy === "price-low") return a.price - b.price;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [data, categoryFilter, statusFilter, sortBy]);

  const parentRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: filteredProducts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 68,
    overscan: 5,
  });

  const handleDelete = (id: string): void => {
    deleteProduct(id, { onSettled: () => setShowConfirmId(null) });
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

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.title}>Products</h1>
        </div>
        <AdminTableSkeleton rows={8} columns={7} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Products</h1>
        <div className={styles.headerActions}>
          <button
            onClick={() => setShowImportModal(true)}
            className={styles.importBtn}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M7 1v8M4 6l3 3 3-3M2 11h10"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Import CSV
          </button>
          <Link href="/admin/products/new" className={styles.addBtn}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 1v10M1 6h10"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            Add Product
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${productTab === "active" ? styles.tabActive : ""}`}
          onClick={() => setProductTab("active")}
        >
          Active
        </button>
        <button
          className={`${styles.tab} ${productTab === "archived" ? styles.tabActive : ""}`}
          onClick={() => setProductTab("archived")}
        >
          Archived
        </button>
      </div>

      {productTab === "archived" && <AdminArchivedView />}

      {productTab === "active" && (
        <>
          {/* Filter bar */}
          <div className={styles.filterBar}>
            <div className={styles.filterLeft}>
              <div className={styles.searchWrap}>
                <svg
                  className={styles.searchIcon}
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="6"
                    cy="6"
                    r="4.5"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                  <path
                    d="M9.5 9.5L13 13"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>
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

              <select
                className={styles.filterSelect}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StockStatus)}
              >
                <option value="all">All Statuses</option>
                <option value="in-stock">In Stock</option>
                <option value="low-stock">Low Stock</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>

              <button className={styles.filtersBtn}>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 13 13"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M1 2.5h11M3 6.5h7M5 10.5h3"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                Filters
              </button>
            </div>

            <div className={styles.filterRight}>
              <span className={styles.productCount}>
                {filteredProducts.length} products
              </span>
              <select
                className={styles.sortSelect}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <option value="newest">Sort by: Newest</option>
                <option value="oldest">Sort by: Oldest</option>
                <option value="price-high">Sort by: Price (High)</option>
                <option value="price-low">Sort by: Price (Low)</option>
              </select>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <EmptyState
              title="No products found"
              description={
                urlSearch || categoryFilter || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : undefined
              }
              action={
                !urlSearch && !categoryFilter && statusFilter === "all"
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
                        <th>PRODUCT</th>
                        <th>CATEGORY</th>
                        <th>PRICE</th>
                        <th>STOCK</th>
                        <th>STATUS</th>
                        <th>UPDATED</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paddingTop > 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            style={{ height: paddingTop, padding: 0 }}
                          />
                        </tr>
                      )}
                      {virtualItems.map((virtualRow) => {
                        const product = filteredProducts[virtualRow.index];
                        const mainImage =
                          product.images.find((i) => i.isMain)?.url ??
                          product.images[0]?.url;
                        return (
                          <tr key={product.id}>
                            <td>
                              <div className={styles.productCell}>
                                <div className={styles.thumb}>
                                  {mainImage ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={mainImage}
                                      alt={product.name}
                                      className={styles.thumbImg}
                                    />
                                  ) : (
                                    <div className={styles.thumbPlaceholder}>
                                      <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 16 16"
                                        fill="none"
                                        aria-hidden="true"
                                      >
                                        <rect
                                          x="2"
                                          y="2"
                                          width="12"
                                          height="12"
                                          rx="2"
                                          stroke="currentColor"
                                          strokeWidth="1.2"
                                        />
                                        <circle
                                          cx="5.5"
                                          cy="5.5"
                                          r="1"
                                          fill="currentColor"
                                        />
                                        <path
                                          d="M2 11l3.5-3.5 2.5 2.5 2-2L14 11"
                                          stroke="currentColor"
                                          strokeWidth="1.2"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                <span className={styles.productName}>
                                  {product.name}
                                </span>
                              </div>
                            </td>
                            <td className={styles.muted}>
                              {product.categoryName ??
                                product.category?.name ??
                                "—"}
                            </td>
                            <td className={styles.price}>
                              ${product.price.toFixed(2)}
                            </td>
                            <td>
                              <span
                                className={`${styles.stockNum} ${stockNumClass(product.stock)}`}
                              >
                                {product.stock}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`${styles.badge} ${badgeClass(product.stock)}`}
                              >
                                {stockLabel(product.stock)}
                              </span>
                            </td>
                            <td className={styles.muted}>
                              {new Date(product.updatedAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </td>
                            <td>
                              {showConfirmId === product.id ? (
                                <div className={styles.confirmRow}>
                                  <span className={styles.confirmText}>
                                    Delete?
                                  </span>
                                  <button
                                    className={styles.confirmYes}
                                    onClick={() => handleDelete(product.id)}
                                    disabled={isDeleting}
                                    autoFocus
                                  >
                                    {isDeleting ? "…" : "Yes"}
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
                                <div className={styles.actionBtns}>
                                  <Link
                                    href={`/admin/products/${product.id}/edit`}
                                    className={styles.iconBtn}
                                    title="Edit"
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 14 14"
                                      fill="none"
                                      aria-hidden="true"
                                    >
                                      <path
                                        d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z"
                                        stroke="currentColor"
                                        strokeWidth="1.3"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </Link>
                                  <button
                                    ref={(el) => {
                                      deleteBtnRefs.current[product.id] = el;
                                    }}
                                    className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                                    onClick={() => setShowConfirmId(product.id)}
                                    title="Delete"
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 14 14"
                                      fill="none"
                                      aria-hidden="true"
                                    >
                                      <path
                                        d="M2 3.5h10M5 3.5V2.5h4v1M5.5 6v4.5M8.5 6v4.5M3.5 3.5l.5 8h6l.5-8"
                                        stroke="currentColor"
                                        strokeWidth="1.3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
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
                            colSpan={7}
                            style={{ height: paddingBottom, padding: 0 }}
                          />
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={styles.tableFooter}>
                <span className={styles.countText}>
                  Showing {filteredProducts.length} of {total} product
                  {total !== 1 ? "s" : ""}
                </span>
                {hasNextPage && (
                  <button
                    className={styles.loadMoreBtn}
                    onClick={() => void fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? "Loading…" : "Load more"}
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
