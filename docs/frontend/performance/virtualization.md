# 28 — Virtualization

Rendering hundreds or thousands of DOM nodes tanks scroll performance. Virtualization renders only the items currently in the viewport — the rest are recycled off-screen.

---

## When to Virtualize

Virtualization adds complexity. Only use it when the list is genuinely large:

- Admin products list: can grow to thousands of items
- Order history: users with many orders
- Search results: large uncapped result sets
- Any list exceeding ~100–200 items

The `/products` page uses cursor-based infinite scroll with a "Load More" button, which naturally limits DOM size. Virtualization matters most for the admin views.

---

## Items to Implement

- [x] **Install `@tanstack/react-virtual`** — the same TanStack ecosystem the app already uses. Lightweight, zero dependencies, works with any scroll container.
  ```
  npm install @tanstack/react-virtual
  ```
  - Complexity: Easy (install)

- [x] **Virtualize `AdminProductsView`** — the admin product table can grow unbounded. Replace the direct `.map()` render with a virtualized list:
  ```tsx
  import { useVirtualizer } from '@tanstack/react-virtual';

  const rowVirtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // estimated row height in px
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div key={virtualRow.index}
            style={{ position: 'absolute', top: virtualRow.start, width: '100%' }}>
            <AdminProductRow product={products[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
  ```
  - Complexity: Medium
  - File: `src/features/admin/components/AdminProductsView/AdminProductsView.tsx`

- [x] **Virtualize `AdminOrdersView`** — same pattern for orders table.
  - Complexity: Medium
  - File: `src/features/admin/components/AdminOrdersView/AdminOrdersView.tsx`

- [x] **Virtualize `AdminUsersView`** — same pattern for users table.
  - Complexity: Medium
  - File: `src/features/admin/components/AdminUsersView/AdminUsersView.tsx`

- [ ] **Grid virtualization for product listing (if needed)** — the `/products` page uses Load More (not infinite list rendering), so virtualization is lower priority here. If the cursor pagination loads a very large number of pages without a hard limit, consider `useVirtualizer` for the grid. Measure first with Lighthouse before implementing.
  - Complexity: Complex (grid virtualization is harder than list — items have variable heights and a multi-column layout)
  - Planned in V3 (Phase 4) — implement only after measuring: confirm scroll jank with Lighthouse before writing the virtualizer

- [ ] **`react-window` as alternative** — if `@tanstack/react-virtual` doesn't fit a use case, `react-window` is the established alternative. It provides `FixedSizeList` and `VariableSizeList` components with a simpler API for fixed-height items.
  - Document: use `@tanstack/react-virtual` by default; reach for `react-window` for fixed-height list scenarios where performance is paramount.
  - Complexity: Easy (document the choice)
