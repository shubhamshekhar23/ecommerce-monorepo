# Deferred Polish — Todo

Things that are intentionally skipped for now but worth coming back to. Each item notes which phase it belongs to and why it was deferred.

---

## Phase 12 — Service Mesh (Istio / Linkerd)

### Add mTLS, Traffic Shaping, and Canary at the Network Layer

**What:** Deploy a service mesh sidecar (Istio or Linkerd) alongside every Pod so all service-to-service traffic is encrypted and observable without application code changes.

- mTLS between every service pair automatically — no certificate management in app code
- Traffic shaping via `VirtualService` / `HTTPRoute` — route 10% of traffic to a canary Pod, ramp up gradually
- Automatic retries, timeouts, and circuit breaking at the network layer (complements the app-level circuit breaker already in place)
- Distributed tracing and per-route latency metrics out of the box via Envoy sidecar
- Replace the current manual canary deploy script with mesh-level traffic weight rules

**References:** `k8s/`, `apps/backend/src/modules/circuit-breaker/`

---

## Phase 12 — GitOps (Argo CD + Argo Rollouts)

### Replace kubectl-in-CI with Argo CD Reconciliation and True Canary Deploys

**What:** Shift from CI pushing `kubectl apply` commands to Argo CD watching the `k8s/` directory and reconciling cluster state automatically. Add Argo Rollouts for percentage-based canary promotions with automated analysis.

- CI pushes a new image tag to the git repo (via `kustomize edit set image`) — that is the only CI→cluster interaction
- Argo CD detects the git change and applies it — cluster state is always a reflection of git state
- Argo Rollouts replaces standard `Deployment` for canary-capable services; promotes from 10% → 50% → 100% based on Prometheus error-rate analysis gates
- Automatic rollback if error rate or latency exceeds threshold during rollout
- Full audit trail — every cluster change is a git commit, not a CI log

**References:** `k8s/overlays/`, `.github/workflows/ci.yml`

---

## Phase 12 — Network Policies (Zero-Trust Pod Networking)

### Restrict Pod-to-Pod Traffic with Kubernetes Network Policies

**What:** Add `NetworkPolicy` manifests so Pods can only talk to the services they legitimately need. By default Kubernetes allows all Pod-to-Pod traffic — a compromised Pod can reach any other Pod in the cluster.

- Default-deny ingress and egress for all Pods in the `ecommerce` namespace
- Allow backend → postgres, backend → redis, backend → rabbitmq explicitly
- Allow gateway → backend, gateway → auth-service, gateway → search-service, gateway → notification-service
- Allow auth-service → postgres, auth-service → redis
- Deny everything else — a compromised notification-service cannot reach postgres directly
- Pairs with service mesh mTLS for defence in depth

**References:** `k8s/base/`

---

## Phase 12 — Pod Disruption Budgets

### Guarantee Minimum Replicas During Node Maintenance

**What:** Add `PodDisruptionBudget` manifests for every service so Kubernetes cannot evict too many Pods simultaneously during node drain, cluster upgrades, or autoscaler scale-down events.

- Set `minAvailable: 1` for each service — at least one replica must stay up during voluntary disruptions
- Prevents a node drain from taking down all replicas of a service if they happen to be co-located
- Required before enabling Cluster Autoscaler — without PDBs, scale-down can cause accidental full outages
- Low effort, high safety — each PDB is ~8 lines of YAML

**References:** `k8s/base/`

---

## Phase 13 — KEDA (Event-Driven Autoscaling)

### Scale Notification-Service on RabbitMQ Queue Depth

**What:** Replace CPU-based HPA for notification-service with KEDA scaling on RabbitMQ queue depth. When the queue is empty, scale to zero. When a burst of order events arrives, scale up instantly.

- KEDA `ScaledObject` targets the `order.placed` queue in RabbitMQ — queue depth is the scaling signal
- Scale to zero when idle (saves cost), scale to N replicas within seconds when messages accumulate
- CPU-based scaling is wrong for queue consumers — a consumer waiting for messages uses near-zero CPU even when the queue is full; KEDA makes the right metric the scaling metric
- Same pattern can be applied to search-service (OpenSearch indexing backlog) once Kafka CDC is in place

**References:** `apps/notification-service/`, `k8s/base/`, Phase 11 Kafka TODO

---

## Phase 13 — Cluster Autoscaler / Karpenter

### Automatically Add and Remove Nodes Based on Pod Pressure

