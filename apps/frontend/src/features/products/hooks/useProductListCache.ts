"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Product, CursorQueryParams } from "../interfaces";

const CACHE_KEY = "products-list-cache";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface ProductListCacheEntry {
  products: Product[];
  filters: Omit<CursorQueryParams, "cursor" | "limit">;
  timestamp: number;
}

function readCache(
  filters: ProductListCacheEntry["filters"],
): Product[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: ProductListCacheEntry = JSON.parse(raw);
    const isExpired = Date.now() - entry.timestamp > CACHE_TTL_MS;
    const filtersMatch =
      JSON.stringify(entry.filters) === JSON.stringify(filters);
    if (isExpired || !filtersMatch) return null;
    return entry.products;
  } catch {
    return null;
  }
}

function writeCache(
  products: Product[],
  filters: ProductListCacheEntry["filters"],
): void {
  try {
    const entry: ProductListCacheEntry = {
      products,
      filters,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // sessionStorage full or unavailable
  }
}

/**
 * Hydrates TanStack Query cache from sessionStorage on mount (instant back-navigation),
 * and writes the latest product list to sessionStorage whenever it changes.
 */
export function useProductListCache(
  products: Product[],
  isLoading: boolean,
  filters: Omit<CursorQueryParams, "cursor" | "limit">,
): void {
  const queryClient = useQueryClient();
  const hydratedRef = useRef(false);

  // Hydrate from sessionStorage on first render (before TanStack Query re-fetches)
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const cached = readCache(filters);
    if (!cached) return;

    // Pre-populate the first page of the cursor query so the list renders instantly
    queryClient.setQueryData(
      ["products", "cursor", filters],
      (old: unknown) => {
        if (old) return old; // already populated by TanStack Query
        return {
          pages: [
            {
              data: cached,
              meta: {
                nextCursor: undefined,
                hasMore: false,
                total: cached.length,
              },
            },
          ],
          pageParams: [undefined],
        };
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally only on mount

  // Write to sessionStorage when products load
  useEffect(() => {
    if (!isLoading && products.length > 0) {
      writeCache(products, filters);
    }
  }, [products, isLoading, filters]);
}
