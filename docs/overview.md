# Monorepo Capabilities Overview

This is a production-grade e-commerce monorepo built as a progressive learning project, implementing 12+ phases of real-world backend and frontend engineering. It covers a full e-commerce platform: catalog, cart, checkout, payments, orders, returns, notifications, admin, analytics — with every major backend pattern (reliability, caching, observability, security, microservices, Kubernetes) implemented in working code.

Seven services + one frontend: `backend` (NestJS, port 4000), `auth-service` (port 3006), `notification-service` (port 3004), `search-service` (port 3005), `analytics-service`, `gateway` / BFF (port 3000), `frontend` (Next.js App Router). All sit behind an Nginx reverse proxy.

---

## 1. Authentication & Identity

- **User registration**
  - Business: visitors sign up with email and password to create an account
    - Rate-limited to 3 attempts per hour to prevent abuse
  - Developer: `POST /auth/register` on auth-service; bcrypt password hashing; emits `UserRegisteredEvent` to RabbitMQ `user.events` exchange; notification-service consumes and sends welcome email

- **Login / logout**
  - Business: users log in with email and password; sessions expire gracefully; login activity is tracked for security
    - Rate-limited to 10 attempts per 15 minutes
  - Developer: `POST /auth/login` and `POST /auth/logout`; RS256-signed access token (15 min) + refresh token (7 days) stored in DB; logout revokes the refresh token; IP and user-agent recorded on login

- **Token refresh**
  - Business: users stay logged in without re-entering credentials — sessions extend silently
  - Developer: `POST /auth/refresh`; validates refresh token against DB; issues new access token; auth-service exposes `GET /.well-known/jwks.json` for RS256 public key discovery so all services self-validate JWTs without calling auth-service

- **Silent token refresh (frontend)**
  - Business: page interactions never interrupt with a login redirect due to token expiry
  - Developer: axios interceptor triggers refresh at 80% of token lifetime; refresh runs in background; queues concurrent requests while refresh is in-flight

- **Password reset via email**
  - Business: users who forget their password receive a time-limited reset link by email
    - Endpoint always returns 204 — even if email is not found — to prevent account enumeration
  - Developer: `POST /auth/forgot-password` (rate-limited 3/15 min); generates HMAC-signed token (HMAC-SHA256 of `userId + expiry` using `RESET_TOKEN_SECRET`); stored in DB as single-use with 15-minute TTL; `POST /auth/reset-password` verifies signature, checks expiry, checks not-yet-used, marks as used, hashes new password

- **Google OAuth2 login**
  - Business: users can sign in with their Google account — no password required; one Google account can link to the same user regardless of how they first signed up
  - Developer: `passport-google-oauth20` strategy; PKCE authorization code flow; `GET /auth/oauth/google` initiates; callback exchanges code, upserts `OAuthAccount` model (`{provider, providerAccountId, userId}`); one user can have multiple `OAuthAccount` records (multiple OAuth providers per user); redirects frontend with JWT

- **Two-factor authentication (TOTP)**
  - Business: users add a second layer of security via Google Authenticator or Authy
    - QR code displayed for easy scanner setup; backup codes provided
  - Developer: otplib RFC 6238; `POST /auth/2fa/setup` returns TOTP secret + QR URI; `POST /auth/2fa/enable` activates after first OTP verify; `POST /auth/2fa/verify` (rate-limited 5/5 min) issues real tokens; `POST /auth/2fa/disable` requires current OTP

- **Multi-tab logout sync**
  - Business: logging out in one browser tab logs out all other open tabs instantly
  - Developer: storage event listener on the Zustand auth store; token removal broadcasts across tabs via localStorage event

- **Profile management**
  - Business: users can update their display name, email, and account details
  - Developer: `GET /users/me`, `PATCH /users/me`; JWT-scoped to authenticated user; validated via class-validator DTOs

- **GDPR data erasure**
  - Business: users can request deletion of all their personal data; a 7-day grace period allows cancellation before data is gone
    - Compliant with GDPR Article 17 (right to erasure); order history is preserved (financial retention requirement overrides erasure right)
  - Developer: `DELETE /users/me/data` requires password confirmation in body; creates a `DataErasureRequest` (`scheduledAt = now + 7 days`) and enqueues a BullMQ job; `DELETE /users/me/data/cancel` cancels within grace period; job anonymises: `email → erased.{sha256(userId).slice(12)}@deleted.invalid`, `firstName/lastName → [Deleted]`, deletes addresses and refresh tokens; audit trail entry preserved with `USER_DATA_ERASED` event

---

## 2. Product Catalog

- **Product listing — offset pagination**
  - Business: shoppers can browse all products page by page
  - Developer: `GET /products`; legacy offset/limit; kept for backwards compatibility

- **Product listing — cursor pagination**
  - Business: shoppers get stable, consistent results while browsing; works correctly even as new products are added in real time
  - Developer: `GET /products/cursor`; filters: minPrice, maxPrice, categoryId, inStock; sort; field selection via `?fields=`; opaque base64-encoded cursor token; stable across concurrent inserts unlike OFFSET

- **Full-text product search — PostgreSQL**
  - Business: shoppers search by keyword and get ranked, relevant results
  - Developer: `GET /products/search?q=`; `tsvector` column updated via DB trigger; GIN index; `plainto_tsquery` for safe input; `ts_rank` scoring; query runs entirely in PostgreSQL without a separate search service

- **Full-text search — OpenSearch / search-service**
  - Business: advanced search with fuzzy matching and relevance tuning for high-traffic use
  - Developer: `GET /search?q=`; search-service (port 3005); multi-match query against OpenSearch index; REST interface for external callers; gRPC interface for internal service-to-service calls; proto contracts in `/proto/`

- **Product detail with variants**
  - Business: each product can have multiple variants (e.g., S/M/L sizes, red/blue colours) each with its own price and stock level
  - Developer: `GET /products/slug/:slug`, `GET /products/:id`; normalised schema: Product → VariantType → VariantOption → ProductVariant → VariantAttributeValue; many-to-many join table; stock tracked per ProductVariant

- **Dynamic multi-field sorting**
  - Business: shoppers and admins can sort by price, name, date created, or any combination
  - Developer: `?sort=price:asc,name:desc`; composable Prisma `orderBy` array built from query param; no hardcoded sort columns

- **ORM-level field selection**
  - Business: API consumers receive only the fields they need — lighter payloads for mobile clients
  - Developer: `?fields=id,name,price`; parsed into Prisma `select` object; prevents over-fetching at the DB level

- **Soft delete, restore, hard purge**
  - Business: admins remove products from the storefront without permanently losing data; products can be recovered or permanently removed; records older than 90 days are purged automatically
  - Developer: `DELETE /products/:id` sets `deletedAt`; Prisma middleware auto-appends `deletedAt IS NULL` to all listing queries; `PATCH /products/:id/restore` clears `deletedAt`; `DELETE /products/:id/purge` hard-deletes; `SoftDeletePurgeService` cron job (`tasks/soft-delete-purge.service.ts`) permanently deletes rows where `deletedAt < now - 90 days`

- **Bulk CSV product import**
  - Business: admins upload a CSV to create hundreds of products at once instead of entering them one by one
  - Developer: `POST /products/import/csv`; multipart file upload; Node.js Worker Thread for CPU-bound CSV parsing with zero-copy buffer transfer via `transferList`; stream processing avoids memory spikes on large files; ADMIN-only guard

- **Product image management**
  - Business: admins attach multiple images to a product and remove them individually
  - Developer: `POST /products/:id/images`, `DELETE /products/images/:imageId`; file upload via `POST /upload/products` (max 10 files, 5 MB each, JPEG/PNG/WebP/GIF); files stored in S3-compatible object storage; single image via `POST /upload/single`

- **Category hierarchy**
  - Business: products are organised in a nested category tree (e.g., Electronics > Phones > Android); customers browse by category
  - Developer: `GET /categories/tree` returns recursive nested structure; `GET /categories/slug/:slug`; parent/child FK relationship in PostgreSQL; soft delete supported; slug-based URLs are crawlable for SEO; mutations ADMIN-only

- **ETag / conditional requests**
  - Business: product pages load from the browser cache when nothing has changed — faster page loads, less bandwidth
  - Developer: SHA1 hash of response body set as `ETag`; `If-None-Match` checked on subsequent requests; 304 Not Modified returned on cache hit; zero response body sent

---

## 3. Shopping Cart

- **Add, update, remove items**
  - Business: shoppers build a basket before purchasing; quantities can be adjusted; individual items removed
  - Developer: `POST /cart/items`, `PATCH /cart/items/:itemId`, `DELETE /cart/items/:itemId`; cart items linked to ProductVariant for accurate stock checking at checkout; JWT-scoped to authenticated user

- **Clear cart**
  - Business: shoppers can empty their entire cart in one action
  - Developer: `DELETE /cart`; cascades to delete all CartItem rows for the user

- **Optimistic cart UI**
  - Business: adding or removing items feels instant — no loading spinner for common actions
  - Developer: TanStack Query `onMutate` writes to cache immediately; `onError` rolls back to snapshot; `onSettled` refetches to sync server state

- **Web Worker for cart computation**
  - Business: cart totals, discount calculations, and tax estimates don't cause the page to stutter
  - Developer: heavy computation offloaded to a dedicated Web Worker thread; zero-copy `ArrayBuffer` transfer via `transferList`; main thread remains unblocked

- **Offline cart queue**
  - Business: shoppers can add items to their cart even when temporarily offline; changes sync automatically when connectivity returns
  - Developer: mutations queued to IndexedDB while offline; Service Worker `sync` event triggers replay of pending mutations on reconnect

---

## 4. Checkout & Payments

- **Idempotent order creation**
  - Business: customers place an order safely — double-clicking or network retries never create duplicate orders
    - Rate-limited to 10 orders per hour per user
  - Developer: `POST /orders`; requires `X-Idempotency-Key` header; `IdempotencyKey` DB table with PROCESSING/COMPLETED states; if another request with the same key is in-flight (PROCESSING) a `409 Conflict` is returned immediately; completed responses cached and replayed verbatim on duplicate; pessimistic locking (`SELECT FOR UPDATE`) on variant stock row + atomic `UPDATE variant SET stock = stock - qty WHERE stock >= qty` as defence-in-depth

- **Stripe payment intent**
  - Business: customers pay securely with a credit or debit card; card data never touches the application server
  - Developer: `POST /stripe/create-payment-intent` creates a Stripe PaymentIntent; returns `client_secret` to frontend; Stripe.js handles card tokenization client-side

- **Stripe webhook processing**
  - Business: order status updates automatically when a payment succeeds, fails, or is refunded — no manual intervention
  - Developer: `POST /stripe/webhook`; verifies Stripe webhook signature; handles `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`; `WebhookEvent` DB table with `ON CONFLICT DO NOTHING` for idempotent processing; Stripe retries delivery for up to 72 hours — deduplication is required

- **Payment retry queue (retriable vs non-retriable errors)**
  - Business: transient payment failures (network blip, Stripe rate limit) are retried automatically; hard failures (card declined, expired) fail immediately with a clear message and the cart is restored
  - Developer: `isRetriable(error)` classifier in StripeService; retriable errors → `payment-retry` BullMQ job with 3 attempts at 5 s, 25 s, 125 s exponential backoff; order stays PENDING; on success saga continues; on job exhaustion: emit `order.payment.failed`, order marked CANCELLED, cart restored for user