**What:** Deploy Cluster Autoscaler (or Karpenter on AWS) so the cluster adds Nodes when Pods are unschedulable due to resource pressure, and removes underutilised Nodes to reduce cost.

- Cluster Autoscaler watches for `Pending` Pods and triggers node group scale-up
- Karpenter (AWS-native) is faster — provisions nodes in ~60s vs ~3min for CA, and can right-size node types per workload
- Pairs with KEDA — KEDA scales Pods up, Cluster Autoscaler scales Nodes up to fit them
- Must have Pod Disruption Budgets in place before enabling scale-down (see Phase 12)
- Configure node taints and tolerations to separate stateful workloads (Postgres) from stateless services

**References:** `k8s/`, Phase 12 PDB TODO

---

## Phase 14 — Multi-Region Deployment

### Independent Clusters Per Region with Global Load Balancing

**What:** Deploy the full stack into two or more regions (e.g. `us-east-1` and `eu-west-1`). Route users to the nearest region via a global load balancer. Handle data residency, cross-region replication, and failover.

- Independent Kubernetes clusters per region — no cross-region control plane dependency
- Global load balancer (AWS Global Accelerator, Cloudflare, or GCP Cloud Load Balancing) routes to nearest healthy region
- Postgres streaming replication cross-region for read replicas; writes go to primary region
- Redis per region (read-only replica from primary); session tokens must work across regions — use stateless JWT (already done)
- Kafka MirrorMaker 2 replicates event topics cross-region for analytics consumers
- Active-passive initially (one region handles writes, other handles reads) → active-active once conflict resolution strategy is defined
- Data residency: EU users' PII must stay in EU region — requires per-region Postgres primaries and routing rules

**References:** `k8s/overlays/`, `docker-compose.replica.yml`, Phase 11 Kafka TODO

---

## Phase 11 — Auth Service Own Database

### Give Auth-Service Its Own Database

**What:** Migrate `User`, `RefreshToken`, and `Session` tables out of the backend's Postgres into a dedicated auth-service database. Publish user lifecycle events (created, updated, deleted) to Kafka so downstream services maintain lightweight local copies of the user fields they need rather than querying auth cross-service.

**Why:** In a real ecommerce platform, auth scales differently — millions of token validations per second vs thousands of orders per minute. Separate DB means separate scaling, separate migration pipeline, and a dedicated team can own identity without touching backend schema. Without the Kafka fan-out step, every service (orders, reviews, notifications) needs to call auth-service for user data on every request — adding latency and a cross-service failure point.

**How to implement:**
- Add a second Postgres instance (`postgres-auth`) to docker-compose with its own volume
- Move `User`, `RefreshToken` models to a new Prisma schema in `apps/auth-service`
- Remove those tables from the backend schema; replace direct `prisma.user` calls in backend with a local `UserSummary` table (id, email, firstName, role) populated via Kafka user events
- Publish `user.created`, `user.updated`, `user.deleted` events from auth-service to Kafka on every state change
- Backend and notification-service consume those events to keep their local user copy in sync

**Why deferred:** Requires Phase 11 Kafka pipeline to be in place first — without the fan-out, splitting the DB just creates cross-service API coupling which is worse than a shared DB.

**References:** `apps/auth-service/`, `apps/backend/prisma/schema.prisma`, Phase 11 Kafka TODO

---

## Phase 10 — CDC with Debezium + Kafka (Search Sync)

### Replace RabbitMQ Product Events with Debezium CDC Pipeline

**What:** Use Debezium to watch the Postgres WAL and stream every product table change to a Kafka topic. Replace the current `search-service` RabbitMQ subscription with a Kafka consumer that reads with offset tracking.

**Why this matters:** The current `product.events` RabbitMQ pattern has a silent data loss risk — if search-service is down when a product is updated, the message is gone and the search index is permanently out of sync with no indication anything went wrong. Kafka's durable log means the consumer picks up exactly where it left off after any downtime and can replay from the beginning to rebuild the index from scratch.

**RabbitMQ stays for notifications:** CDC replaces only the search sync path. Order and user events that drive notification emails remain on RabbitMQ — those are application-layer business events with explicit intent, not data observations. CDC + Kafka and RabbitMQ solve different problems and coexist.

**What you will learn:**
- CDC (Change Data Capture) and how Debezium reads Postgres WAL without touching application code
- Kafka as a durable event log vs RabbitMQ as a message broker — when each is the right tool
- Consumer groups and offset tracking — consumers replay missed events instead of losing them
- At-least-once delivery guarantees and idempotent consumers

