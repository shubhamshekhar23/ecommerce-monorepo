"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getProductsCursorApi } from "../api/products.api";

const LIMIT = 20;

// Infinite-scroll / "Load More" hook backed by cursor pagination.
// Each page fetches via GET /products/cursor?cursor=<token>&limit=20.
// The cursor is an opaque base64 token — never parse it on the client.
// TanStack Query accumulates pages: data.pages[0], data.pages[1], …
// Flatten with pages.flatMap(p => p.data) to get a single product list.
export function useProductsCursor(enabled = true) {
  return useInfiniteQuery({
    queryKey: ["products", "cursor"],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      getProductsCursorApi({ cursor: pageParam, limit: LIMIT }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
    staleTime: 2 * 60 * 1000, // cursor pages are stable once fetched — 2 min is fine
    enabled,
  });
}