- **Coupon / discount validation**
  - Business: customers enter a discount code at checkout and see the reduced price before confirming
    - Invalid, expired, or already-used codes are rejected with a clear message
  - Developer: `GET /coupons/:code/validate`; checks code existence, expiry date, usage limit, and minimum order value; returns preview discount amount; usage count updated with optimistic locking; `POST /coupons` for ADMIN creation

- **Rule-based promotion engine**
  - Business: the marketing team creates complex promotions (e.g., "15% off Electronics orders over £100") from the admin UI — no code deploy needed; supports stackable and non-stackable rules
  - Developer: `GET|POST|PATCH|DELETE /admin/promotion-rules`; `PromotionRule` table: `condition` JSON, `action` JSON, `priority` Int, `active` Bool, `startsAt`/`expiresAt`, `stackable` Bool; evaluated in priority DESC order; first non-stackable match short-circuits; action types: `percentage_discount`, `fixed_discount`, `free_shipping`, `free_item`

- **Discount DSL**
  - Business: promotion conditions read like plain English — non-engineers can audit and write rules
    - Example: `IF order.subtotal > 100 AND customer.tier == "GOLD" THEN discount(percentage: 15)`
  - Developer: custom Lexer (token types: `IF`, `THEN`, `AND`, `OR`, `IDENT`, `NUMBER`, `STRING`, `OP`, `LPAREN`, `RPAREN`) → Parser (recursive descent → `BinaryExpr`, `Comparison`, `ActionNode`, `RuleNode`) → Interpreter (evaluates AST against `CartContext`); `conditionDsl` field stores DSL string; compiled JSON stored alongside for fast evaluation; backwards compatible

- **Shipping & tax calculation**
  - Business: shipping cost and tax are calculated automatically per order; tax rules follow a country → state → category → user-type → `isExempt` precedence (highest-priority rule wins)
  - Developer: shipping uses Strategy pattern with `ShippingCalculator` interface (flat-rate and weight-based implementations; carrier API extension point); TaxEngine evaluates ordered rule set against cart context; both applied during order creation before payment intent is created

- **Address snapshot**
  - Business: historical orders always show the exact shipping address at time of purchase — even if the customer later changes their address
  - Developer: shipping address serialised as JSONB on the Order record at creation time; denormalised for immutability; `GET /addresses` manages saved addresses separately

- **Payment failure recovery (frontend)**
  - Business: if payment fails or the page is refreshed mid-checkout, the customer's cart and checkout progress are restored automatically
  - Developer: cart state persisted to localStorage; interrupted checkout context stored in sessionStorage; restored on next page load; session-based idempotency key reused for retry

---

## 5. Order Management

- **User order history**
  - Business: customers see all past orders with status, items, totals, and timeline
  - Developer: `GET /orders/me`; JWT-scoped; returns order list with line items, variant details, payment status, and address snapshot

- **Admin order list + status management**
  - Business: admins see all orders across all customers and move them through the fulfilment workflow
    - State transitions are validated — invalid jumps (e.g., PENDING → DELIVERED) are rejected
  - Developer: `GET /orders` (ADMIN); `PATCH /orders/:id/status` (ADMIN); validated transition map: PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED / CANCELLED / REFUNDED; each transition appended to OrderEvent log

- **Real-time order status streaming**
  - Business: customers watch their order status update live on the order detail page — no refresh needed
  - Developer: `GET /orders/:id/status-stream`; Server-Sent Events (SSE); Redis Pub/Sub broadcasts status changes across all backend replicas; `Connection: keep-alive`; no `X-Accel-Buffering` header to prevent Nginx buffering

- **Admin real-time order feed**
  - Business: admin dashboard receives a live stream of all new orders — no page refresh needed
  - Developer: Socket.IO on `/admin` namespace; JWT guard on connection; `socket.io-adapter-redis` synchronises events across multiple backend instances; frontend shows toast notification per new order

- **Order event log**
  - Business: every status change and payment event is permanently recorded — useful for disputes and customer support audits
    - Log is append-only and tamper-proof
  - Developer: `GET /orders/:id/events`; `OrderEvent` table; PostgreSQL `RULE` blocks `UPDATE` and `DELETE` on the table at the DB level; CQRS read model

- **True event sourcing**
  - Business: the full history of an order can be replayed — useful for debugging, auditing, and future analytics
  - Developer: `OrderProjectionService` rebuilds current order state by folding over all events in the log; snapshot support for performance (avoids replaying thousands of events); replay capability for backfill or projection changes

- **PDF invoice generation**
  - Business: customers and admins can download a PDF invoice for any order; generation is fast from the user's perspective because it happens in the background; if not yet ready, the client polls again
  - Developer: `POST /orders/:orderId/invoice` enqueues a BullMQ job (idempotency: `jobId: invoice:<orderId>` deduplicates rapid double-enqueues) and returns 202 Accepted immediately; `GET /orders/:orderId/invoice` returns 202 if job still running (client polls), or streams PDF via `createReadStream().pipe(res)` (safe for large files without buffering); pdfkit library; 5 s base delay, 3 retry attempts

- **Order cancellation**
  - Business: customers can cancel an order before it ships; if payment was already captured, a refund is triggered automatically
  - Developer: `POST /orders/:id/cancel`; state machine validates cancellation is within allowed window; calls Stripe cancel or refund API; compensating transaction releases reserved stock

- **Order state machine**
  - Business: orders always move through a predictable lifecycle; impossible transitions are blocked
  - Developer: validated transition map in code; full status set: `PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED`; also `CANCELLED` and `REFUNDED` as terminal states; invalid transitions throw before any DB write; every valid transition appended to the OrderEvent log

---

## 6. Returns & Refunds

- **Return request**
  - Business: customers can request a return or refund for a delivered order by providing a reason
    - Only delivered orders can be returned
  - Developer: `POST /returns`; validates order is in DELIVERED state; creates `Return` record with status PENDING; `GET /returns` lists the user's return requests

- **Admin return management**
  - Business: admins review pending return requests and either approve or reject them with a reason visible to the customer
  - Developer: `PATCH /returns/:id/approve` and `PATCH /returns/:id/reject` (ADMIN); rejection requires a reason string; stored on the Return record

- **Stripe refund + automatic restock**
  - Business: once a return is approved and processed, the customer's card is refunded and the item goes back into available inventory automatically
  - Developer: `PATCH /returns/:id/refund` (ADMIN); calls Stripe Refunds API with original `charge_id`; increments variant stock in the same PostgreSQL transaction as the refund record update; status transitions to REFUNDED

---

## 7. Reviews & Ratings

- **Submit review**
  - Business: customers who have purchased a product can write a text review and star rating; reviews go through moderation before appearing publicly
  - Developer: `POST /reviews`; stored with status PENDING; linked to product and user; purchase verification enforceable via order lookup

- **Admin review moderation**
  - Business: admins approve or reject submitted reviews; only approved reviews appear on the product page; an already-approved review can be reversed back to rejected
  - Developer: `PATCH /reviews/:id/approve` (PENDING-only guard — throws `BadRequestException` on double-approve) and `PATCH /reviews/:id/reject` (ADMIN); `APPROVED → REJECTED` reversal allowed and emits `REVIEW_REJECTED_EVENT` to recompute `ProductRating`; both actions write to `AuditLog`

- **Rating aggregate recompute**
  - Business: the product's average star rating and review count update automatically when a review is approved — always reflects live data
  - Developer: BullMQ job triggered on approval; queries `AVG(rating)` and `COUNT(*)` over approved reviews for the product; updates `product.rating` and `product.reviewCount`; CQRS eventual consistency — read model updated asynchronously

---

## 8. Stock Alerts

- **Back-in-stock subscription**
  - Business: when a product variant is out of stock, customers can subscribe to be notified the moment it's restocked; subscriptions can be at the product level or for a specific variant
  - Developer: `POST /products/:productId/stock-alerts` stores the subscription; `StockAlert.variantId` nullable (null = product-level, set = variant-specific); `DELETE /products/:productId/stock-alerts` removes it; one subscription per user per product enforced

- **Notification on restock**
  - Business: subscribed customers automatically receive an email when stock is replenished — they don't have to keep checking the site
  - Developer: stock update triggers a domain event; event published to RabbitMQ `order.events` exchange; BullMQ fan-out creates one job per subscriber; fan-out filters to exact-variant subscribers + product-level subscribers; `StockAlert.notified` set to `true` by the processor after successful email delivery (not before), so BullMQ retries can still reach undelivered subscribers; DLQ handles persistent failures

---

## 9. Email Notifications

- **Welcome email**
  - Business: new users receive a personalised welcome email immediately after registering
  - Developer: `UserRegisteredEvent` → RabbitMQ `user.events` exchange → notification-service `user.events` consumer → `welcome` Handlebars template → Nodemailer SMTP; Mailpit captures emails locally in development

- **Order confirmation email**
  - Business: customers receive an order summary email as soon as their order is placed — order lines, totals, shipping address
  - Developer: `OrderPlacedEvent` → RabbitMQ `order.events` exchange → `order-confirmation` Handlebars template; address snapshot included in event payload

- **Shipping notification**
  - Business: customers are emailed when their order ships, including the tracking number
  - Developer: `OrderShippedEvent` emitted on status transition to SHIPPED → `order-shipped` Handlebars template with tracking number field; event published via Outbox pattern for guaranteed delivery

- **Shared event contracts**
  - Business: all services agree on what an "order placed" or "user registered" event looks like — no mismatches
  - Developer: `@repo/shared-types` workspace package; exports `OrderPlacedEvent`, `OrderShippedEvent`, `UserRegisteredEvent`, `AnalyticsOrderEvent`; exchange names, routing keys, queue names as typed constants; imported by all services

- **Dead-letter queue for failed emails**
  - Business: if email delivery fails (SMTP down, template error), the message is automatically retried rather than silently dropped
  - Developer: RabbitMQ DLX (dead-letter exchange) configured on notification-service queues; failed messages re-queued after back-off delay; admin can inspect via `GET /admin/queue/dlq`

---

## 10. Product Recommendations

- **Co-purchase recommendations**
  - Business: product detail pages show "customers also bought" recommendations to increase average order value
  - Developer: `GET /api/recommendations/products/:id` on analytics-service; co-purchase analysis SQL against ClickHouse OLAP; returns product IDs frequently bought together with the queried product

- **Real-time order ingestion into ClickHouse**
  - Business: recommendations incorporate the most recent purchases — data is never stale by more than minutes
  - Developer: analytics-service Kafka consumer listens on `order.placed` topic; each new order's items streamed into ClickHouse `order_items` table; ClickHouse is columnar OLAP — fast aggregation on millions of rows

- **Scheduled recommendation recomputation**
  - Business: recommendations refresh automatically on a schedule
  - Developer: NestJS cron job on analytics-service re-runs co-purchase SQL against ClickHouse; stores results back for the recommendations endpoint to read; no manual trigger needed

---

## 11. Admin Dashboard