**How to implement:**
- Add Debezium and Kafka (+ Zookeeper or KRaft) to `docker-compose.yml`
- Configure Debezium Postgres connector to watch the `Product` and `ProductVariant` tables
- Create a `product.changes` Kafka topic that receives all row-level change events from Debezium
- Replace `RabbitMQModule` in search-service with `kafkajs` consumer reading from `product.changes`
- Handle insert/update/delete CDC event types and map them to OpenSearch index/update/delete operations
- Add `KAFKA_BROKER_URL` to search-service environment in docker-compose

**References:** `apps/search-service/src/app.module.ts`, `apps/search-service/src/search/`, `docker-compose.yml`

---

## Phase 11 — Real-time Analytics & Recommendations Pipeline

### Kafka Clickstream Pipeline with Product Recommendations

**What:** Stream user behaviour events (product views, searches, add-to-cart, purchases) to Kafka at high volume. Build two independent consumers: an analytics aggregator that computes trending products and popular categories, and a recommendations engine that derives "users who viewed X also viewed Y." Serve results from Redis for fast product page responses.

**Why Kafka and not RabbitMQ:** This is the textbook Kafka use case. Event volume is too high for RabbitMQ (thousands of events per minute across all users). Multiple independent consumers need to read the same events at their own pace — analytics and recommendations both subscribe to the same clickstream topic without interfering with each other. Replay capability means you can backfill a new recommendation model against 30 days of historical events.

**What you will learn:**
- Clickstream design — what events to emit, what payload shape works for multiple consumers
- Kafka consumer groups — analytics consumer and recommendations consumer read the same topic independently
- Stream aggregation — computing counts and co-occurrence from a live event stream
- High-volume event ingestion patterns used by Amazon, Shopify, Netflix
- Kafka vs RabbitMQ in the same app — both coexist, each doing what it is best at

**How to implement:**
- Add a `ClickstreamMiddleware` (or interceptor) to backend that publishes view/search/cart/purchase events to a `user.behaviour` Kafka topic — fire-and-forget, must not block the response
- Add an `analytics-service` that consumes `user.behaviour`, aggregates counts with a sliding window, and writes trending products and popular categories to Redis with a TTL
- Add a `recommendations-service` (or module inside search-service) that builds a co-occurrence matrix from view events and writes `product:<id>:also-viewed` sets to Redis
- Expose a `GET /products/:id/recommendations` endpoint on the backend that reads from Redis
- Add a `GET /products/trending` endpoint backed by the Redis analytics aggregates

**References:** `apps/search-service/`, `apps/backend/src/modules/products/`, `docker-compose.yml`

---

## CI — Matrix Workflow for All Services

### Replace Per-File CI with a Single Matrix Workflow

**What:** Replace the current single-service `ci.yml` (backend only) with a matrix workflow that detects which services changed on each push and runs lint → type-check → build → push → deploy only for those services. One workflow file covers all five services.

**Current state:** CI only covers `apps/backend/**`. Changes to `auth-service`, `notification-service`, `search-service`, or `gateway` are never linted, type-checked, built, or pushed. If you change `auth-service` and push, no new Docker image is built — Kubernetes silently keeps running the old image.

**Why matrix over separate files:**
- One file to maintain instead of five — adding a new service is one line in the matrix, not a new workflow file
- The changed-services detection step is explicit and easy to read
- All services follow identical pipeline steps; inconsistencies can't creep in across files
- GitHub shows one workflow run per push, not five separate ones

**Pipeline shape:**

```
git push
    │
    ├── detect-changes job
    │     Outputs a JSON matrix of which services changed:
    │     e.g. {"include":[{"service":"auth-service"},{"service":"gateway"}]}
    │
    ├── lint job (matrix)
    │     Runs for each changed service in parallel
    │     Steps: npm ci → build shared-types → type-check → format:check
    │
    ├── build job (matrix, needs: lint)
    │     Runs for each changed service in parallel
    │     Steps: docker buildx → push ghcr.io/<repo>/<service>:sha-<hash>
    │
    └── deploy job (matrix, needs: build, push only)
          Steps: kustomize edit set image → kubectl apply -k → kubectl rollout status
```

**How to implement:**

