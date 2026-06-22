"use client";

import { useRef, useMemo, useState, useCallback } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import type { Product } from "../../interfaces";
import { ProductCard } from "../ProductCard/ProductCard";
import { ProductSkeleton } from "../ProductSkeleton/ProductSkeleton";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { useColumnCount } from "@/hooks/useColumnCount";
import styles from "./ProductGrid.module.scss";

// Estimated card height per column count (image aspect-ratio:1 + ~110px content).
// useWindowVirtualizer measures actual rendered rows and self-corrects after the first paint.
const ESTIMATED_ROW_HEIGHT: Record<number, number> = {
  1: 460,
  2: 380,
  3: 440,
  4: 360,
};

interface ProductGridProps {
  products?: Product[];
  isLoading: boolean;
  error?: Error | null;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; href?: string; onClick?: () => void };
  searchQuery?: string;
}

export function ProductGrid({
  products,
  isLoading,
  error,
  emptyTitle = "No products found",
  emptyDescription,
  emptyAction,
  searchQuery,
}: ProductGridProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const columns = useColumnCount();

  // Callback ref fires synchronously when the element mounts — not inside an effect —
  // so calling setScrollMargin here is safe and doesn't trigger the set-state-in-effect rule.
  // useWindowVirtualizer needs the distance from the top of the page to correctly
  // determine which rows are in the viewport.
  const setListRef = useCallback((node: HTMLDivElement | null) => {
    listRef.current = node;
    if (node) setScrollMargin(node.offsetTop);
  }, []);

  // Group flat product list into rows of `columns` items each.
  const rows = useMemo(() => {
    if (!products) return [];
    const result: Product[][] = [];
    for (let i = 0; i < products.length; i += columns) {
      result.push(products.slice(i, i + columns));
    }
    return result;
  }, [products, columns]);

  // useWindowVirtualizer attaches to the page scroll — no fixed-height container needed.
  const rowVirtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => ESTIMATED_ROW_HEIGHT[columns] ?? 400,
    overscan: 2,
    scrollMargin,
  });

  if (error) {
    return (
      <div className={styles.error} role="alert">
        <p>Failed to load products. Please try again.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className={styles.skeletonGrid}
        role="status"
        aria-busy="true"
        aria-label="Loading products"
      >
        {Array(8)
          .fill(0)
          .map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div ref={setListRef}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
              }}
              className={styles.row}
            >
              {row.map((product, colIndex) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  priority={virtualRow.index === 0 && colIndex === 0}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
