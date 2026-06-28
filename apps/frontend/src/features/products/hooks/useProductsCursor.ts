"use client";

import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getProductsCursorApi } from "../api/products.api";
import type { CursorQueryParams } from "../interfaces";
import { normalizeProduct } from "../utils/product.normalize";

const FALLBACK_LIMIT = 20;
const CARD_HEIGHT_PX = 320;

function computeInitialLimit(): number {
  if (typeof window === "undefined") return FALLBACK_LIMIT;
  return Math.max(
    FALLBACK_LIMIT,
    Math.ceil(window.innerHeight / CARD_HEIGHT_PX) * 2,
  );
}

type FilterParams = Omit<CursorQueryParams, "cursor" | "limit">;

// Infinite-scroll / "Load More" hook backed by cursor pagination.
// Initial limit fills the visible viewport (2 rows of cards) so the first
// render has no empty space below the fold. Subsequent pages keep the same limit.
export function useProductsCursor(enabled = true, filters: FilterParams = {}) {
  const limit = useMemo(() => computeInitialLimit(), []);

  return useInfiniteQuery({
    queryKey: ["products", "cursor", filters],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      getProductsCursorApi({ cursor: pageParam, limit, ...filters }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
    staleTime: 2 * 60 * 1000,
    enabled,
    select: (data) => ({
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        data: page.data.map(normalizeProduct),
      })),
    }),
  });
}