- Add `type-check`, `format:check`, and `ci` scripts to `package.json` of each service (`auth-service`, `notification-service`, `search-service`, `gateway`) matching the pattern in `apps/backend/package.json`
- Create `.github/workflows/ci-services.yml` with four jobs:
  - `detect-changes`: use `dorny/paths-filter` action to check which `apps/<service>/**` paths changed; output a dynamic matrix JSON
  - `lint`: matrix job over changed services; runs `npm ci` at root → `build shared-types` → `prisma generate` (for backend) → service-level `type-check` and `format:check`
  - `build`: matrix job over changed services; builds `apps/<service>/Dockerfile` with monorepo root as context; pushes to GHCR with `sha-<hash>` and branch tags
  - `deploy-staging` / `deploy-production`: matrix job; runs `kustomize edit set image` to pin the SHA tag then `kubectl apply -k k8s/overlays/<env>`; gates on `kubectl rollout status deployment/<service>`; only backend runs `prisma migrate deploy`
- Add kustomization image entries for `auth-service`, `notification-service`, `search-service` to `k8s/overlays/staging/kustomization.yaml` and `k8s/overlays/production/kustomization.yaml` (gateway entry already exists)
- Keep `ci.yml` (backend) in place or fold backend into the same matrix — either approach works; folding it in means one file for everything

**References:** `.github/workflows/ci.yml`, `apps/*/package.json`, `apps/*/Dockerfile`, `k8s/overlays/staging/`, `k8s/overlays/production/`

---

## Phase 5 — Observability

### Full Log-Trace Correlation (Pino → OpenTelemetry Log Bridge)

**What:** Inject `trace_id` and `span_id` into every Pino log line so that clicking a span in Grafana's Jaeger panel queries Loki for the exact logs of that specific request — not just all logs in that time window.

**Current state:** `tracesToLogsV2` is configured in `grafana/provisioning/datasources/jaeger.yml` with `filterByTraceID: true`. Grafana attempts to filter Loki by trace ID, but since Pino does not emit `trace_id`, it falls back to a ±1 minute time-window query. This works fine under low traffic but becomes noisy when many concurrent requests overlap in the same window.

**How to implement:**
- Use OpenTelemetry's Log Bridge API (`@opentelemetry/api-logs` + `@opentelemetry/sdk-logs`)
- Hook into Pino's transport layer to read the active OTel span context and append `trace_id` and `span_id` to each log record
- Ensure the OTel context propagates correctly across async boundaries (already handled by `AsyncLocalStorage` via the OTel SDK)
- Once log lines contain `trace_id`, the Grafana `filterByTraceID` filter becomes exact — three pillars fully cross-linked

**Why deferred:** Time-window fallback is sufficient for learning and local load testing. The real pain is only felt under high concurrent traffic where logs from multiple requests overlap. Revisit in Phase 10/11 when doing serious performance work.

**References:** `apps/backend/src/tracing.ts`, `docs/features/phase-5-observability.md`

---

## Phase 7 — Reviews

### Wire Product Listings To `ProductRating`

**What:** Include `avgRating` and `reviewCount` from `ProductRating` in product list/detail/search responses, and load them from the materialized aggregate instead of leaving ratings out of the product APIs.

**Current state:** The reviews module maintains `ProductRating`, but product queries and DTOs do not consume it. `ProductsService` loads images/categories/variants only, and product responses expose no rating fields, so the CQRS read model is not actually used by product listings.

**How to implement:**
- Join or include `ProductRating` in product list/detail/search queries
- Extend `ProductResponseDto` and `ProductSearchResponseDto` with `avgRating` and `reviewCount`
- Map those fields in `ProductsService.mapToResponse(...)` and the search response builder
- Verify frontend product cards/detail pages can consume the new fields without regressions

**Why deferred:** The moderation and aggregate write path exists, but the read model is not yet surfaced where the Phase 7 notes say it should be. This is a completeness gap rather than a blocker for the current backend flows.

**References:** `apps/backend/src/modules/products/products.service.ts`, `apps/backend/src/modules/products/dto/product-response.dto.ts`, `apps/backend/src/modules/reviews/reviews.service.ts`, `docs/phases/phase-7-features.md`

### Keep `ProductRating` In Sync On Review Rejection

**What:** Recompute the materialized aggregate when an approved review is later rejected or otherwise removed from the approved set.

**Current state:** Approving a review emits `review.approved` and recomputes `ProductRating`, but rejecting a review only updates the status. If an already-approved review is rejected, `avgRating` and `reviewCount` can become stale.

**How to implement:**
- Recompute the aggregate inside `rejectReview(...)` when the prior status was `APPROVED`
- Or emit a separate event such as `review.removed_from_approved` and handle recomputation there
- Add tests covering approve → reject transitions and aggregate updates