- **Product and category management**
  - Business: admins create, edit, and delete products, variants, and categories from a web UI; bulk CSV import available for large catalogues
  - Developer: Next.js App Router pages at `/admin/products`, `/admin/categories`; backed by ADMIN-guarded REST endpoints; server components fetch data; client mutations via fetch/SWR; soft delete + restore supported

- **Order fulfilment workflow**
  - Business: admins see all orders in a table, filter by status, and advance each through the pipeline
    - Real-time WebSocket feed shows new orders as they arrive — no page refresh
  - Developer: `/admin/orders` page; `PATCH /orders/:id/status` with state machine validation; Socket.IO admin namespace for live updates; `socket.io-adapter-redis` synchronises across instances

- **Return request queue**
  - Business: admins work through pending return requests, approve or reject, and issue refunds from a single screen
  - Developer: `/admin/returns`; approve/reject/refund API calls; Stripe refund issued server-side; variant stock incremented in same transaction; optimistic UI update on frontend

- **User management**
  - Business: admins view all registered users, inspect their details, and can take account-level actions
  - Developer: `GET /users` (ADMIN); paginated list with search; role field visible; JWT RBAC enforces ADMIN role via `@Roles` decorator + `RolesGuard`

- **Promotion rules and coupons**
  - Business: the marketing team creates and manages discount codes and rule-based promotions without engineering involvement
  - Developer: `/admin/promotion-rules` and coupon endpoints; rule definitions stored in PostgreSQL as DSL strings; rule engine evaluates at checkout; `POST /coupons` creates single-use or multi-use codes

- **Feature flag management**
  - Business: the product team enables or disables features in production without a code deploy; supports gradual percentage rollouts to limit blast radius of new features
    - Useful for A/B testing, incident response, and canary feature releases
  - Developer: `GET|POST|PATCH|DELETE /admin/feature-flags`; flags stored in PostgreSQL; Redis-cached for fast evaluation; per-user rollout percentage bucketing (hash of userId % 100 compared to rollout %); Next.js frontend reads flags server-side to conditionally render UI; Level 1 via env vars; Level 2 via runtime DB + Redis

- **Background job queue monitoring**
  - Business: ops team sees the health of background processing (invoices, stock alerts, emails) and can retry any failed jobs without touching the server
  - Developer: `GET /admin/queue/stats` returns BullMQ job counts (waiting, active, completed, failed) per queue; `GET /admin/queue/dlq` lists failed jobs with error details; `POST /admin/queue/dlq/:jobId/retry` retries; `POST /admin/queue/dlq/clear` clears; backed by Redis + BullMQ

- **Database analytics dashboard**
  - Business: engineering and ops monitor database health directly from the admin UI — slow queries, table bloat, replication status — without needing server access
  - Developer: `/admin/db-analytics` page; `GET /admin/db/slow-queries` via `pg_stat_statements` ranked by `total_exec_time`; `GET /admin/db/table-stats` for dead tuples and table sizes; `GET /admin/db/replication/lag` and `/status`; `GET /admin/db/partitions`; `POST /admin/db/partitions/create-next`; `POST /admin/db/reset-stats` resets counters

---

## 12. Frontend — User Experience

- **Loading skeletons**
  - Business: pages appear to load instantly — skeleton shapes appear where content is loading rather than a blank screen
  - Developer: route-level `loading.tsx` files in Next.js App Router; Suspense boundaries for streaming SSR; skeleton components match the layout of real content to prevent layout shift

- **Empty states for all lists**
  - Business: every empty list (cart, order history, search results, admin tables) shows a helpful message or call to action rather than a blank page
  - Developer: `EmptyState` shared component with configurable icon, message, and action button; used in every feature's list view

- **Toast / global notification system**
  - Business: users see clear, non-blocking feedback for every action (item added to cart, order placed, error occurred)
    - Toasts auto-dismiss and are categorised: success, warning, error
  - Developer: global toast store (Zustand or Context); per-error-category display rules in the AppError class; toasts rendered via a portal at the root layout level

- **Optimistic UI**
  - Business: adding to cart, removing items, and other common actions feel instant — no loading state visible for fast mutations
  - Developer: TanStack Query `onMutate` writes to cache immediately and saves a snapshot; `onError` rolls back to snapshot; `onSettled` triggers a server refetch to reconcile

- **Scroll position restoration**
  - Business: pressing the back button returns users to the exact position in a product list where they left off
  - Developer: scroll position saved to `sessionStorage` on list → detail navigation; restored on back via `useScrollRestoration` hook; keyed by route path

- **Debounced search**
  - Business: the search input responds quickly without firing a request on every single keystroke
  - Developer: 300 ms debounce via `useDebounce` hook; `AbortController` cancels the previous in-flight request before each new one is sent

- **Breadcrumb navigation**
  - Business: users always know where they are in the site hierarchy and can navigate back in one click
  - Developer: `Breadcrumb` shared component; JSON-LD `BreadcrumbList` structured data embedded for SEO; generated from route context or explicit prop

- **Print-friendly receipts**
  - Business: customers can print a clean receipt for any order directly from the browser
  - Developer: CSS `@media print` stylesheet; `no-print` utility class hides navigation, sidebars, and action buttons; "Print Receipt" button triggers `window.print()`

- **Error boundaries per route**
  - Business: if one feature crashes it does not take down the entire page — only the affected section shows an error state with a retry button
  - Developer: `ErrorBoundary` component wrapping each major feature route; catches React render errors; shows categorised error UI with retry; unexpected errors sent to Sentry

---

## 13. Frontend — Accessibility (WCAG 2.1 AA)

- **Semantic HTML and heading hierarchy**
  - Business: the site works with screen readers out of the box; accessible to users with visual impairments
  - Developer: `h1`–`h6` hierarchy enforced per page; landmark roles (`main`, `nav`, `aside`, `footer`); no `div`-soup for interactive elements

- **Keyboard navigation**
  - Business: power users and users with motor impairments can navigate the entire site without a mouse
  - Developer: Tab order follows visual order; Escape closes modals and dropdowns; arrow keys navigate lists and menus; Enter/Space activate buttons and links

- **Focus traps in modals**
  - Business: keyboard focus stays inside open modals — users don't accidentally interact with background content
  - Developer: focus trap library or native `dialog` element; focus returns to trigger element on close

- **ARIA attributes**
  - Business: screen reader users hear what's happening — cart counts, loading states, error messages
  - Developer: `aria-live` regions for dynamic cart count and search results; `aria-busy` on loading states; `aria-describedby` links error messages to form fields; `role="alert"` for critical errors; `aria-label` on icon-only buttons

- **Reduced motion support**
  - Business: users with vestibular disorders or motion sensitivity are not overwhelmed by animations
  - Developer: `@media (prefers-reduced-motion: reduce)` applied to all transitions and animations; motion-heavy components (carousels, loaders) have static fallbacks

- **Accessible form primitives**
  - Business: form fields are usable by everyone including screen reader and keyboard-only users
  - Developer: shared `Input`, `Select`, `Textarea`, `Checkbox`, `RadioGroup` components with built-in label association, error state, and ARIA; used consistently across all features

- **Accessibility testing in CI**
  - Business: WCAG regressions are caught before they ship — not discovered by users
  - Developer: `jest-axe` runs against all component tests; Playwright E2E includes accessibility audits; CI gate blocks merge on new violations

---

## 14. Frontend — Internationalization (i18n)

- **Multi-language routing**
  - Business: the site can serve different languages from localised URLs (e.g., `/en/products`, `/fr/produits`)
  - Developer: Next.js `[locale]` dynamic segment in App Router; locale detected from URL; translation files per locale; middleware redirects bare paths to locale-prefixed routes

- **Currency and date formatting**
  - Business: prices display in the user's local currency format; dates show in the locally expected format
  - Developer: `Intl.NumberFormat` for currency; `Intl.DateTimeFormat` for dates; both initialised with the active locale; no hardcoded formatting strings

- **RTL language support**
  - Business: the layout mirrors correctly for right-to-left languages (Arabic, Hebrew, etc.) without a separate codebase
  - Developer: `dir="rtl"` set on `<html>` for RTL locales; CSS logical properties throughout (`margin-inline-start`, `padding-inline-end`, `border-inline`); no hardcoded `left`/`right` in layout CSS

- **SEO language alternates**
  - Business: search engines index the correct language version for each locale and route users to the right one
  - Developer: `hreflang` tags in page `<head>` generated via Next.js `generateMetadata`; one `hreflang` per supported locale per page

---

## 15. Frontend — SEO

- **Dynamic per-page metadata**
  - Business: every page has a unique, descriptive title and description — important for search ranking
  - Developer: Next.js `generateMetadata` (or `metadata` export) per route; title templating via `title.template`; product slug and category included in titles

- **OpenGraph tags**
  - Business: links shared on social media (Twitter, LinkedIn, Facebook) show rich previews with image, title, and description
  - Developer: `og:title`, `og:description`, `og:image`, `og:type` in page head; product images used as OG images

- **JSON-LD structured data**
  - Business: product pages show rich search results (star ratings, price, availability) directly in Google search listings
  - Developer: `Product` schema, `BreadcrumbList`, `WebSite` JSON-LD injected via `<script type="application/ld+json">`; generated server-side in React Server Components

- **Sitemap and robots.txt**
  - Business: search engines efficiently crawl and index the full product catalogue
  - Developer: sitemap generated programmatically from product and category slugs; `robots.txt` allows product and category pages; blocks admin and account routes

- **Canonical URLs**
  - Business: duplicate content (e.g., filtered URLs returning same products) doesn't dilute search ranking
  - Developer: `rel="canonical"` set to the canonical slug URL on all product and category pages; filter/sort params excluded from canonical

- **Crawlable filter and sort URLs**
  - Business: category pages filtered by subcategory or price range are indexable by search engines — more entry points for organic traffic
  - Developer: filters and sort options encoded in query params (not hash fragments); slug-based category filters produce unique URLs

---

## 16. Frontend — Rendering & Performance

- **Per-route rendering strategy**
  - Business: product catalog pages load blazing fast from CDN cache; account and order pages are always up to date
  - Developer: SSG for static pages; ISR with `revalidate` for product detail (fresh within N seconds); SSR for cart/checkout/account (must be per-user); streaming SSR for below-fold content via Suspense

- **React 18 concurrent features**
  - Business: navigating between pages and typing in search feel smooth — no janky freezes
  - Developer: `useTransition` wraps route navigation to keep UI responsive during data fetches; `useDeferredValue` defers search input to prevent input lag on slow queries

- **Code splitting**
  - Business: initial page load is small and fast — only the code needed for the current page is loaded
  - Developer: route-level code splitting via Next.js App Router; `next/dynamic` for heavy libraries (PDF viewer, chart components, admin modules); `@next/bundle-analyzer` in CI to catch bundle regressions

- **Image optimisation**
  - Business: product images load fast at every screen size and connection speed without any manual resizing by admins
    - Lower quality served automatically on slow connections
  - Developer: Next.js `<Image>` component; AVIF and WebP auto-negotiated via `Accept`; `srcset` and `sizes` generated per breakpoint; blur placeholder (base64 LQIP); lazy loading by default; art direction with `<picture>` for editorial/hero images; Network Information API lowers quality on 2G/3G

