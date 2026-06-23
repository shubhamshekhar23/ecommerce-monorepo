# Frontend Implementation Sequence V4

All V3 items are complete. This document sequences the frontend UI work required to surface every backend API that currently has no user-facing screen. Items were identified by cross-referencing every controller in `apps/backend/src/modules/` and every service in the monorepo against the existing page and feature directories in `apps/frontend/src/`.

Each item states the exact API endpoints it touches, the files to create or modify, and the key UX behaviour.

---

## Phase 1 — User Account Hub

The frontend has no `/account` section at all. These items create it. The profile page is the prerequisite for addresses and security because the layout shell is shared.

- [x] **Account layout and profile edit page** → `PATCH /users/me`, `GET /users/me`
  - Create `app/[locale]/account/layout.tsx` — sidebar nav linking to Profile, Addresses, Security, Privacy tabs
  - Create `app/[locale]/account/profile/page.tsx` — form to edit display name and email; submit calls `PATCH /users/me`; on success invalidate the `["me"]` query so Navbar/AuthProvider reflects the update
  - Create `features/account/api/account.api.ts` — `getMe()` and `updateMe(dto)` wrappers
  - Create `features/account/hooks/useUpdateProfile.ts` — TanStack mutation with optimistic update on `["me"]` cache key
  - Validation: name required, email must be a valid email format

- [x] **Saved addresses management** → `GET /addresses`, `POST /addresses`, `PATCH /addresses/:id`, `DELETE /addresses/:id`
  - Create `app/[locale]/account/addresses/page.tsx`
  - Create `features/addresses/api/addresses.api.ts` — four wrappers for list, create, update, delete
  - Create `features/addresses/hooks/` — `useAddresses`, `useCreateAddress`, `useUpdateAddress`, `useDeleteAddress`
  - Create `features/addresses/components/AddressCard/AddressCard.tsx` — shows formatted address, Edit and Delete buttons
  - Create `features/addresses/components/AddressForm/AddressForm.tsx` — fields: firstName, lastName, line1, line2, city, state, postalCode, country; used for both create and edit
  - On the checkout page: add a "Use saved address" step before the address fields; `GET /addresses` populates a radio list; selecting one pre-fills the form; user can still type a new one

- [x] **GDPR data deletion request** → `DELETE /users/me/data`, `DELETE /users/me/data/cancel`
  - Create `app/[locale]/account/privacy/page.tsx` — explains what data is stored; has a "Request account data deletion" button
  - On click: show a confirmation dialog ("This will schedule deletion of all your personal data. You have 30 days to cancel."); on confirm call `DELETE /users/me/data`
  - If a request is already pending: show "Deletion scheduled" state with a "Cancel deletion" button that calls `DELETE /users/me/data/cancel`
  - Store deletion-request state in the API response (the existing endpoint returns the request status); poll `GET /users/me` to check `deletionRequestedAt`

---

## Phase 2 — Auth Completions

The login and register pages exist but are missing three entire auth flows that the auth-service already implements.

