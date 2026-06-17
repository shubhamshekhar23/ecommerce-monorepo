# 33 — Empty States & Loading Strategy

Two complementary UX concerns: what to show when there's nothing, and which loading UI to use when something is being fetched.

---

## Part 1: Empty States

Blank screens feel broken. Every list view needs a designed empty state with a clear message and a call to action.

### Items to Implement

- [ ] **Empty cart** — when `/cart` has no items:
  - Message: "Your cart is empty"
  - CTA: "Browse products" → links to `/products`
  - Illustration: optional (cart icon, shopping bag)
  - File: `src/features/cart/components/CartView/CartView.tsx`

- [ ] **No orders** — when `/orders` returns an empty list:
  - Message: "You haven't placed any orders yet"
  - CTA: "Start shopping" → links to `/products`
  - File: `src/features/orders/components/OrdersView/OrdersView.tsx`

- [ ] **No search results** — covered in `32-search-optimization.md` but should use the same shared `EmptyState` component.

- [ ] **No products in category** — when a category filter returns 0 products:
  - Message: "No products in this category"
  - CTA: "Clear filter" → removes the category param from URL
  - File: `src/features/products/components/ProductGrid/ProductGrid.tsx`

- [ ] **Admin: no products** — when the admin product list is empty (fresh setup):
  - Message: "No products yet"
  - CTA: "Add your first product" → links to `/admin/products/new`
  - File: `src/features/admin/components/AdminProductsView/AdminProductsView.tsx`

- [ ] **Admin: no orders** — when no orders exist:
  - Message: "No orders yet"
  - CTA: none (orders are created by customers)
  - File: `src/features/admin/components/AdminOrdersView/AdminOrdersView.tsx`

- [ ] **Shared `EmptyState` component** — instead of each view implementing its own empty state, create one reusable component:
  ```tsx
  // src/components/EmptyState/EmptyState.tsx
  interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: { label: string; href?: string; onClick?: () => void };
  }
  ```
  - Complexity: Easy
  - File: `src/components/EmptyState/EmptyState.tsx`

---

## Part 2: Loading Strategy

When to use which loading UI — using the wrong one creates jarring UX.

### Decision Guide

- **Skeleton** — use when: the layout of the content is known in advance and can be approximated. Best for: product lists, order lists, any content with a predictable structure. The skeleton matches the content shape, so there's no layout shift when content loads.

- **Spinner** — use when: the layout is unknown (e.g. a variable-height page section) or the wait is expected to be very short (< 300ms). Best for: button loading states, small inline data. Do not use as a full-page loading indicator.

- **Progress bar (top-of-page)** — use when: navigating between pages or loading something that takes 1–5 seconds. Communicates "something is happening" without covering content. Libraries: `nprogress` or build a simple one with CSS animation.

- **Optimistic placeholder** — use when: an optimistic update is in flight. Show the expected result immediately. Covered in `06-state-management.md`.

- **Streaming** — use when: parts of the page are ready before others. Show the shell and stream in sections. Covered in `05-rendering-strategy.md`.

### Items to Implement

- [ ] **Page transition progress bar** — add a thin progress bar at the top of the page during Next.js route navigation. Shows users that something is happening when pages take more than ~300ms to load:
  - Library: `nextjs-toploader` (zero-config Next.js integration) or `nprogress` with a Router event listener
  - Place in: `src/app/layout.tsx`
  - Complexity: Easy

- [ ] **Spinner for button loading states** — the current pattern (`isPending ? 'Loading...' : 'Submit'`) is functional but could be more polished. Replace text with an accessible spinner icon inside the button:
  ```tsx
  <button disabled={isPending}>
    {isPending ? <Spinner size="sm" aria-label="Loading" /> : 'Place Order'}
  </button>
  ```
  - Complexity: Easy
  - File: `src/components/Spinner/Spinner.tsx`

- [ ] **Audit all `isLoading` states** — go through every view and verify the correct loading UI is used:
  - Full-page data load → skeleton
  - Button submit → spinner in button
  - Route navigation → progress bar (handled globally)
  - Background re-fetch (TanStack Query) → subtle `isFetching` indicator (not a blocking skeleton)
  - Complexity: Easy (audit)