- **List virtualisation**
  - Business: admin tables and product grids with thousands of items scroll smoothly — no performance degradation
  - Developer: TanStack Virtual for both vertical lists and grids; dynamic column count based on viewport; only DOM nodes for visible rows are rendered; overscan for pre-render of adjacent rows

- **Intersection Observer lazy loading**
  - Business: below-fold components (related products, reviews section) don't delay the initial page render
  - Developer: `useIntersectionObserver` hook triggers `React.lazy` + Suspense import when component enters viewport; fallback shown until component loads

- **Font optimisation**
  - Business: text is readable immediately — no invisible text while fonts load, no layout shift
  - Developer: `font-display: swap` on all custom fonts; fonts preloaded in `<head>` via Next.js `next/font`; subset fonts to required character sets

---

## 17. Frontend — PWA & Real-time

- **Progressive Web App**
  - Business: customers can install the store on their phone's home screen and use it offline for browsing and cart management
  - Developer: `next-pwa` configures a Service Worker; precaches static assets and shell; runtime caches API responses with stale-while-revalidate strategy

- **Web App Manifest**
  - Business: the installed PWA looks like a native app — correct icon, name, and fullscreen display
  - Developer: `manifest.json` with `icons`, `theme_color`, `background_color`, `display: standalone`; linked from page `<head>`

- **Server-Sent Events — order status**
  - Business: customers see their order status update in real time on the order detail page without refreshing
  - Developer: `EventSource` on frontend connects to `GET /orders/:id/status-stream`; backend pushes status change events via Redis Pub/Sub; `Cache-Control: no-cache` and no `X-Accel-Buffering` header prevent Nginx buffering

- **WebSocket — admin order feed**
  - Business: admin dashboard receives a live stream of new orders — ops team never needs to refresh
  - Developer: Socket.IO client on `/admin` namespace; JWT sent as handshake auth; `socket.io-adapter-redis` synchronises across backend instances; frontend queues events and renders as toast notifications

- **Background sync for offline mutations**
  - Business: cart changes made offline (add to cart, remove item) are automatically sent to the server when the user's connection returns
  - Developer: offline mutations queued in IndexedDB; Service Worker registers `sync` event; pending queue replayed on reconnect with conflict resolution

---

## 18. Frontend — Analytics & Monitoring

- **Vercel Analytics + Speed Insights**
  - Business: the team sees real user experience data (Core Web Vitals) without instrumentation code
  - Developer: `@vercel/analytics` and `@vercel/speed-insights` added to root layout; LCP, FID, CLS, TTFB, FCP collected from real users; conditional render based on `VERCEL_ENV`

- **Google Analytics 4 — conversion funnel**
  - Business: the marketing team tracks the full conversion funnel — how many users browse, add to cart, start checkout, and complete purchase
  - Developer: GA4 events: `view_item`, `add_to_cart`, `begin_checkout`, `purchase`; fired from relevant user actions; GA4 script loaded only after cookie consent to comply with GDPR

- **GDPR consent gate**
  - Business: analytics scripts only load after the user accepts the cookie consent banner — legally compliant with GDPR
  - Developer: cookie consent state stored in localStorage; `useEffect` conditionally loads GA4, Sentry, and Speed Insights scripts only on consent; DNT (`Do Not Track`) header respected by skipping analytics

- **Sentry frontend error tracking**
  - Business: production errors are captured automatically with full context — the engineering team is notified before users complain
  - Developer: `@sentry/nextjs`; client-side and server-side config; user context (id, email) attached on login via `Sentry.setUser`; configurable sample rate; release tracking for correlation with deploys; PII fields scrubbed from breadcrumbs

- **Error classification**
  - Business: error messages shown to users are helpful and actionable; internal errors are hidden from users but logged
  - Developer: `AppError` class with categories: `validation`, `business`, `auth`, `network`, `server`, `unknown`; per-category display rules (toast for network errors, redirect for auth errors, inline for validation errors)

---

## 19. Frontend — Security & Privacy

