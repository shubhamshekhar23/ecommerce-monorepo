'use client';

import { useQuery } from '@tanstack/react-query';
import { searchProductsApi } from '../api/products.api';
import type { CursorPageProducts } from '../interfaces';

// Full-text search against GET /products/search?q=<term>.
// Unlike the old ILIKE search, results are ranked by relevance (ts_rank).
// Only fires when term is a non-empty string — safe to call with undefined/empty.
export function useProductSearch(term: string | undefined): {
  data: CursorPageProducts | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  return useQuery({
    queryKey: ['products', 'search', term],
    queryFn: () => searchProductsApi(term!),
    enabled: typeof term === 'string' && term.trim().length > 0,
    staleTime: 30_000, // search results are stable for 30s
  });
}
