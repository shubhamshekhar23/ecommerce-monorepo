# 07 — Pagination

Enhancements to the existing pagination implementation. Cursor-based infinite scroll for products already works — these items close the remaining gaps.
Source: `pagination.md`

---

## Current State

- `/products` — cursor-based infinite scroll via `useProductsCursor` ✓
- `Pagination` component (offset-based) exists ✓
- Admin views — offset-based but no pagination at all currently

---

## Core Concepts from Notes

- **Offset pagination:** `page` + `pageSize`. Users can jump to any page, easy to implement, but slow on large datasets as offset grows.
- **Cursor pagination:** server returns `cursor` pointing to the last item. Client sends cursor to get the next batch. Consistent performance regardless of dataset size.
- **Dynamic loading count:** cursor pagination lets you vary how many items to fetch per call. Use this to fill the visible viewport exactly — fetch enough items to fill the screen, no more.

---

## Items to Implement

- [ ] **Dynamic loading count based on viewport height** — instead of a fixed `pageSize`, calculate how many product cards fit in the current viewport:
  ```ts
  const CARD_HEIGHT_APPROX = 320; // px
  const count = Math.ceil(window.innerHeight / CARD_HEIGHT_APPROX) * 2;
  ```
  Use this as the initial `limit` in `useProductsCursor`. For subsequent fetches, recalculate based on remaining viewport. The notes explicitly call this out as a benefit of cursor pagination.
  - Complexity: Medium
  - File: `src/features/products/hooks/useProductsCursor.ts`

- [ ] **Cursor-based pagination for Admin products list** — `AdminProductsView` currently fetches all products. As the catalog grows, this breaks. Add cursor-based pagination to:
  - `useAdminProducts.ts` — convert to infinite query
  - `AdminProductsView.tsx` — add "Load More" button or infinite scroll trigger
  - Complexity: Medium
  - Files: `src/features/admin/hooks/useAdminProducts.ts`, `AdminProductsView.tsx`

- [ ] **Cursor-based pagination for Admin orders list** — same as above for `useAdminOrders.ts` and `AdminOrdersView.tsx`.
  - Complexity: Medium
  - Files: `src/features/admin/hooks/useAdminOrders.ts`, `AdminOrdersView.tsx`

- [ ] **"Showing X–Y of Z" count in offset pagination** — the `Pagination` component and any offset-paginated view should surface the total count from the API response. Display "Showing 1–20 of 147 products" above the list. The API already returns `total` in its response — it just needs to be wired into the UI.
  - Complexity: Easy
  - File: `src/features/products/components/Pagination/Pagination.tsx` and any view using offset pagination