- **HTTP security headers**
  - Business: the site is protected against common browser-based attacks (clickjacking, MIME sniffing, data injection)
  - Developer: set via Next.js `headers()` in `next.config.js`; CSP in report-only mode (logged, not blocked, during development); `X-Frame-Options: DENY`; `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `Strict-Transport-Security` (HSTS); `Permissions-Policy` disables unused browser features

- **Cookie consent banner**
  - Business: users are informed about data collection and can accept or decline before any tracking begins — GDPR compliant
  - Developer: consent stored in localStorage; scripts (GA4, Sentry) conditionally loaded post-consent; consent checked on every page load; `navigator.doNotTrack` respected

- **Secure payment**
  - Business: customers' card numbers are never transmitted to the application server
  - Developer: Stripe.js tokenizes card data in the browser; only a `client_secret` + `paymentIntent.id` passes through the app backend; PCI DSS scope minimised

- **External link safety**
  - Business: users clicking external links are not exposed to tab-hijacking attacks
  - Developer: `rel="noopener noreferrer"` on all `<a target="_blank">` links; enforced via ESLint rule

---

## 20. Frontend — Testing & Quality

- **Unit and component tests**
  - Business: individual UI components are verified to render correctly and respond to user interactions
  - Developer: Jest + React Testing Library + `@testing-library/user-event`; tests colocated with source; accessibility assertions via `jest-axe`; 70% coverage threshold enforced in CI

- **API mocking**
  - Business: frontend tests run fast and reliably without needing a live backend
  - Developer: MSW (Mock Service Worker) intercepts fetch requests at the network level; realistic request/response simulation; shared handlers between tests and Storybook

- **Pact consumer-driven contract tests**
  - Business: the frontend and backend can evolve independently without breaking each other — contracts are verified automatically
  - Developer: Pact consumer tests on frontend define expected request/response shapes; Pact provider tests on backend verify the contracts; contracts stored in `/pacts/`; Pact Broker ready

- **Playwright end-to-end tests**
  - Business: complete user journeys (browse → add to cart → checkout → order confirmation) are tested end to end
  - Developer: Playwright runs against the full app; user flow assertions; visual regression screenshots; performance metrics via `page.metrics()`; accessibility audits per page

- **Storybook**
  - Business: designers and developers can view and test every UI component in isolation
  - Developer: Storybook with interaction tests; MSW addon for API mocking in stories; visual component documentation; used as living design system

- **CI quality gates**
  - Business: every pull request is blocked from merging if it introduces regressions in type safety, accessibility, performance, or test coverage
  - Developer: gates: TypeScript type-check, ESLint, Stylelint, Prettier, Jest (≥70% coverage), E2E (Playwright), Lighthouse CI (performance budget), bundle size check via `@next/bundle-analyzer`; all run in GitHub Actions

- **Mutation testing**
  - Business: the test suite is tested — weak assertions that would miss real bugs are flagged
  - Developer: Stryker injects synthetic bugs (change `>` to `>=`, delete lines, etc.) and verifies tests catch them; CI fails if mutation score drops below threshold

---

## 21. Frontend — Design System & Styling

- **SCSS with design tokens**
  - Business: the visual design is consistent across every page — colours, spacing, and typography follow a single system
  - Developer: CSS custom properties for all design tokens (colours, spacing, border-radius, shadow, z-index, animation duration); SCSS compiles to CSS; tokens centralised in `_tokens.scss`

- **Dark mode**
  - Business: users can switch to a dark theme that's easier on the eyes; their preference is remembered across sessions
  - Developer: `data-theme="dark"` attribute on `<html>`; `@media (prefers-color-scheme: dark)` as fallback; theme toggle persisted to localStorage; switches without page reload via CSS custom property swap

- **CSS logical properties**
  - Business: the layout automatically mirrors for right-to-left languages without any extra code
  - Developer: `margin-inline-start` / `padding-inline-end` / `border-inline` used everywhere instead of `left`/`right` variants; enables RTL support via `dir="rtl"` alone

- **Breakpoint system and utilities**
  - Business: the layout adapts correctly to every screen size from mobile to widescreen
  - Developer: SCSS `@include breakpoint(md)` mixin; utility classes (`flex-center`, `truncate`, `visually-hidden`); `no-print` utility; responsive grid via CSS Grid with auto-fill

- **Print styles**
  - Business: printed receipts and invoices look clean and professional with no UI chrome
  - Developer: `@media print` hides navigation, sidebars, buttons, and footers; receipt-specific typography applied; `no-print` utility class on non-printable elements

---

## 22. Observability & Developer Operations

- **Prometheus metrics**
  - Business: ops team monitors error rates, request latency (P50/P95/P99), queue depth, and business metrics on live dashboards; alerts fire automatically on threshold breaches
  - Developer: `GET /metrics` on every service via `prom-client`; `http_request_duration_ms` histogram (RED method); P50/P95/P99 percentiles per route via `histogram_quantile`; business counters: orders placed, payment success/failure, cache hits/misses; BullMQ queue depth gauges; PgBouncer pool metrics via exporter on `:9127`; critical PgBouncer alert: `pgbouncer_pools_client_waiting > 0` signals pool saturation; all scraped by Prometheus; dashboards in Grafana

- **Grafana dashboards**
  - Business: four purpose-built dashboards give different teams the view they need — business KPIs, API health, database health, infrastructure health
  - Developer: RED dashboard (rate, errors, duration per service); Business dashboard (orders, payments, conversion); Database dashboard (slow queries, bloat, replication lag); Infrastructure dashboard (CPU, memory, PgBouncer pool usage); alerting rules in Prometheus Alertmanager

- **OpenTelemetry distributed tracing**
  - Business: engineers can pinpoint exactly which service, query, or external call caused a slowdown or error in a multi-service request
  - Developer: OTEL SDK auto-instruments NestJS HTTP, Redis, BullMQ, Prisma; trace context propagated via HTTP headers (`traceparent`); Jaeger v2 with Badger file-based storage (persistent — v1 `all-in-one` reached EOL Dec 31 2025); config via `apps/backend/jaeger.yml`; viewable in Grafana Explore (daily driver, `tracesToLogsV2` link) or Jaeger UI `:16686` (System Architecture tab, span comparison)

- **Load testing scripts**
  - Business: the system can be benchmarked under realistic concurrent load before major releases
  - Developer: `npm run load:setup` upserts test users + products; `npm run load:mixed` runs 150-300 concurrent users for ~10 min; focused scenarios: `load:guest`, `load:auth`, `load:cart`, `load:orders`; `load:clean` removes fixtures; results visible in Grafana RED dashboard and Jaeger waterfall

- **Pino structured JSON logging**
  - Business: all application errors and events are captured in a searchable, centralised log system
  - Developer: Pino logger in every service; JSON output to stdout; correlation ID (`X-Request-ID`) injected via AsyncLocalStorage middleware into every log line; Promtail scrapes stdout → Loki → Grafana LogQL; PII redact paths: `req.body.password`, `req.body.email`, `req.headers.authorization`, `req.headers.cookie`, `req.headers["x-user-email"]` → replaced with `[REDACTED]`; `x-user-id` intentionally NOT redacted (non-sensitive, needed for debugging)

- **Log-trace correlation**
  - Business: engineers can jump from a log line directly to the full distributed trace — no manual ID copying
  - Developer: Grafana `tracesToLogsV2` datasource link; currently falls back to time-window query (±1 min) because Pino does not yet inject `trace_id`/`span_id` into log lines; completing the link requires OpenTelemetry Log Bridge API — marked as future improvement

- **Sentry backend error tracking**
  - Business: unhandled server errors are captured automatically with full context; engineers are alerted before users report issues
  - Developer: global NestJS exception filter via `@sentry/nestjs`; skips `HttpException` with status < 500 (expected client errors); captures only 5xx; `SENTRY_TRACES_SAMPLE_RATE` env var (0.01 prod, 1.0 staging); CI post-deploy: `sentry-cli releases finalize $APP_VERSION` correlates errors with specific releases; user context set via `Sentry.setUser({ id: x-user-id })`

- **Slow query detection**
  - Business: database performance issues are detected and surfaced before they degrade customer experience
  - Developer: `pg_stat_statements` extension enabled; `GET /admin/db/slow-queries?limit=N` ranks by `total_exec_time`; `mean_exec_time` and `calls` also exposed; `POST /admin/db/reset-stats` resets counters for a clean measurement window

- **Table bloat and VACUUM monitoring**
  - Business: PostgreSQL accumulates dead rows over time from updates and deletes; monitoring prevents silent performance degradation
  - Developer: `GET /admin/db/table-stats` returns `n_dead_tup`, `n_live_tup`, `dead_pct`, and table sizes; autovacuum tuning config documented in `/docs/notes/vacuum-blodt-monitoring.md`; alerts configurable on dead_pct threshold

- **Replication lag monitoring**
  - Business: ops team knows immediately if the read replica is falling behind the primary — before it affects analytics queries
  - Developer: `GET /admin/db/replication/lag` queries the replica's `pg_stat_replication`; `GET /admin/db/replication/status` queries the primary; lag exposed as Prometheus metric; Alertmanager fires if lag exceeds threshold

- **Quarterly table partitioning**
  - Business: high-volume audit and metric tables remain performant as data grows — no manual archiving needed
  - Developer: `RequestMetric` table range-partitioned by quarter; `GET /admin/db/partitions` lists all partitions with sizes; `POST /admin/db/partitions/create-next` provisions the next quarter's partition; PostgreSQL partition pruning eliminates full-table scans on time-range queries

---

## 23. Database

- **Normalised variants schema**
  - Business: products can have any combination of variant attributes (colour, size, material) without changing the schema
  - Developer: `Product → VariantType → VariantOption → ProductVariant → VariantAttributeValue`; many-to-many join table; price and stock live on `ProductVariant`; extensible to any attribute without schema changes

- **Cursor-based pagination**
  - Business: product list pages load consistently even when new products are added in the middle of browsing
  - Developer: opaque base64-encoded cursor token; stable across concurrent inserts unlike OFFSET which shifts rows; cursor encodes the sort column value + `id` for tie-breaking

- **PostgreSQL full-text search**
  - Business: keyword search returns relevant results without a separate search infrastructure
  - Developer: `tsvector` column updated via DB trigger on product insert/update; GIN index; `plainto_tsquery` for safe user input; `ts_rank` scoring for relevance ordering

- **Pessimistic locking**
  - Business: two customers ordering the last unit of a product simultaneously never results in overselling
  - Developer: `SELECT FOR UPDATE` on `ProductVariant.stock` row during order creation; held within the transaction; second concurrent transaction waits until first commits; guaranteed stock consistency

- **Optimistic locking**
  - Business: coupon usage limits are enforced accurately under concurrent checkout — no coupon can be used more times than its `maxUses` limit
  - Developer: `CouponUsage` table with `(couponId, userId) UNIQUE` constraint; coupon `usedCount` incremented with optimistic version check; DB unique constraint rejects duplicate usage for same user; `Coupon.usedCount` compared against `maxUses` before checkout proceeds

- **Expand-contract migrations**
  - Business: database schema changes are deployed without downtime — no maintenance window required
  - Developer: four phases: add nullable column → backfill existing rows → add NOT NULL constraint → remove old column; each phase independently deployable; CI migration safety check blocks `DROP COLUMN` and `ALTER TYPE` in a single migration

- **Vertical partitioning**
  - Business: hot read queries on product listings are faster because they fetch smaller rows
  - Developer: `ProductDetail` table splits rarely-read columns (long description, SEO metadata) from the hot `Product` table; reduces row width on the hot read path; joined on demand for detail pages

- **Large table batched migration**
  - Business: adding a new column to a millions-row table happens without locking the table or causing downtime
  - Developer: ID-range batching (e.g., `WHERE id BETWEEN 1 AND 10000`); sleep between batches to reduce I/O pressure; progress trackable by checking `updatedAt` watermark; no `ALTER TABLE ... DEFAULT` value that would rewrite every row

- **Concurrent index creation**
  - Business: adding a new index on a live table doesn't block reads or writes
  - Developer: `CREATE INDEX CONCURRENTLY`; builds index in the background without a table lock; CI migration safety check enforces this pattern — blocks any `CREATE INDEX` without `CONCURRENTLY`

- **Soft delete**
  - Business: deleted products, categories, and users are not permanently lost — they can be restored or audited
  - Developer: `deletedAt TIMESTAMP` column; Prisma middleware auto-appends `WHERE deletedAt IS NULL` to all queries; restore endpoint clears `deletedAt`; hard-purge endpoint for permanent deletion

- **Denormalisation and snapshots**
  - Business: historical orders show the exact product name, category, and address at the time of purchase — even if those change later
  - Developer: `categoryName` denormalised onto `OrderItem`; shipping address serialised as JSONB on `Order`; `rating` and `reviewCount` denormalised on `Product`; all updated via event handlers or background jobs

- **Append-only audit log**
  - Business: all sensitive actions (logins, admin changes, data deletions) are permanently and tamper-proof recorded
  - Developer: separate `AuditLog` table; PostgreSQL `RULE` blocks `UPDATE` and `DELETE` at the DB level; quarterly partitioned; ADMIN-accessible; `actor`, `resource`, `action`, `timestamp`, `metadata` columns

- **pg_stat_statements**
  - Business: the engineering team can identify which database queries are slowest and fix them proactively
  - Developer: extension enabled in PostgreSQL config; tracks `total_exec_time`, `mean_exec_time`, `calls`, `rows` per normalized query; surfaced via `GET /admin/db/slow-queries`

- **Range partitioning**
  - Business: the metrics and audit tables stay fast at large data volumes — queries only scan the relevant time partition
  - Developer: `RequestMetric` partitioned by `created_at` into quarterly ranges; `PARTITION BY RANGE`; PostgreSQL constraint exclusion and partition pruning skip irrelevant partitions on time-bounded queries

- **Streaming replication + read replica**
  - Business: analytics and reporting queries don't slow down the production database — they run on a separate replica
  - Developer: async WAL streaming from primary; `pg_basebackup` for initial snapshot; `ReadReplicaService` routes analytics queries to the replica `DATABASE_URL_REPLICA`; primary is used for all writes; replication lag monitored via Prometheus

- **Covering indexes and partial indexes**
  - Business: the most common read queries return results without touching the main table — faster and less I/O
  - Developer: `INCLUDE` clause on indexes for index-only scans on hot paths; partial indexes `WHERE isActive = true` and `WHERE deletedAt IS NULL`; significantly smaller index size and faster scans

- **PgBouncer connection pooling**
  - Business: the database handles many more concurrent application connections without exhausting PostgreSQL's connection limit
  - Developer: PgBouncer in transaction-mode pooling; sits in front of PostgreSQL; all services connect via PgBouncer; pool stats exported to Prometheus; `DIRECT_DATABASE_URL` bypasses PgBouncer for Prisma DDL migrations

---

## 24. Caching

- **Cache-aside**
  - Business: frequently read data (product listings, categories) loads from Redis rather than hitting the database on every request
  - Developer: `CacheService` wraps all cache operations; on cache miss: fetch from DB → write to Redis with TTL → return; on cache hit: return cached value directly; pattern used across product, category, and recommendation endpoints

- **Pattern-based invalidation**
  - Business: when a product is updated, all cached variations of that product's data are invalidated — users always see fresh data
  - Developer: Redis `SCAN` with glob patterns (`products:*`, `category:123:*`); `KEYS` command is never used (blocking); invalidation triggered via domain event handlers on mutation

- **Cache stampede prevention**
  - Business: when a popular cached item expires, only one request regenerates it — not hundreds hitting the database simultaneously
  - Developer: Redis `SET NX PX` mutex (distributed lock); first request acquires lock, fetches from DB, writes to cache, releases lock; subsequent requests wait then read the now-cached value; double-checked locking pattern prevents race conditions

- **L1 in-memory cache**
  - Business: the absolute hottest endpoints respond from in-process memory — sub-millisecond latency without even a Redis call
  - Developer: 5 s TTL in-process Map cache on hot product list endpoints; Redis Pub/Sub broadcasts invalidation events across all backend replicas so L1 caches stay consistent

- **Separate Redis instances per concern**
  - Business: a cache eviction or BullMQ backlog never causes job loss or rate-limit bypass — each workload has its own isolated pool
  - Developer: `redis-cache` (`maxmemory-policy allkeys-lru`) for cache; `redis-queue` (`maxmemory-policy noeviction`) for BullMQ — jobs cannot be silently dropped under memory pressure; `redis-rate-limit` for rate limiting; `redis-pubsub` for Pub/Sub; each named with a separate `ioredis` instance via Bulkhead pattern

- **Write-through cache**
  - Business: the cart is always up to date in both the cache and the database — no stale reads after writes
  - Developer: mutations write to Redis + PostgreSQL in the same request; cart data always current; used where read-after-write consistency matters

- **Bloom filter**
  - Business: requests for non-existent product IDs (bot scanning, typos) are rejected before hitting the database
  - Developer: RedisBloom probabilistic filter loaded with all existing product IDs; `BF.EXISTS` check before any DB query for product by ID; false positive rate configurable; filter updated on product create/delete events

- **Negative caching**
  - Business: repeated lookups for products known not to exist don't hammer the database
  - Developer: sentinel `__NULL__` string stored with short TTL (e.g., 30 s) when DB returns null; subsequent requests return `null` from cache without a DB hit

- **Request coalescing / singleflight**
  - Business: a burst of concurrent requests for the same uncached data results in only one database query
  - Developer: in-process `Map<key, Promise>` tracks in-flight fetches; concurrent requests for the same key receive the same Promise; one DB query serves all waiters; Promise removed from map on settle

- **Refresh-ahead**
  - Business: hot cache entries never expire from user perspective — they are refreshed before they go stale
  - Developer: background refresh triggered when a key's remaining TTL falls below a threshold; new value written to cache before old one expires; user requests always hit a warm cache

- **Stale-while-revalidate**
  - Business: users always get a response immediately — even if the data is slightly stale — while fresh data loads in the background
  - Developer: two-key approach: `key:fresh` (primary, short TTL) and `key:stale` (fallback, longer TTL); on `fresh` miss, serve `stale` key immediately and trigger background refresh; `fresh` key updated asynchronously

- **Cache versioning**
  - Business: the entire cache can be invalidated instantly without flushing Redis — useful during deploys
  - Developer: global version counter stored in Redis; all cache keys prefixed with `v:{version}:`; incrementing the version counter effectively invalidates all old-version keys without a `FLUSHDB`

- **Rate limiting (sliding window)**
  - Business: individual users or IPs are throttled if they make too many requests — prevents abuse without affecting normal users
  - Developer: Redis sorted set per `user:endpoint`; Lua script atomically removes expired entries, counts remaining, and increments if under limit; `ZADD` + `ZREMRANGEBYSCORE` + `ZCARD` in one atomic script

- **Rate limiting (token bucket)**
  - Business: endpoints with burst allowance (e.g., search) handle traffic spikes gracefully without rate-limiting normal users
  - Developer: Lua script for atomic token refill (based on elapsed time) + cost deduction; supports burst up to bucket capacity; smoother than sliding window for bursty traffic

---

## 25. Reliability & Resilience

- **Idempotency interceptor**
  - Business: duplicate requests (double-click, network retry, mobile reconnect) never create duplicate orders or payments
  - Developer: `X-Idempotency-Key` header required on order creation; `IdempotencyKey` table with `PROCESSING` and `COMPLETED` states; DB unique constraint prevents concurrent duplicates; if key is PROCESSING: return `409 Conflict` immediately; if COMPLETED: return cached response verbatim; COMPLETED stores `statusCode` + `responseBody` JSON

- **Distributed Lock**
  - Business: shared resources (cron jobs, outbox processor) are accessed by only one pod at a time — no duplicate processing in a multi-replica deployment
  - Developer: `DistributedLockService`; Redis `SET NX PX` (set-if-not-exists with TTL); Lua script for atomic compare-and-delete on release (prevents releasing a lock owned by another instance); wraps outbox processor, inbox cleanup, soft-delete purge cron

- **Transactional Outbox**
  - Business: domain events (order placed, user registered) are guaranteed to be published — even if the message broker is briefly unavailable
  - Developer: event written to `OutboxEvent` table in the same DB transaction as the business write; poller runs every 5 s with `SELECT ... FOR UPDATE SKIP LOCKED` (prevents multiple pods processing the same event); publishes to RabbitMQ; marks entry as PROCESSED; `OutboxEvent.attempts` capped at 5 before moving to FAILED

- **Saga orchestration**
  - Business: placing an order involves multiple steps (reserve stock, create payment, send event); if any step fails, all previous steps are undone automatically
  - Developer: compensating transactions on failure: release reserved stock, cancel payment intent, rollback order status; saga coordinates steps sequentially; failure at any step triggers reverse compensation in order

- **Saga choreography**
  - Business: the review approval workflow spans multiple services (backend + notification) without any single service coordinating the whole flow
  - Developer: event-driven choreography; `ReviewApprovedEvent` published by backend; notification-service and rating-service both react independently; no central orchestrator; services decoupled via RabbitMQ exchange

- **Inbox pattern / idempotent consumer**
  - Business: even if RabbitMQ delivers a message twice, the notification or action is only executed once — RabbitMQ guarantees at-least-once delivery, Inbox brings it to exactly-once
  - Developer: `InboxMessage` table (`{ messageId String @id, processedAt DateTime }`); consumer checks `isProcessed()` before handling; `markProcessed()` uses `INSERT ON CONFLICT DO NOTHING` (safe under concurrent duplicate deliveries); Outbox ensures publish at-least-once, Inbox ensures consume at-most-once — together = end-to-end exactly-once; scheduled cleanup job purges rows older than 7 days

- **BullMQ background jobs**
  - Business: slow operations (PDF generation, stock-alert emails, GDPR erasure, cart recovery) don't block user-facing requests
  - Developer: queues: `stock-alerts`, `cart-recovery`, `invoices`, `gdpr-erasure`, `payment-retry`; per-queue concurrency control; BullMQ backed by a dedicated Redis instance (`redis-queue`) with `maxmemory-policy noeviction` (jobs must never be evicted); data structures: pending jobs (Redis List), delayed jobs (Redis Sorted Set by timestamp), active jobs (Redis Hash), failed jobs (Redis Sorted Set); retry with exponential back-off per queue; dead-letter on exhaustion

- **Circuit breaker**
  - Business: if a downstream service (search, payment) is failing, requests fail fast rather than hanging — degraded experience beats total failure
  - Developer: `opossum` library; Closed → Open → Half-Open states; configurable error rate threshold; half-open allows probe requests to test recovery; state and trip events exported as Prometheus metrics; admin dashboard shows circuit state

- **Exponential backoff with jitter**
  - Business: when a service or database connection fails, retries are spread out automatically — prevents thundering herd after an outage
  - Developer: base delay × 2^attempt + random jitter; used in inter-service HTTP calls and BullMQ retry config; jitter randomises retry timing across multiple instances to avoid synchronised spikes

- **Dead-letter queue**
  - Business: messages and jobs that repeatedly fail are captured and held for inspection rather than silently dropped
  - Developer: BullMQ DLQ for exhausted job retries; RabbitMQ DLX for failed message delivery; both inspectable via `GET /admin/queue/dlq`; individual retry via `POST /admin/queue/dlq/:jobId/retry`; bulk clear via `POST /admin/queue/dlq/clear`

- **Stripe webhook deduplication**
  - Business: Stripe may deliver the same webhook event more than once — payment processing still happens exactly once
  - Developer: `WebhookEvent` table stores event IDs; `ON CONFLICT DO NOTHING` on insert; if event already exists, handler returns early; Stripe webhook signature verified before any processing

- **Bulkhead isolation**
  - Business: a spike in one type of workload (e.g., bulk CSV import) doesn't starve resources for user-facing requests
  - Developer: separate Redis instances for cache, rate-limiting, and BullMQ; separate connection pools per concern; `p-limit` concurrency caps on per-dependency calls; failures in one pool don't cascade to others

- **Fan-in with timeout**
  - Business: the BFF can aggregate data from multiple services in parallel; if one service is slow, the response still arrives within a deadline rather than timing out entirely
  - Developer: `Promise.allSettled` across parallel service calls; per-call `AbortController` timeout (e.g., 2 s); partial results returned if some services succeed; failed services return null with graceful degradation

- **Graceful degradation**
  - Business: the site keeps working even when non-critical services are down — product search falls back to built-in search; payment failures retry automatically; the frontend signals when approximate results are shown
  - Developer: search: circuit breaker opens after 5 consecutive search-service failures → fallback to PostgreSQL FTS (`WHERE name CONTAINS OR searchVector @@ query`); response includes `X-Search-Source: fallback` header so frontend can display "showing approximate results"; payment: transient Stripe errors routed to `payment-retry` BullMQ queue (3 attempts, 5 s/25 s/125 s backoff)

---

## 26. API Architecture

- **REST with versioning**
  - Business: API clients can upgrade at their own pace — old API versions remain stable during migration; deprecated versions signal their status in the response
  - Developer: URL-path versioning (`/api/v1/`); path versioning is visible, cacheable, browser-discoverable; safe multi-version deployment: deploy `/api/v2/` alongside `/api/v1/`, add v2 pathFilter above v1 catch-all in gateway, deprecate v1 with `Deprecation` response header; `API_PREFIX` env var controls prefix; NestJS versioning middleware

- **Dynamic multi-field sorting**
  - Business: every list endpoint supports flexible sorting by any combination of fields
  - Developer: `?sort=price:asc,name:desc`; parsed into composable Prisma `orderBy` array; no hardcoded sort columns; validated against allowed sort fields whitelist

- **ORM-level field selection**
  - Business: mobile clients and BFF can request minimal payloads to reduce bandwidth
  - Developer: `?fields=id,name,price`; parsed into Prisma `select` object; DB only fetches requested columns; field whitelist prevents selecting sensitive fields

- **Advanced filtering**
  - Business: every product listing endpoint supports granular filters — price range, category, stock status
  - Developer: `minPrice`, `maxPrice`, `categoryId`, `inStock` query params; composable Prisma `where` clauses built per param; safely combined with cursor pagination

- **ETag and conditional requests**
  - Business: returning customers' browsers serve product pages from cache without contacting the server — faster and cheaper
  - Developer: SHA1 hash of response body as `ETag` header; `If-None-Match` checked on incoming request; 304 No Content (zero body) returned on match; compatible with CDN caching

- **SSE order status stream**
  - Business: customers see live order status without polling — real time without WebSocket complexity
  - Developer: `GET /orders/:id/status-stream`; `text/event-stream` content type; in-process `OrderStatusRegistry` holds `Map<orderId, Subject<MessageEvent>>`; Redis Pub/Sub channel per order syncs across backend replicas; backend pushes events to subscriber via `Subject.next()`; `Connection: keep-alive`; `X-Accel-Buffering: no` header prevents Nginx buffering bytes

- **WebSocket admin real-time feed**
  - Business: admins see every new order appear instantly on the admin dashboard
  - Developer: Socket.IO on `/admin` namespace; JWT extracted from `socket.handshake.auth.token` in `WsJwtGuard` then verified via `JwtService.verify()`; only `ADMIN` role passes the guard (non-admin gets `WsException`); `ordersGateway.server.emit('order:created', sanitizedOrder)` broadcasts to all admin subscribers; `socket.io-adapter-redis` for multi-instance; admin client shows toast per incoming `order:created` event

- **GraphQL API**
  - Business: frontend clients can fetch exactly the shape of data they need in a single request — no over-fetching or under-fetching
  - Developer: code-first schema with `@ObjectType`, `@Field`, `@Resolver` decorators; NestJS `GraphQLModule`; query depth limited via `graphql-depth-limit`; query complexity limited via `graphql-query-complexity`; `playground: process.env.NODE_ENV !== 'production'` disables GraphiQL in production; `GqlJwtGuard` verifies JWT on resolver level

- **GraphQL DataLoader**
  - Business: product pages with lists of related items load efficiently — no N+1 database queries
  - Developer: `DataLoader` batches all foreign-key lookups within a single GraphQL query into one DB query (batch function called once per request with all collected IDs); `REQUEST`-scoped provider so batching is per HTTP request; N+1 is structurally impossible

- **Automatic Persisted Queries (APQ)**
  - Business: repeated GraphQL queries from the frontend are faster and use less bandwidth
  - Developer: client sends SHA-256 hash of query first (APQ miss → server responds `PersistedQueryNotFound`); client retries with full query text; subsequent requests use hash only; APQ cache stored in Redis; production hardening: pre-register allowed query hashes at build time, reject unknown hashes (whitelist enforcement) — prevents ad-hoc query injection; APQ request body ~50 bytes vs full query body ~500 bytes

- **BFF aggregation**
  - Business: the frontend receives a complete, pre-aggregated response in a single request rather than making multiple calls
  - Developer: gateway service (`GET /bff/product/:id`); `Promise.allSettled` fan-out to backend (product data) and analytics-service (recommendations); user context from `x-user-id` and `x-user-email` headers; partial results returned gracefully

- **gRPC inter-service RPC**
  - Business: internal service-to-service calls (e.g., backend → search-service) are fast, type-safe, and schema-enforced
  - Developer: proto contracts in `/proto/`; NestJS gRPC client/server; binary encoding (smaller payloads than JSON); hard deadlines on all RPC calls; search-service exposes both REST and gRPC interfaces

---

## 27. Promotion DSL & Rules Engine

- **Rule-based promotions without code deploy**
  - Business: the marketing team defines complex promotion logic in the admin UI — conditions, discount amounts, expiry, priority — without any engineering involvement
  - Developer: `PromotionRule` table; priority-ordered evaluation at checkout; `GET|POST|PATCH|DELETE /admin/promotion-rules`; rules stored as DSL strings in DB

- **Discount DSL**
  - Business: promotion conditions read like plain English — "10% off orders over £50 in Electronics" — auditable and understandable by non-engineers
  - Developer: custom language with a full pipeline: Lexer (tokenises the expression string) → Parser (builds AST nodes) → Interpreter (evaluates AST against live cart context); Microkernel Interpreter pattern — interpreter is swappable without changing the rule storage layer

- **Rule evaluation at checkout**
  - Business: all active promotions are checked automatically at checkout — customers always get the best applicable discount
  - Developer: all `isActive = true` rules loaded; evaluated in priority order; first matching rule wins; DSL interpreter runs in-process (no external service); result applied to order total before payment intent creation

---

## 28. Event-Driven Architecture

- **In-process domain events vs integration events**
  - Business: modules within the backend react to each other's actions without tight coupling; notifications to external services are guaranteed-delivered separately from the synchronous request
  - Developer: two distinct event channels — intentional, not accidental: (1) **Domain events** via EventEmitter2 (in-process, synchronous, module decoupling, zero latency, lost on crash — acceptable for non-critical reactions like metric counters); (2) **Integration events** via Transactional Outbox → RabbitMQ (cross-service, async, at-least-once, durable — required for notifications, analytics, CDC sync); mixing the two is a correctness bug, not a style issue

- **CQRS read models**
  - Business: product ratings and review counts are always available instantly — no expensive aggregation query on every page load
  - Developer: `ProductRating` aggregate maintained by event handler; `ReviewApprovedEvent` triggers BullMQ job to recompute AVG + COUNT via `LEFT JOIN` (not `GROUP BY` across all reviews — avoids full-table scan as review count grows); read model updated asynchronously (eventual consistency); product listing reads from denormalised `rating` column

- **Order state machine**
  - Business: orders move through a predictable lifecycle; impossible status jumps are prevented automatically
  - Developer: typed as `Record<OrderStatus, OrderStatus[]>` transition map; `PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED / CANCELLED / REFUNDED`; any invalid transition throws `BadRequestException` before any DB write; every valid transition appends an `OrderEvent` entry

- **Order event log**
  - Business: every status change and payment event on an order is permanently recorded — full audit trail for disputes and support
  - Developer: `OrderEvent` append-only table; PostgreSQL `RULE` blocks `UPDATE` and `DELETE` at DB level (not application level); 7 event types: `OrderPlaced`, `PaymentConfirmed`, `OrderProcessing`, `OrderShipped`, `OrderDelivered`, `OrderCancelled`, `RefundInitiated`; `GET /orders/:id/events` exposes the log; immutable by construction

- **True event sourcing**
  - Business: the complete history of any order can be replayed — useful for debugging complex fulfilment issues and future analytics projections
  - Developer: `OrderProjectionService` folds over all `OrderEvent` records to reconstruct current state; snapshot table stores state at checkpoints (every N events); replay re-derives state from scratch; new projections can be backfilled from existing event log

---

## 29. Microservices Architecture

- **Strangler Fig pattern**
  - Business: new microservices are introduced gradually — the monolith stays stable while traffic is incrementally shifted
  - Developer: auth-service, notification-service, search-service, analytics-service extracted incrementally from `backend`; gateway routes traffic; monolith serves remaining endpoints unchanged during migration

- **Service topology**
  - Business: each service can be scaled, deployed, and updated independently
  - Developer:
    - `backend` — NestJS monolith, port 4000, PostgreSQL + Prisma, main business logic
    - `auth-service` — NestJS, port 3006, RS256 JWT, OAuth2, TOTP 2FA
    - `notification-service` — NestJS, port 3004, RabbitMQ consumer, Nodemailer, Handlebars templates
    - `search-service` — NestJS, port 3005, OpenSearch, REST + gRPC
    - `analytics-service` — NestJS, Kafka consumer, ClickHouse OLAP, recommendations
    - `gateway` — NestJS BFF, port 3000, JWT verification + header injection, HTTP proxy, aggregation
    - `frontend` — Next.js App Router, SSG/ISR/SSR, port 3001

- **Database per service**
  - Business: each service can evolve its database schema independently without coordinating with other teams
  - Developer: each service owns its PostgreSQL schema; no cross-service DB joins; data shared exclusively via events or APIs; analytics-service owns ClickHouse; all services share Redis but via separate key namespaces

- **Service-to-service authentication**
  - Business: downstream services trust that user identity has already been verified before a request reaches them
  - Developer: gateway verifies RS256 JWT on every inbound request; extracts user id and email; injects `X-User-Id` and `X-User-Email` headers; downstream services read headers directly without re-verifying the JWT

- **Microkernel pattern**
  - Business: the payment provider can be swapped (Stripe → PayPal) without touching any order or checkout business logic
  - Developer: `IPaymentProvider` interface defines the contract; `PaymentPluginRegistry` holds registered implementations; concrete `StripePaymentProvider` implements the interface; checkout service depends only on `IPaymentProvider`

- **Pipe and Filter pattern**
  - Business: order processing steps are modular and independently testable — easier to add, remove, or reorder steps
  - Developer: 11 named `IOrderFilter` pipeline steps (validate stock, apply coupon, calculate tax, charge payment, send events, etc.); each filter accepts and returns the same context object; replaces a monolithic saga function; each filter independently unit-testable

- **Shared types package**
  - Business: all services agree on what every event looks like — no mismatches between what's published and what's consumed
  - Developer: `@repo/shared-types` npm workspace package; exports event interfaces, exchange names, routing keys, queue names as typed constants; imported by backend, auth-service, notification-service, analytics-service

---

## 30. Infrastructure & Local Development

- **CDC — Change Data Capture with Debezium + Redpanda**
  - Business: product data changes in PostgreSQL are automatically reflected in the search index in near real time — no manual sync step needed
  - Developer: Debezium 2.7 Kafka Connect connector subscribes to Postgres WAL (requires `wal_level=logical`); emits row-level before/after CDC events to Redpanda (Kafka-compatible broker); topic naming: `ecommerce.public.Product` (Debezium convention); search-service consumes CDC events via `kafkajs` and indexes changed products into OpenSearch; Redpanda also carries `order.placed` analytics events consumed by analytics-service into ClickHouse; eliminates application-level Outbox writes for search sync

- **Multi-stage Docker builds**
  - Business: production Docker images are small, secure, and fast to pull
  - Developer: `builder` stage installs dev dependencies and compiles TypeScript; `runner` stage copies only compiled output and production dependencies; non-root user in runner; layer cache optimised with least-changing layers first (package.json before source)

- **Docker Compose full stack**
  - Business: any developer can spin up the entire platform locally with a single command — no manual service setup
  - Developer: `docker-compose.yml` includes: nginx, backend, auth-service, notification-service, search-service, analytics-service, gateway, frontend, postgres, pgbouncer, redis, rabbitmq, kafka, zookeeper, clickhouse, opensearch, jaeger, prometheus, grafana, loki, promtail, mailpit; Mailpit: SMTP on `:1025`, web UI on `:8025`; hot reload via volume mounts; `backend_node_modules` Docker named volume isolates container's `node_modules` from host (prevents host/container binary mismatch); Prisma client must be regenerated inside container (`prisma generate`), not on host; opt-in read replica: `docker-compose.replica.yml` adds a PostgreSQL streaming replica alongside the primary (not included in default compose to keep local setup light)

- **PgBouncer**
  - Business: the database handles many more concurrent application connections without exhausting PostgreSQL connection slots
  - Developer: transaction-mode pooling on `:6432` (mapped to `:5434` on host); all services use `DATABASE_URL` pointing at PgBouncer; Prisma migrations and advisory locks use `DIRECT_DATABASE_URL` (direct PostgreSQL connection, bypasses PgBouncer — DDL requires session mode); pool stats exported to Prometheus via PgBouncer exporter on `:9127`; critical alert: `pgbouncer_pools_client_waiting > 0` signals pool saturation

- **Nginx reverse proxy**
  - Business: a single hostname serves all services — no port-juggling for developers or users
  - Developer: `location /api` → backend (port 4000); `location /auth` → auth-service (port 3006); `location /` → frontend (port 3001); rate limiting zones; upstream keepalive; SSL termination in production

- **Graceful shutdown**
  - Business: rolling deployments and service restarts don't drop in-flight requests
  - Developer: NestJS `enableShutdownHooks()`; SIGTERM handler sets readiness probe unhealthy immediately (prevents new traffic); in-flight requests drained; BullMQ workers stop accepting new jobs; 10-second forced `process.exit(0)` safety timer to prevent zombie containers if drain stalls

- **Health checks**
  - Business: orchestration systems (Docker, Kubernetes) know when a service is ready to serve traffic and when it's not
  - Developer: `@nestjs/terminus`; `GET /api/health/live` (liveness — is process alive); `GET /api/health/ready` (readiness — is DB, Redis, RabbitMQ connected); different failure semantics: liveness failure → restart; readiness failure → remove from load balancer

- **Blue-green deployment**
  - Business: new versions of the application deploy without any downtime — users never see an error page during a release
  - Developer: two identical environments (blue and green) behind Nginx; deploy to idle environment; run smoke tests; atomic Nginx `upstream` switch; drain window for in-flight requests on old environment; rollback by switching back

- **Canary deployment**
  - Business: new features are released to a small percentage of traffic first — problems are caught before affecting all users
  - Developer: Argo Rollouts + Istio weighted traffic splitting; Prometheus `CanaryAnalysis` checks error rate and latency on canary; automatic rollback if metrics breach thresholds; progressive traffic shift (5% → 20% → 50% → 100%)

- **Leader election**
  - Business: scheduled background jobs (recommendation recompute, partition creation) run exactly once across all service replicas — no duplicates
  - Developer: Redis lease with TTL; candidate services attempt `SET NX`; winner holds lease for duration of cron run; other instances skip; lease released on completion; automatic failover if leader crashes (lease expires)

---

## 31. Kubernetes

- **Kustomize overlays**
  - Business: the same manifests work for local development, staging, and production — no copy-paste configuration
  - Developer: `base/` contains shared manifests; `overlays/local`, `overlays/staging`, `overlays/production` patch environment-specific values (replica counts, resource limits, image tags, secrets); `kubectl apply -k overlays/production`

- **Rolling updates**
  - Business: deploying a new version happens with zero downtime — old pods stay up until new ones are healthy
  - Developer: `strategy: RollingUpdate`; `maxUnavailable: 0`; `maxSurge: 1`; new pod must pass readiness probe before old pod is terminated; no user requests dropped during rollout

- **Liveness and readiness probes**
  - Business: Kubernetes automatically restarts unhealthy services and removes them from load balancing when they're not ready
  - Developer: `/api/health/live` for liveness (restart if failing); `/api/health/ready` for readiness (stop sending traffic if failing); different failure semantics and thresholds; Terminus health indicators check DB, Redis, RabbitMQ

- **Resource requests and limits**
  - Business: services get the resources they need without starving each other
  - Developer: requests set at 50% of limits for Burstable QoS class; allows CPU bursting; prevents OOMKill under steady-state load; limits enforce hard ceiling; HPA scales out before limits are hit

- **ConfigMaps and Secrets**
  - Business: configuration is separated from application code — no secrets in container images
  - Developer: non-sensitive config in ConfigMaps (log level, feature flags, URLs); sensitive values (DB passwords, JWT keys, Stripe keys) in Secrets; base64-encoded in manifests; mounted as environment variables

- **StatefulSets for infrastructure**
  - Business: databases and queues maintain stable identities and persistent storage across pod restarts
  - Developer: PostgreSQL, Redis, RabbitMQ deployed as StatefulSets; stable pod names (`postgres-0`); PersistentVolumeClaims for data; headless Service for DNS-based discovery

- **Prisma migration Job**
  - Business: database migrations run automatically before the application starts — no manual steps during deployment
  - Developer: Kubernetes Job runs `prisma migrate deploy` to completion; `DIRECT_DATABASE_URL` bypasses PgBouncer for session-mode DDL; app Deployment waits (init container) until migration Job completes

- **Horizontal Pod Autoscaler**
  - Business: the platform scales up automatically under high traffic and back down during quiet periods
  - Developer: HPA based on CPU utilisation (target 70%); `scaleDown.stabilizationWindowSeconds` prevents flapping; scales between `minReplicas` (2) and `maxReplicas` configured per service

- **NGINX Ingress Controller**
  - Business: HTTPS and domain routing are handled automatically — services don't manage TLS certificates
  - Developer: Ingress resource with TLS termination; rate limiting annotations (`nginx.ingress.kubernetes.io/limit-rps`); path-based routing to services; cert-manager for automatic Let's Encrypt certificates in production

- **Init containers**
  - Business: services only start after their dependencies are confirmed ready — no connection errors on pod startup
  - Developer: `initContainers` with `wait-for-postgres` and `wait-for-redis` scripts; loops `pg_isready` / `redis-cli ping` until success; main container not started until all init containers complete

- **Istio service mesh and sidecar pattern**
  - Business: all service-to-service traffic is encrypted in transit (mTLS) automatically — no TLS code in application services
  - Developer: Istio injects Envoy proxy sidecars into every pod; mTLS enforced between all services inside the cluster; sidecar captures all inbound/outbound traffic for observability (metrics, traces); required by Argo Rollouts for canary traffic splitting via `VirtualService`

- **Sealed Secrets for production**
  - Business: production secrets can be committed to the git repository safely — no secrets in plaintext in source control
  - Developer: `SealedSecret` custom resource encrypts Secret values with a cluster-specific public key; only the cluster's controller can decrypt; safe to store in git; `k8s/overlays/production` uses Sealed Secrets; local and staging use manually created K8s Secrets

- **ExternalName Services for managed cloud services**
  - Business: in production the platform uses managed database/cache services (AWS RDS, ElastiCache) rather than in-cluster StatefulSets — better reliability, backups, and maintenance
  - Developer: `k8s/overlays/production/patches/external-services.yaml` patches PostgreSQL, Redis, and RabbitMQ StatefulSets to `ExternalName` Services pointing to managed service hostnames; application code connects to the same DNS name across all environments — no code change needed

- **ArgoCD GitOps**
  - Business: every change to infrastructure configuration is tracked in git — no manual `kubectl apply` on production servers
  - Developer: ArgoCD watches the `k8s/` directory in git; reconciles cluster state with desired state on every commit; Argo Rollouts CRD handles progressive delivery; CI updates image tags via `kustomize edit set image` then ArgoCD syncs; scoped RBAC service account limits CI permissions to the `ecommerce` namespace only

---

## 32. CI/CD

- **GitHub Actions matrix build**
  - Business: CI runs only for changed services — fast feedback without rebuilding everything
  - Developer: `paths-filter` action detects which service directories changed; matrix strategy builds only affected services in parallel; `ci.yml` covers: backend, auth-service, notification-service, search-service, frontend

- **Real databases in CI**
  - Business: integration tests pass in CI only if they work against a real database — no false positives from mocks
  - Developer: PostgreSQL and Redis started as GitHub Actions `services` containers; Testcontainers for per-test isolated Postgres instances; `global-setup.ts` / `teardown.ts` for E2E test lifecycle; no in-memory mocks for persistence layer

- **Migration safety check**
  - Business: unsafe database migrations are blocked before they reach production — no accidental downtime from DDL
  - Developer: CI script parses migration SQL files; blocks: `DROP COLUMN`, `DROP TABLE`, `ALTER TYPE`, `CREATE INDEX` without `CONCURRENTLY`; fails the pipeline with actionable message if unsafe pattern detected

- **Docker layer caching**
  - Business: CI builds are fast — unchanged layers are reused from the previous build
  - Developer: GitHub Actions `cache` action with Docker layer cache; Dockerfile ordered from least-changing (base image, package.json, npm ci) to most-changing (source code); typical cache hit rate >80%

- **Pipeline stages**
  - Business: every pull request is verified for correctness before merging
  - Developer: lint → type-check → unit tests → integration tests → Docker build → push to registry → deploy; each stage gates the next; failures are reported with file and line context

- **Automated backups and restore drills**
  - Business: data is backed up daily and restores are verified weekly — no surprises if recovery is needed
  - Developer: cron job runs `pg_dump` daily; backups stored off-site (S3-compatible); restore drill script verified weekly in a separate environment; documentation in `DEPLOYMENT.md`

---

## 33. Security

- **RS256 JWT**
  - Business: user identity is cryptographically verified across all services — no service needs to call the auth database on every request
  - Developer: asymmetric signing; private key lives exclusively in auth-service; public key distributed via `GET /.well-known/jwks.json`; all services download public key on startup and verify tokens locally; `private.pem` and `public.pem` in repo root (never committed; generated locally)

- **PKCE OAuth2**
  - Business: Google login is secure against auth code interception attacks
  - Developer: `code_verifier` (random 128-byte base64url string) generated client-side; `code_challenge = SHA-256(verifier)` sent in auth request; verifier sent with token exchange; Google verifies challenge matches — code interception is useless without the verifier

- **TOTP 2FA**
  - Business: users who enable 2FA need both their password and a rotating code from their phone — accounts are protected even if passwords are leaked
  - Developer: RFC 6238 TOTP; `otplib` library; 30-second rotating codes; `POST /auth/2fa/setup` returns TOTP secret + `otpauth://` URI for QR code; `POST /auth/2fa/verify` rate-limited 5/5 min; backup codes generated at enable time