**Why deferred:** The current flow works for first-time approvals, but state reversals can leave the read model inconsistent. This matters once moderation actions happen after initial approval.

**References:** `apps/backend/src/modules/reviews/reviews.service.ts`, `apps/backend/src/modules/reviews/reviews.handler.ts`, `apps/backend/prisma/schema.prisma`

### Enforce Review Moderation State Transitions

**What:** Restrict moderation actions so reviews follow the intended lifecycle instead of allowing arbitrary approve/reject flips.

**Current state:** `approveReview(...)` and `rejectReview(...)` update by `id` without validating the current status. That means rejected reviews can be approved later, approved reviews can be rejected, and the documented `PENDING -> APPROVED/REJECTED` workflow is not enforced at the service layer.

**How to implement:**
- Add explicit current-state checks before moderation updates
- Decide which transitions are valid and return a clear `BadRequestException` for invalid ones
- Add tests for double-approve, double-reject, and approve-after-reject/reject-after-approve cases

**Why deferred:** The basic moderation endpoints work, but the workflow rules are implicit instead of enforced. Tightening this is mainly about correctness and keeping behavior aligned with the Phase 7 documentation.

**References:** `apps/backend/src/modules/reviews/reviews.service.ts`, `docs/phases/phase-7-features.md`

---

## Phase 7 — Tax

### Complete Tax Engine Rules And Checkout Integration

**What:** Finish the tax rules engine so it matches the Phase 7 design and is actually used during order calculation.

**Current state:** `TaxService` exists and follows the rules-engine shape, but it only evaluates a small hard-coded set of country/state/digital-goods rules. The Phase 7 note describes rule evaluation by country → state → product category → user type, but the current `TaxContext` has no product category or user-type inputs. The service also does not appear to be wired into cart, checkout, or order totals, so taxes are not being calculated into placed orders.

**How to implement:**
- Extend `TaxContext` to include the missing rule dimensions such as product category and user type
- Add rule definitions for those dimensions and preserve explicit first-match priority order
- Decide whether tax should be computed per item, per category bucket, or per order, and make rounding behavior explicit
- Integrate `TaxService.calculate(...)` into checkout/order creation so `taxAmount` is populated on `Order`
- Expose enough response fields for clients to show subtotal, tax, and total consistently
- Add tests covering rule precedence and order total calculation

**Why deferred:** The current service demonstrates the pattern, but it does not yet satisfy the richer rule model described in Phase 7 and it is not connected to the order flow.

**References:** `apps/backend/src/modules/tax/tax.service.ts`, `apps/backend/src/modules/orders/saga/order-saga.service.ts`, `docs/phases/phase-7-features.md`

---

## Phase 7 — Stock Alerts

### Align Back-in-Stock Alerts With Variant-Level Subscriptions

**What:** Change stock alert subscriptions and fan-out to operate at the variant level rather than the product level.

**Current state:** The Phase 7 doc says users subscribe to a product variant, but the current schema, controller, and service all work with `productId` only. When any variant for a product is restocked, every subscriber to that product can be notified even if they were interested in a different size/color.

**How to implement:**
- Add `variantId` to the `StockAlert` model and adjust uniqueness/indexing accordingly
- Update the API shape from product-level subscription to variant-level subscription
- Emit variant-specific restock payloads from `VariantsService`
- Filter fan-out queries by `variantId` so only matching subscribers receive alerts
- Update email copy and payloads if variant attributes should appear in the notification

**Why deferred:** The fan-out queue pattern is implemented, but the subscription granularity does not match the documented behavior and can send incorrect notifications.

**References:** `apps/backend/prisma/schema.prisma`, `apps/backend/src/modules/stock-alerts/stock-alerts.controller.ts`, `apps/backend/src/modules/stock-alerts/stock-alerts.service.ts`, `apps/backend/src/modules/products/variants/variants.service.ts`, `docs/phases/phase-7-features.md`

### Mark Stock Alerts Notified On Successful Delivery

**What:** Move `StockAlert.notified = true` to a point that reflects successful delivery, not just successful enqueue.

**Current state:** `handleRestock(...)` enqueues one job per subscriber and then immediately marks all matching alerts as notified. If a job later exhausts retries or mail delivery fails permanently, the database still says the user has already been notified.

**How to implement:**
- Remove the immediate bulk `updateMany(...)` after enqueue
- Mark the specific alert as notified from the processor after a successful send
- Decide how failed or exhausted jobs should remain eligible for retry or re-notification
- Add tests covering enqueue success with downstream delivery failure