- [x] **Forgot password flow** → `POST /auth/forgot-password`
  - Create `app/[locale]/(auth)/forgot-password/page.tsx` — single email field; on submit calls `POST /auth/forgot-password`; shows success state regardless of whether email exists (don't leak account existence)
  - Add "Forgot password?" link to `LoginForm.tsx` pointing to this page
  - Create `features/auth/hooks/useForgotPassword.ts` — mutation; no auth header required (`@Public()` on the endpoint)

- [x] **Reset password flow** → `POST /auth/reset-password`
  - Create `app/[locale]/(auth)/reset-password/page.tsx` — reads `?token=` from the URL query string; shows new-password + confirm-password fields; submits `{ token, newPassword }` to `POST /auth/reset-password`; on success redirects to `/login`
  - Validate: passwords match, minimum length 8; show inline field errors, not just a toast
  - Create `features/auth/hooks/useResetPassword.ts` — mutation; `@Public()` endpoint

- [x] **Two-Factor Authentication (2FA)** → `POST /auth/2fa/setup`, `POST /auth/2fa/enable`, `POST /auth/2fa/verify`, `POST /auth/2fa/disable`
  - Create `app/[locale]/account/security/page.tsx` — shows 2FA status (enabled / disabled)
  - **Setup + enable flow (account/security page):**
    - "Enable 2FA" button calls `POST /auth/2fa/setup` which returns a TOTP `otpauth://` URI and a QR code data URL
    - Display the QR code for the user to scan with an authenticator app; also show the secret as plain text for manual entry
    - "Verify and activate" form: single 6-digit code field; submits to `POST /auth/2fa/enable`; on success show backup codes and mark 2FA as enabled
  - **Verify step during login:**
    - After a successful `POST /auth/login`, if the response contains `requires2fa: true`, show an interstitial screen with a 6-digit code field instead of completing the login
    - Submit the code to `POST /auth/2fa/verify` to receive the real access/refresh tokens
    - Modify `LoginForm.tsx` and `useLogin.ts` to handle this two-step flow
  - **Disable 2FA (account/security page):**
    - "Disable 2FA" button shows a confirmation dialog with a code field; submits to `POST /auth/2fa/disable`
  - Create `features/auth/hooks/use2faSetup.ts`, `use2faEnable.ts`, `use2faVerify.ts`, `use2faDisable.ts`

- [x] **Google OAuth login** → `GET /auth/oauth/google`
  - Add a "Continue with Google" button to `LoginForm.tsx` and `RegisterForm.tsx`
  - On click: redirect to `${API_URL}/auth/oauth/google`; the auth-service handles the OAuth dance and redirects back to the frontend with tokens in query params or a short-lived code
  - On the callback landing page (`app/[locale]/(auth)/oauth/callback/page.tsx`): read the tokens from the URL, store them in the auth store (same as after a normal login), clear the URL params, redirect to the intended destination
  - Create `features/auth/hooks/useOAuthCallback.ts` — reads tokens from URL params on mount

---

## Phase 3 — Product Discovery Enhancements

These three features all live on or near the product detail page. Implement in dependency order: reviews first (needs a submit form and list), then notify-me (simpler), then recommendations (feature-flagged).

- [x] **Product reviews — submit and list** → `POST /reviews`, `GET /reviews/products/:productId`
  - Create `features/reviews/api/reviews.api.ts` — `getProductReviews(productId)` and `createReview(dto)`
  - Create `features/reviews/hooks/useProductReviews.ts` — TanStack query keyed on `["reviews", productId]`
  - Create `features/reviews/hooks/useCreateReview.ts` — mutation; on success invalidate `["reviews", productId]` and `["products", slug]` (so `avgRating` updates)
  - Create `features/reviews/components/ReviewList/ReviewList.tsx` — renders approved reviews; shows star rating, author name, date, body; empty state if no reviews yet
  - Create `features/reviews/components/ReviewForm/ReviewForm.tsx` — star picker (1–5), text area body; only shown to authenticated users who have ordered the product (gate on auth state; the backend enforces the order check)
  - Add both components to `ProductDetailView.tsx` below the product description

- [x] **Back-in-Stock "Notify Me" button** → `POST /products/:productId/stock-alerts`, `DELETE /products/:productId/stock-alerts`
  - Create `features/stock-alerts/api/stock-alerts.api.ts` — `subscribeStockAlert(productId, variantId?)` and `unsubscribeStockAlert(productId, variantId?)`
  - Create `features/stock-alerts/hooks/useStockAlert.ts` — mutation pair (subscribe / unsubscribe) with local toggle state
  - In `VariantSelector.tsx` / `ProductDetailView.tsx`: when the selected variant's stock is 0, replace the "Add to Cart" button with a "Notify me when back in stock" button; authenticated users get the subscribe call; unauthenticated users are redirected to login

- [x] **Product recommendations** → `GET /api/recommendations/products/:id`
  - The feature flag `NEXT_PUBLIC_FLAG_RECOMMENDATIONS` is already declared in [featureFlags.ts](../apps/frontend/src/shared/featureFlags/featureFlags.ts) but no component consumes the API
  - Create `features/recommendations/api/recommendations.api.ts` — `getRecommendations(productId)` (hits the analytics-service via the gateway)
  - Create `features/recommendations/hooks/useRecommendations.ts` — TanStack query; disabled when flag is off or productId is missing
  - Create `features/recommendations/components/RecommendationStrip/RecommendationStrip.tsx` — horizontal scroll row of `ProductCard`s labelled "You might also like"; renders nothing when the query returns an empty list
  - Wrap with `<FlagGuard flag="recommendations">` in `ProductDetailView.tsx` so it only renders when the flag is on

---

## Phase 4 — Orders & Post-Purchase

These items add three missing actions to the order detail page and one missing input to the cart/checkout flow.

- [x] **Coupon code input** → `GET /coupons/:code/validate`
  - Create `features/coupons/api/coupons.api.ts` — `validateCoupon(code)` returns the coupon discount data
  - Create `features/coupons/hooks/useCoupon.ts` — stores the applied coupon code in local state; calls validate on submit; clears on cart clear or order completion
  - Create `features/coupons/components/CouponInput/CouponInput.tsx` — text input + "Apply" button; shows the discount amount on success; "Remove" link to clear it; error message for invalid/expired codes
  - Add `CouponInput` to `CartSummary.tsx` above the total row; pass the applied discount to `CheckoutView` so it is included in the order creation payload
  - The backend applies the coupon server-side during order creation — the frontend only needs to surface the code field and show the validated discount preview

- [x] **PDF invoice download** → `POST /orders/:orderId/invoice`, `GET /orders/:orderId/invoice`
  - Create `features/orders/hooks/useInvoice.ts` — first calls `POST` to enqueue generation; then polls `GET` with `refetchInterval: 2000` until it returns 200 (not 202); stops polling on 200 or error
  - Add a "Download Invoice" button to `OrderDetailView.tsx`; visible only when `order.status` is `CONFIRMED`, `SHIPPED`, or `DELIVERED`
  - On 200: open the streamed PDF in a new tab (`window.open(invoiceUrl, '_blank')`) or trigger a file download via a hidden `<a download>` link
  - Show a loading spinner on the button while polling; disable the button while the job is in-flight

- [x] **Return request flow** → `POST /returns`, `GET /returns`
  - Create `app/[locale]/orders/[id]/return/page.tsx`
  - Create `features/returns/api/returns.api.ts` — `createReturn(dto)` and `getUserReturns()`
  - Create `features/returns/hooks/useCreateReturn.ts` — mutation; on success redirect back to the order detail page
  - Create `features/returns/components/ReturnForm/ReturnForm.tsx` — fields: reason (select: DAMAGED, WRONG_ITEM, NOT_AS_DESCRIBED, OTHER), description (textarea); shows the order items so the user can confirm what they're returning
  - Add a "Request Return" button to `OrderDetailView.tsx`; visible only when `order.status === 'DELIVERED'` and no pending return exists for this order; links to `/orders/:id/return`
  - Show return status on the order detail if a return request already exists (PENDING / APPROVED / REJECTED / REFUNDED)

- [x] **Order event log / timeline** → `GET /orders/:id/events`
  - Create `features/orders/hooks/useOrderEvents.ts` — TanStack query on `["orders", id, "events"]`
  - Create `features/orders/components/OrderTimeline/OrderTimeline.tsx` — vertical timeline of status-change events; each entry shows the event name, timestamp, and any metadata (e.g. "Payment confirmed by Stripe")
  - Add `OrderTimeline` to `OrderDetailView.tsx` below the order items list, collapsible with a "View history" toggle

---

## Phase 5 — Admin: Product Management Completions

The admin product form only has basic fields. The backend supports full variant type + option hierarchies, per-variant stock control, soft-delete recovery, and bulk CSV import — none of which have UI.

- [x] **Variant type and option management** → `POST /products/:productId/variant-types`, `POST /products/:productId/variant-types/:typeId/options`, `DELETE /products/:productId/variants/:variantId`
  - Add a "Variants" tab to the admin product edit page (alongside the existing product fields)
  - Create `features/admin/components/VariantTypesManager/VariantTypesManager.tsx`:
    - Lists existing variant types (e.g. "Size", "Color") fetched from `GET /products/:id`
    - "Add variant type" inline form: name field + save; calls `POST /products/:productId/variant-types`
    - Under each type: list of options (e.g. "S", "M", "L"); "Add option" inline form calls `POST /products/:productId/variant-types/:typeId/options`
  - Create `features/admin/components/VariantsTable/VariantsTable.tsx`:
    - Lists generated variants with their SKU, price, and stock
    - "Delete variant" button calls `DELETE /products/:productId/variants/:variantId` with a confirmation dialog
  - Create `features/admin/hooks/useCreateVariantType.ts`, `useCreateVariantOption.ts`, `useDeleteVariant.ts`

- [x] **Per-variant stock update** → `PATCH /products/:productId/variants/:variantId/stock`
  - In `VariantsTable.tsx`: add an editable stock cell — clicking it shows an inline number input + confirm; on confirm calls `PATCH /products/:productId/variants/:variantId/stock` with `{ stock: newValue }`
  - Alternatively, add a "Set stock" modal triggered per-row for a cleaner UX
  - Invalidate `["products", id]` query on success so the variant list refreshes
  - Create `features/admin/hooks/useUpdateVariantStock.ts`

- [x] **Soft-delete restore and hard purge** → `PATCH /products/:id/restore`, `DELETE /products/:id/purge`
  - Add an "Archived" filter tab to `AdminProductsView.tsx` that calls `GET /products?deleted=true` (or the equivalent query param) to show soft-deleted products
  - In the archived list: replace "Edit" and "Delete" with "Restore" (calls `PATCH /products/:id/restore`) and "Permanently delete" (calls `DELETE /products/:id/purge` with a strong confirmation dialog)
  - Create `features/admin/hooks/useRestoreProduct.ts` and `useHardDeleteProduct.ts`

- [x] **Product CSV import** → `POST /products/import/csv`
  - Add an "Import CSV" button to the admin products page header
  - Create `features/admin/components/CsvImportModal/CsvImportModal.tsx`:
    - File picker (accept `.csv` only)
    - Submit calls `POST /products/import/csv` with the file as `multipart/form-data`
    - Backend returns `{ imported, skipped, errors[] }` — show a results summary: "120 imported, 3 skipped, 1 error"
    - Display the `errors` array so the admin can fix and re-import
  - Create `features/admin/hooks/useCsvImport.ts` — mutation; the endpoint is synchronous (the worker thread runs inside the request cycle)

---

## Phase 6 — Admin: Business Operations

Three admin workflows that require new pages under `/admin/`.

- [x] **Promotion rules management** → `GET /admin/promotion-rules`, `POST /admin/promotion-rules`, `PATCH /admin/promotion-rules/:id`, `DELETE /admin/promotion-rules/:id`
  - Create `app/[locale]/admin/promotion-rules/page.tsx` — paginated table of rules; columns: name, priority, active (toggle), starts/expires at, actions
  - Create `app/[locale]/admin/promotion-rules/new/page.tsx`
  - Create `app/[locale]/admin/promotion-rules/[id]/edit/page.tsx`
  - Create `features/admin/components/PromotionRuleForm/PromotionRuleForm.tsx`:
    - Fields: name, description, priority, active toggle, startsAt/expiresAt date pickers
    - Condition builder: UI for selecting `minOrderValue`, `maxOrderValue`, `customerTier`, `categoryId`, `minQuantity`, `isFirstOrder`, `couponCode` — each is an optional field that the user can enable via checkboxes
    - DSL field: a textarea labelled "Rule expression (optional)" that accepts the DSL string (`IF order.subtotal > 100 AND customer.tier == "GOLD" THEN discount(percentage: 15)`); takes precedence over the condition builder when filled
    - Action builder: type selector (`percentage_discount` / `fixed_discount` / `free_shipping` / `free_item`) + value field
  - Active toggle on the list calls `PATCH /admin/promotion-rules/:id` with `{ active: false/true }` inline
  - Delete calls `DELETE /admin/promotion-rules/:id` (soft-delete — sets `active: false`)
  - Create `features/admin/hooks/usePromotionRules.ts`, `useCreatePromotionRule.ts`, `useUpdatePromotionRule.ts`, `useDeletePromotionRule.ts`
  - Add "Promotion Rules" link to `AdminNav.tsx`

- [x] **Returns management** → `GET /returns` (admin), `PATCH /returns/:id/approve`, `PATCH /returns/:id/reject`, `PATCH /returns/:id/refund`
  - Create `app/[locale]/admin/returns/page.tsx` — table of all return requests; columns: order ID, customer, reason, status, requested at, actions
  - Filter tabs: All / Pending / Approved / Refunded / Rejected
  - Per-row actions based on status:
    - PENDING → "Approve" button (calls `PATCH /returns/:id/approve`) + "Reject" button with a reason textarea (calls `PATCH /returns/:id/reject`)
    - APPROVED → "Process Refund" button (calls `PATCH /returns/:id/refund`); this triggers the Stripe refund and restocks inventory
    - REFUNDED / REJECTED → read-only status badge
  - Create `features/admin/hooks/useReturns.ts`, `useApproveReturn.ts`, `useRejectReturn.ts`, `useRefundReturn.ts`
  - Add "Returns" link to `AdminNav.tsx` with a badge showing the pending count

- [x] **Admin real-time order feed (WebSocket)** → Socket.IO gateway at `/admin/orders`
  - The backend `OrdersGateway` emits `order:created` to the `/admin/orders` namespace on every new order
  - In `AdminOrdersView.tsx`: on mount connect to `io('/admin/orders', { auth: { token: accessToken } })`; listen for `order:created` events and prepend the new order to the TanStack Query cache (`queryClient.setQueryData`)
  - Show a toast "New order #XYZ" on each event so the admin knows there's activity even if they're scrolled down
  - Disconnect on unmount
  - Install `socket.io-client` if not already in the frontend dependencies
  - Create `features/admin/hooks/useAdminOrderFeed.ts` — encapsulates the socket setup, teardown, and cache update; called from `AdminOrdersView`

---

## Phase 7 — Admin: System Operations

These are ops and devtool panels. Lower business priority but all endpoints exist and are admin-gated.

- [x] **Queue monitoring dashboard** → `GET /admin/queue/stats`, `GET /admin/queue/dlq`, `POST /admin/queue/dlq/:jobId/retry`, `POST /admin/queue/dlq/clear`
  - Create `app/[locale]/admin/queue/page.tsx`
  - Create `features/admin/components/QueueStats/QueueStats.tsx` — shows active, waiting, completed, failed job counts from `GET /admin/queue/stats`; auto-refreshes every 10 seconds
  - Create `features/admin/components/DeadLetterQueue/DeadLetterQueue.tsx` — table of failed jobs from `GET /admin/queue/dlq`; columns: job ID, name, failed reason, failed at
  - Per-row "Retry" button calls `POST /admin/queue/dlq/:jobId/retry`; "Clear all" button calls `POST /admin/queue/dlq/clear` with a confirmation dialog
  - Create `features/admin/hooks/useQueueStats.ts` (polled query), `useDlqJobs.ts`, `useRetryDlqJob.ts`, `useClearDlq.ts`
  - Add "Queue" link under a "System" section in `AdminNav.tsx`

- [x] **Feature flag management** → `GET /admin/feature-flags`, `POST /admin/feature-flags`, `PATCH /admin/feature-flags/:name`, `DELETE /admin/feature-flags/:name`
  - Create `app/[locale]/admin/feature-flags/page.tsx` — table of runtime feature flags; columns: name, enabled toggle, description, created at
  - The existing frontend reads flags from env vars (`NEXT_PUBLIC_FLAG_*`) — this panel manages the same flags stored in the database (the backend `feature-flags` module). Document in a comment that env vars are build-time defaults; database flags override at runtime.
  - Enabled toggle calls `PATCH /admin/feature-flags/:name` with `{ enabled: !current }` inline
  - "New flag" form: name and description fields; calls `POST /admin/feature-flags`
  - Delete calls `DELETE /admin/feature-flags/:name` with a confirmation dialog
  - Create `features/admin/hooks/useFeatureFlags.ts`, `useCreateFeatureFlag.ts`, `useUpdateFeatureFlag.ts`, `useDeleteFeatureFlag.ts`
  - Add "Feature Flags" link under the "System" section in `AdminNav.tsx`

- [x] **DB analytics panel** → `GET /admin/db/slow-queries`, `POST /admin/db/reset-stats`, `GET /admin/db/table-stats`, `GET /admin/db/replication/lag`, `GET /admin/db/replication/status`, `GET /admin/db/partitions`, `POST /admin/db/partitions/create-next`
  - Create `app/[locale]/admin/db-analytics/page.tsx` with four sections:
  - **Slow queries** — table from `GET /admin/db/slow-queries`; columns: query, calls, mean time, total time; "Reset stats" button calls `POST /admin/db/reset-stats`
  - **Table stats** — table from `GET /admin/db/table-stats`; columns: table name, live rows, dead rows, last vacuum, last analyze
  - **Replication** — `GET /admin/db/replication/lag` and `GET /admin/db/replication/status` side by side; shows replica lag in MB; colour-coded (green < 10MB, amber < 100MB, red ≥ 100MB)
  - **Partitions** — list from `GET /admin/db/partitions`; "Create next partition" button calls `POST /admin/db/partitions/create-next`
  - All sections refresh every 30 seconds; show "Last refreshed at" timestamp
  - Create `features/admin/hooks/useDbAnalytics.ts` — individual hooks for each sub-section
  - Add "DB Analytics" link under the "System" section in `AdminNav.tsx`