- **Audit log**
  - Business: all sensitive administrative and security actions are permanently recorded — who did what and when
  - Developer: `AuditLog` table; PostgreSQL `RULE` on the table blocks `UPDATE` and `DELETE` at the database level (cannot be bypassed by application code); `actor`, `resource`, `action`, `timestamp`, `ip`, `metadata` columns; quarterly partitioned

- **RBAC + ABAC**
  - Business: customers, vendors, and admins each see and can do only what their role permits; resource-level rules ensure vendors can only manage their own products regardless of role
  - Developer: three roles: `USER`, `VENDOR`, `ADMIN`; role stored in JWT claims; `@Roles(Role.ADMIN)` decorator + `RolesGuard` enforces at controller level; ABAC (Attribute-Based Access Control) checks in service layer verify ownership (e.g., `product.vendorId === userId`); both layers are needed — RBAC for role gates, ABAC for resource ownership

- **Refresh token rotation**
  - Business: stolen refresh tokens are useless after first use; users are limited to 5 active sessions — forgotten old devices don't accumulate stale tokens indefinitely
  - Developer: on every `POST /auth/refresh` call: old refresh token deleted, new token created and returned; replay of rotated token is rejected immediately; per-user cap of 5 active refresh tokens — creating a 6th prunes the oldest session from DB

