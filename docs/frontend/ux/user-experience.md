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

---

## User Account Hub

The app has no `/account` section. These items create it.

- [x] **Account layout and profile edit** → `PATCH /users/me`, `GET /users/me`
  - Create `app/[locale]/account/layout.tsx` — sidebar nav with tabs: Profile, Addresses, Security, Privacy
  - Create `app/[locale]/account/profile/page.tsx` — form for editing display name and email; on submit calls `PATCH /users/me`; on success invalidates the `["me"]` query so the Navbar reflects the change
  - Create `features/account/api/account.api.ts` — `getMe()` and `updateMe(dto)` wrappers
  - Create `features/account/hooks/useUpdateProfile.ts` — TanStack mutation with optimistic update on `["me"]` cache key
  - Complexity: Medium

- [x] **Saved addresses page** → `GET /addresses`, `POST /addresses`, `PATCH /addresses/:id`, `DELETE /addresses/:id`
  - Create `app/[locale]/account/addresses/page.tsx`
  - Create `features/addresses/api/addresses.api.ts` — list, create, update, delete wrappers
  - Create `features/addresses/hooks/` — `useAddresses`, `useCreateAddress`, `useUpdateAddress`, `useDeleteAddress`
  - Create `features/addresses/components/AddressCard/AddressCard.tsx` — formatted address display with Edit and Delete buttons
  - Create `features/addresses/components/AddressForm/AddressForm.tsx` — fields: firstName, lastName, line1, line2, city, state, postalCode, country; shared between create and edit
  - Complexity: Medium

---

## Product Reviews

- [x] **Review submit and listing on product page** → `POST /reviews`, `GET /reviews/products/:productId`
  - Create `features/reviews/api/reviews.api.ts` — `getProductReviews(productId)` and `createReview(dto)`
  - Create `features/reviews/hooks/useProductReviews.ts` — TanStack query on `["reviews", productId]`
  - Create `features/reviews/hooks/useCreateReview.ts` — mutation; on success invalidates `["reviews", productId]` and `["products", slug]` (so `avgRating` updates in the product header)
  - Create `features/reviews/components/ReviewList/ReviewList.tsx` — list of approved reviews; each shows star rating (1–5), author name, date, body text; empty state if no reviews yet
  - Create `features/reviews/components/ReviewForm/ReviewForm.tsx` — star picker + body textarea; only shown to authenticated users; the backend enforces the "must have ordered the product" rule server-side
  - Add both components to `ProductDetailView.tsx` below the product description
  - The `avgRating` and `reviewCount` are already returned by the product API — display them in the product header next to the title
  - Complexity: Medium

---

## Back-in-Stock Notifications

- [x] **"Notify Me" button on out-of-stock variants** → `POST /products/:productId/stock-alerts`, `DELETE /products/:productId/stock-alerts`
  - Create `features/stock-alerts/api/stock-alerts.api.ts` — `subscribe(productId, variantId?)` and `unsubscribe(productId, variantId?)`
  - Create `features/stock-alerts/hooks/useStockAlert.ts` — mutation pair with local toggle state tracking whether the user is currently subscribed
  - In `VariantSelector.tsx` and `ProductDetailView.tsx`: when the selected variant's stock is 0, replace "Add to Cart" with a "Notify me when back in stock" button
  - Unauthenticated users clicking "Notify me" are redirected to `/login?redirect=<current-url>`
  - After subscribing: change button to "Cancel notification" (calls unsubscribe on click)
  - Complexity: Medium

---

## Order Post-Purchase Actions

- [x] **PDF invoice download** → `POST /orders/:orderId/invoice`, `GET /orders/:orderId/invoice`
  - Create `features/orders/hooks/useInvoice.ts`:
    - First calls `POST` to enqueue PDF generation (idempotent — backend skips if already exists)
    - Then polls `GET` with `refetchInterval: 2000` until a 200 (ready) or error is returned; stops polling on either
  - Add "Download Invoice" button to `OrderDetailView.tsx`; only visible when `order.status` is `CONFIRMED`, `SHIPPED`, or `DELIVERED`
  - Show a spinner on the button while polling; on 200, trigger a file download via a hidden `<a download>` link or open in a new tab
  - Complexity: Medium

- [x] **Return request flow** → `POST /returns`, `GET /returns`
  - Create `app/[locale]/orders/[id]/return/page.tsx`
  - Create `features/returns/api/returns.api.ts` — `createReturn(dto)` and `getUserReturns()`
  - Create `features/returns/hooks/useCreateReturn.ts` — mutation; on success redirect back to the order detail page
  - Create `features/returns/components/ReturnForm/ReturnForm.tsx` — reason dropdown (DAMAGED, WRONG_ITEM, NOT_AS_DESCRIBED, OTHER) and description textarea; shows the order line items for reference
  - Add "Request Return" button to `OrderDetailView.tsx`; only visible when `order.status === 'DELIVERED'` and no return request exists yet for this order
  - Show return status badge (PENDING / APPROVED / REJECTED / REFUNDED) on the order detail if a return already exists
  - Complexity: Medium

- [x] **Order event timeline** → `GET /orders/:id/events`
  - Create `features/orders/hooks/useOrderEvents.ts` — TanStack query on `["orders", id, "events"]`
  - Create `features/orders/components/OrderTimeline/OrderTimeline.tsx` — vertical timeline; each entry shows event name, timestamp, and any metadata; good for displaying the full journey from PENDING → CONFIRMED → SHIPPED → DELIVERED
  - Add `OrderTimeline` to `OrderDetailView.tsx` below the items list, behind a collapsible "View history" toggle
  - Complexity: Easy

