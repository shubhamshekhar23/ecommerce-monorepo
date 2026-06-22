"use client";

import type { Product } from "../../interfaces";
import { ProductCard } from "../ProductCard/ProductCard";
import { ProductSkeleton } from "../ProductSkeleton/ProductSkeleton";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import styles from "./ProductGrid.module.scss";

const ABOVE_FOLD_COUNT = 4;

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
  // Sentinel placed after the above-fold cards; once it enters the viewport
  // we render the remaining cards (avoids rendering off-screen React trees).
  const { ref: sentinelRef, isIntersecting: belowFoldVisible } =
    useIntersectionObserver<HTMLDivElement>({
      once: true,
      rootMargin: "200px",
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
        className={styles.grid}
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

  const aboveFold = products.slice(0, ABOVE_FOLD_COUNT);
  const belowFold = products.slice(ABOVE_FOLD_COUNT);

  return (
    <div className={styles.grid}>
      {aboveFold.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={index === 0}
          searchQuery={searchQuery}
        />
      ))}

      {belowFold.length > 0 && (
        <>
          {/* Sentinel: triggers render of below-fold cards when near viewport */}
          <div ref={sentinelRef} aria-hidden="true" />
          {belowFoldVisible &&
            belowFold.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={false}
                searchQuery={searchQuery}
              />
            ))}
        </>
      )}
    </div>
  );
}
