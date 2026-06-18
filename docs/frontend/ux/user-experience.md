# 08 — User Experience

Visible UX improvements. Most of these are independent and can be tackled one at a time.
Source: `preserve-scroll-position.md`, `others.md`

---

## Items to Implement

### Scroll & Navigation

- [x] **`useScrollRestoration` hook** — when a user clicks a product card, browses the detail page, then hits the browser Back button, the product listing reloads at the top. The pattern from the notes:
  ```ts
  // Before navigation: save position
  sessionStorage.setItem('productsScrollY', String(window.scrollY));

  // On mount (returning to the list): restore
  const saved = sessionStorage.getItem('productsScrollY');
  if (saved) {
    window.scrollTo(0, Number(saved));
    sessionStorage.removeItem('productsScrollY');
  }
  ```
  Build this as `src/hooks/useScrollRestoration.ts` that takes a storage key parameter so any list page can use it.
  - Complexity: Easy–Medium
  - Files: `src/hooks/useScrollRestoration.ts`, `ProductsView.tsx`

- [x] **Cache product list in `sessionStorage` on back-navigation** — alongside scroll position, save the last-fetched product page data to sessionStorage. On return navigation, hydrate from cache before TanStack Query re-fetches in the background. This makes the back navigation feel instant.
  - Complexity: Medium
  - Note: TanStack Query's `staleTime` can also achieve this partially — set `staleTime: 5 * 60 * 1000` on the products query so cached data is used for 5 minutes before re-fetching.

---

### Skeleton Loading

`ProductSkeleton` already exists. Extend the pattern to all other major views.

- [x] **Skeleton for `OrdersView`** — a list of order card skeletons matching the `OrderCard` layout (title bar, status badge, date, price).
  - Complexity: Easy
  - File: `src/features/orders/components/OrderSkeleton/`

- [x] **Skeleton for `CartView`** — skeleton rows matching `CartItemRow` (image box, title, quantity stepper, price).
  - Complexity: Easy
  - File: `src/features/cart/components/CartSkeleton/`

- [x] **Skeleton for `CheckoutView`** — form field skeletons while Stripe and cart data load.
  - Complexity: Easy
  - File: `src/features/checkout/components/CheckoutSkeleton/`

- [x] **Skeleton for Admin views** — generic table-row skeleton for `AdminProductsView`, `AdminOrdersView`, `AdminUsersView`.
  - Complexity: Easy
  - File: `src/features/admin/components/AdminTableSkeleton/`

---

### Error Handling

- [x] **Error boundaries per feature** — wrap each major feature section in a React Error Boundary so a crash in (e.g.) the cart doesn't take down the entire page. Create a reusable `FeatureErrorBoundary` component with a friendly "Something went wrong. Try refreshing." fallback UI.
  - Complexity: Medium
  - File: `src/components/ErrorBoundary/ErrorBoundary.tsx`
  - Use at: route-level in each page, or wrapping each feature view component

---

### Feedback & Microinteractions

- [x] **Global toast/notification system** — currently "Added ✓" only appears on the button in `ProductCard`. Add a global toast that appears at the top-right for:
  - Cart: add/remove success and error
  - Orders: order placed, cancellation confirmed
  - Auth: login success, session expired warning
  - Admin: product/category saved, deleted
  
  Options: `react-hot-toast` (lightweight, zero-config) or `sonner` (modern, animations). Do not build from scratch.
  - Complexity: Easy (pick a library + wire up in mutation `onSuccess`/`onError`)
  - File: `src/app/providers.tsx` (add Toaster provider), then call `toast.success(...)` in mutation hooks

- [x] **`useDebounce` hook for search input** — the product search in `ProductsView` fires a query on every keystroke. Debounce by 300ms before firing:
  ```ts
  const debouncedSearch = useDebounce(search, 300);
  ```
  Build as `src/hooks/useDebounce.ts`.
  - Complexity: Easy
  - Files: `src/hooks/useDebounce.ts`, `ProductsView.tsx`

- [x] **Button press microinteraction** — add a subtle `scale(0.97)` on `:active` state to all primary buttons. Currently only hover states exist. One SCSS mixin update in the global button styles.
  - Complexity: Easy

- [x] **Card hover lift effect on `ProductCard`** — add a subtle `translateY(-2px)` + shadow increase on `:hover`. Signals interactivity. One SCSS change.
  - Complexity: Easy
  - File: `src/features/products/components/ProductCard/ProductCard.module.scss`