---

## Admin: Product Management Completions

- [x] **Variant type and option management** → `POST /products/:productId/variant-types`, `POST /products/:productId/variant-types/:typeId/options`, `DELETE /products/:productId/variants/:variantId`
  - Add a "Variants" tab to the admin product edit page alongside the existing product fields
  - Create `features/admin/components/VariantTypesManager/VariantTypesManager.tsx`:
    - Lists existing variant types (e.g. "Size", "Color") from `GET /products/:id`
    - Inline "Add variant type" form: name field; calls `POST /products/:productId/variant-types`
    - Under each type: list of options with an inline "Add option" form calling `POST /products/:productId/variant-types/:typeId/options`
  - Create `features/admin/components/VariantsTable/VariantsTable.tsx`:
    - Table of generated variants with SKU, price, stock; "Delete" per row calls `DELETE /products/:productId/variants/:variantId` with confirmation
  - Create hooks `useCreateVariantType.ts`, `useCreateVariantOption.ts`, `useDeleteVariant.ts`
  - Complexity: Medium

- [x] **Per-variant stock update** → `PATCH /products/:productId/variants/:variantId/stock`
  - In `VariantsTable.tsx`: add an editable stock cell; clicking opens an inline number input + confirm button; on confirm calls `PATCH /products/:productId/variants/:variantId/stock` with `{ stock: newValue }`
  - Invalidate `["products", id]` on success so the variants table refreshes
  - Create `features/admin/hooks/useUpdateVariantStock.ts`
  - Complexity: Easy

- [x] **Soft-delete restore and hard purge** → `PATCH /products/:id/restore`, `DELETE /products/:id/purge`
  - Add an "Archived" tab to `AdminProductsView.tsx` that fetches soft-deleted products
  - In the archived list: replace Edit/Delete with "Restore" (calls `PATCH /products/:id/restore`) and "Permanently delete" (calls `DELETE /products/:id/purge` with a strong confirmation: "This cannot be undone")
  - Create `features/admin/hooks/useRestoreProduct.ts` and `useHardDeleteProduct.ts`
  - Complexity: Easy

- [x] **Product CSV import** → `POST /products/import/csv`
  - Add an "Import CSV" button to the admin products page header
  - Create `features/admin/components/CsvImportModal/CsvImportModal.tsx`:
    - File picker (`accept=".csv"`)
    - Submits the file as `multipart/form-data` to `POST /products/import/csv`
    - Backend returns `{ imported, skipped, errors[] }` — display the summary ("120 imported, 3 skipped, 1 error") and list any row-level errors so the admin can fix and re-import
  - Create `features/admin/hooks/useCsvImport.ts`
  - Complexity: Easy

---

## Admin: Business Operations

- [x] **Promotion rules management** → `GET /admin/promotion-rules`, `POST /admin/promotion-rules`, `PATCH /admin/promotion-rules/:id`, `DELETE /admin/promotion-rules/:id`
  - Create `app/[locale]/admin/promotion-rules/page.tsx` — paginated table; columns: name, priority, active toggle, starts/expires at, actions
  - Create `app/[locale]/admin/promotion-rules/new/page.tsx` and `[id]/edit/page.tsx`
  - Create `features/admin/components/PromotionRuleForm/PromotionRuleForm.tsx`:
    - **Basic fields**: name, description, priority, active toggle, startsAt/expiresAt date pickers
    - **Condition builder**: checkboxes to enable optional conditions — `minOrderValue`, `maxOrderValue`, `customerTier` (select), `categoryId`, `minQuantity`, `isFirstOrder`
    - **DSL field**: a textarea labelled "Rule expression (optional)" accepting the backend DSL syntax (`IF order.subtotal > 100 AND customer.tier == "GOLD" THEN discount(percentage: 15)`); takes precedence over the condition builder when filled
    - **Action builder**: type selector (`percentage_discount` / `fixed_discount` / `free_shipping` / `free_item`) + value field
  - Active toggle on the list row calls `PATCH /admin/promotion-rules/:id` with `{ active: !current }` inline (no navigation)
  - Create `usePromotionRules.ts`, `useCreatePromotionRule.ts`, `useUpdatePromotionRule.ts`, `useDeletePromotionRule.ts`
  - Add "Promotion Rules" link to `AdminNav.tsx`
  - Complexity: Medium–High

- [x] **Returns management (admin)** → `GET /returns` (admin), `PATCH /returns/:id/approve`, `PATCH /returns/:id/reject`, `PATCH /returns/:id/refund`
  - Create `app/[locale]/admin/returns/page.tsx` — table of all return requests; columns: order ID, customer name, reason, status, requested at, actions
  - Filter tabs: All / Pending / Approved / Refunded / Rejected
  - Per-row actions based on current status:
    - PENDING → "Approve" and "Reject" buttons; Reject shows a reason textarea dialog
    - APPROVED → "Process Refund" (calls `PATCH /returns/:id/refund`; this triggers the Stripe refund and restocks inventory on the backend)
    - REFUNDED / REJECTED → read-only status badge, no actions
  - Add "Returns" link to `AdminNav.tsx` with a count badge showing pending returns
  - Create `useReturns.ts`, `useApproveReturn.ts`, `useRejectReturn.ts`, `useRefundReturn.ts`
  - Complexity: Medium