**Why deferred:** The current approach keeps the write path simple, but it conflates “queued” with “delivered” and can leave alert state inconsistent with reality.

**References:** `apps/backend/src/modules/stock-alerts/stock-alerts.service.ts`, `apps/backend/src/modules/stock-alerts/stock-alert.processor.ts`

---

## Phase 7 — Returns

### Wire `APPROVED -> REFUNDED` Into The Actual Returns Flow

**What:** Expose and connect the refund-processing step so approved return requests can actually transition to `REFUNDED` through the application API/workflow.

**Current state:** `ReturnsService.processRefund(...)` exists, but the returns controller only exposes create, list, approve, and reject endpoints. There is no route or other caller that triggers the refund path, so the `APPROVED -> REFUNDED` transition is not currently reachable in normal runtime flow.

**How to implement:**
- Add an admin refund-processing endpoint or equivalent workflow trigger
- Inject and use the real Stripe service instead of passing an ad hoc refund dependency
- Decide whether refund processing should be synchronous, queued, or outbox-driven for retries
- Add tests covering the full `APPROVED -> REFUNDED` path

**Why deferred:** The service contains the core refund logic, but the state machine is incomplete from an application-flow perspective because the final transition is not wired up.

**References:** `apps/backend/src/modules/returns/returns.service.ts`, `apps/backend/src/modules/returns/returns.controller.ts`, `docs/phases/phase-7-features.md`

### Restock The Correct Variant On Refund

**What:** Restock the exact purchased variant for each returned item instead of incrementing stock for every variant under the same product.

**Current state:** `processRefund(...)` finds the returned `OrderItem`, then uses `productId` with `productVariant.updateMany(...)`. In a variant-based catalog, that can incorrectly increment stock across multiple variants instead of just the originally purchased SKU.

**How to implement:**
- Persist or derive the correct `variantId` for each returned order item
- Update only that specific variant during refund restocking
- Add tests covering multi-variant products to prevent cross-variant stock corruption

**Why deferred:** The refund path mostly follows the intended compensation steps, but the inventory write is not safe for the current variant-based data model.

**References:** `apps/backend/src/modules/returns/returns.service.ts`, `apps/backend/src/modules/orders/saga/order-saga.service.ts`

### Enforce Return State Transitions And Audit Logging

**What:** Validate allowed return-request transitions and write audit log entries for each state change.

**Current state:** `approve(...)` and `reject(...)` update statuses directly without checking the current state, so invalid transitions are possible. The Phase 7 notes also say every state transition should create an `AuditLog` entry, but the returns service does not currently use `AuditService`.

**How to implement:**
- Add explicit current-state checks for approve/reject/refund transitions
- Define and enforce the valid state graph: `PENDING -> APPROVED -> REFUNDED` and `PENDING -> REJECTED`
- Inject `AuditService` and log each transition with before/after status
- Add tests for invalid transitions and audit-log side effects

**Why deferred:** The basic endpoints exist, but the workflow rules and auditability described in Phase 7 are not yet enforced in the service layer.

**References:** `apps/backend/src/modules/returns/returns.service.ts`, `apps/backend/src/modules/audit/audit.service.ts`, `docs/phases/phase-7-features.md`

---

## Phase 7 — Vendor Marketplace

### Build Vendor Ownership Flows On Top Of The Prepared Schema

**What:** Implement the application-layer vendor marketplace behavior that uses the already-prepared `VENDOR` role and nullable `Product.vendorId` schema.

**Current state:** The expand-step schema is in place: `User.role` includes `VENDOR`, `Product.vendorId` exists, and the column is indexed. However, product creation, admin/product-management flows, and vendor-facing APIs do not yet appear to assign or enforce vendor ownership as part of normal business behavior.

**How to implement:**
- Define vendor onboarding and role-assignment flows
- Decide how `vendorId` is assigned during product creation/import
- Add vendor-scoped product CRUD/query flows on top of the existing schema and RLS support
- Ensure admin flows can still manage cross-vendor data intentionally
- Add tests covering vendor isolation and ownership behavior

**Why deferred:** The schema-preparation step is complete, but the marketplace behavior that actually uses it is still future work.

**References:** `apps/backend/prisma/schema.prisma`, `apps/backend/prisma/migrations/20260528000002_phase6_security/migration.sql`, `apps/backend/src/modules/prisma/prisma.service.ts`, `docs/phases/phase-7-features.md`

---
