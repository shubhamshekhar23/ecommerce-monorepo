# 30 — URL as State

Serialize UI state (filters, sort, pagination, search) into the URL. This makes views shareable, bookmarkable, and navigable with browser back/forward — without any additional state management.

---

## Current State

The products page currently handles `?search=` via `useSearchParams`. The pattern is correct but incomplete — category filter, sort order, and price range are not in the URL.

---

## Why URL State

- **Shareable:** user can copy the URL and send it to someone who sees the exact same filtered view
- **Bookmarkable:** "Electronics under $50, sorted by price" is a bookmarkable URL
- **Back/forward aware:** browser history works correctly — back takes you to the previous filter state
- **No extra state management needed:** the URL IS the state — no Zustand, no Context

---

## Items to Implement

- [ ] **Category filter in URL** — when user selects a category in `CategorySidebar`, push `?category=electronics` to the URL instead of keeping it in component state:
  ```ts
  const router = useRouter();
  const handleCategorySelect = (slug: string) => {
    router.push(`/products?category=${slug}`);
  };
  ```
  `ProductsView` reads `searchParams.get('category')` and passes it to the products query.
  - Complexity: Easy
  - Files: `CategorySidebar.tsx`, `ProductsView.tsx`, `useProducts.ts`

- [ ] **Sort order in URL** — when user changes sort (price asc/desc, newest, popularity), push `?sort=price_asc` to the URL:
  ```ts
  router.push(`/products?${new URLSearchParams({ ...currentParams, sort: value }).toString()}`);
  ```
  - Complexity: Easy

- [ ] **Price range filter in URL** — if a price range slider/input is added: `?minPrice=10&maxPrice=100`.
  - Complexity: Easy (when the filter UI exists)

- [ ] **Preserve existing params when adding new ones** — when adding a filter, do not wipe existing filters. Use `URLSearchParams` to merge:
  ```ts
  const params = new URLSearchParams(searchParams.toString());
  params.set('category', slug);
  params.delete('page'); // reset pagination when filter changes
  router.push(`/products?${params.toString()}`);
  ```
  - Complexity: Easy

- [ ] **`useUrlState` hook** — extract the pattern into a reusable hook to avoid repetition across filter controls:
  ```ts
  // src/hooks/useUrlState.ts
  function useUrlState<T extends string>(key: string): [T | null, (value: T | null) => void]
  ```
  Returns current value from URL and a setter that updates the URL. Replaces `useState` for filter state.
  - Complexity: Medium
  - File: `src/hooks/useUrlState.ts`

- [ ] **Restore page component to reflect URL state on mount** — when the user navigates back, the URL already has the filter params. The components must initialize from URL params, not from local state defaults. This is natural when using `useSearchParams` correctly — just verify every filter reads from the URL on mount.
  - Complexity: Easy (audit)

- [ ] **Clear all filters button** — with all filters in the URL, "clear all" is `router.push('/products')`. Add this button when any filter is active.
  - Complexity: Easy

- [ ] **Admin list views with URL state** — apply the same pattern to `/admin/products` (sort, filter by category, search), `/admin/orders` (filter by status, date range), and `/admin/users` (search). Admin views benefit from URL state for bookmarkable filtered admin workflows.
  - Complexity: Easy (once the pattern is established for the customer-facing products page)