- **AES-256-GCM encryption at rest**
  - Business: sensitive personal data stored in the database is encrypted — unreadable even if the DB is compromised
  - Developer: Prisma middleware encrypts/decrypts configured sensitive fields transparently; ciphertext format: `{version}:{iv}:{authTag}:{data}` (version prefix enables zero-downtime key rotation); AES-256-GCM with unique IV per value prevents ciphertext comparison attacks; encrypted columns cannot be indexed, used in `WHERE` clauses, or included in FTS queries — design data model accordingly

- **Input validation**
  - Business: malformed or malicious input is rejected at the API boundary — never reaches business logic or the database
  - Developer: `class-validator` DTOs on all endpoints; `ValidationPipe` with `whitelist: true` (strips unknown fields) and `forbidNonWhitelisted: true` (rejects unknown fields); Prisma ORM parameterised queries prevent SQL injection throughout

---

## 34. Testing Strategy

- **Pact consumer-driven contract tests**
  - Business: the frontend and each microservice can evolve independently without accidentally breaking each other — contract mismatches are caught in CI, not in production
  - Developer: consumer (frontend) writes tests that generate a pact file (expected request/response shapes); provider (backend) runs Pact Verifier against the published file; for multi-team setups: Pact Broker (self-hosted) or PactFlow (SaaS) acts as central contract registry, enabling consumers and providers to deploy independently as long as contracts are verified; contracts stored in `/pacts/`

- **End-to-end user journey tests**
  - Business: complete flows (register → browse → add to cart → checkout → order) are verified on every PR; tests assert real business outcomes, not just HTTP status codes
  - Developer: Testcontainers starts isolated PostgreSQL + Redis per test run (no `.env.test`; containers configured in-code); `global-setup.ts` / `teardown.ts` manage lifecycle; parallel runs supported; E2E assertions include DB side effects: order row exists with correct status, `OrderItem` rows created, `ProductVariant.stock` decremented, `AuditLog` entry written, BullMQ jobs enqueued — not just HTTP 201

- **Mutation testing**
  - Business: the test suite itself is tested — weak assertions that would miss real bugs are identified and flagged
  - Developer: Stryker mutates source code (changes `>` to `>=`, deletes statements, flips booleans, swaps `&&`/`||`); runs tests after each mutation; "survived" mutant = test that didn't catch the change = weak assertion; CI integration: run on a weekly schedule (not per-PR — full mutation run is slow), fail build if mutation score drops below threshold; example target: `OrderSagaService` `if (inventory.status === 'rejected')` — a survived mutation here is critical

- **MSW API mocking**
  - Business: frontend tests run reliably without depending on a live backend
  - Developer: MSW intercepts `fetch` at the network level; realistic request/response simulation; shared handlers between Jest tests and Storybook stories; no `jest.mock()` for HTTP calls

- **Playwright E2E**
  - Business: user journeys in the actual browser are verified — not just API calls
  - Developer: Playwright tests run against the Next.js app; user flows (browse, cart, checkout); visual regression screenshots stored as CI artefacts; `page.metrics()` captures performance data per page; accessibility audit on each route

- **Lighthouse CI**
  - Business: Core Web Vitals (LCP, CLS, FID) regressions are caught before shipping — user experience quality is enforced
  - Developer: Lighthouse CI runs against built Next.js app; performance budget configured; build fails if LCP, CLS, or total bundle size exceeds threshold; reports stored as CI artefacts

- **jest-axe accessibility testing**
  - Business: WCAG accessibility violations in React components are caught automatically in CI
  - Developer: `expect(await axe(container)).toHaveNoViolations()` assertion in every component test; catches missing ARIA labels, contrast issues, heading hierarchy errors before they reach the browser
