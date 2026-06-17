# Implementation Sequence V3

This file picks up where V2 leaves off. All 21 items in V2 must be done first.
This covers the architectural growth patterns — 11 items across 5 waves.

**How to use this file:**
- Pick the next unchecked item
- Read the linked phase doc for the full approach, code examples, and key files
- Implement, verify it works, commit
- Check the item off here

**Repo:** `/Users/shubhamshekhar/Repos/ecommerce-monorepo`
**Phase docs:** `docs/phases/` — full design for every item

---

## Wave 1 — Quick Wins (Low-to-medium effort, high immediate value)

Four self-contained additions. None require architectural changes — each drops
cleanly into the existing module structure.

- [ ] **1. Soft Delete Pattern**
  → [phase-1.1-database-advanced.md](./phase-1.1-database-advanced.md)
  Add `deletedAt DateTime?` to `Product`, `Category`, `User`. Prisma `$use` middleware auto-appends `WHERE deletedAt IS NULL` on all find operations. `DELETE /products/:id` sets `deletedAt = now()`. Admin-only `PATCH /:id/restore` clears it. `DELETE /:id/purge` (SUPER_ADMIN) hard-removes only after `deletedAt` is already set. Background cron purges records soft-deleted more than 90 days ago.

- [ ] **2. Bulkhead Pattern (resource pool isolation)**
  → [phase-2.1-resilience-patterns.md](./phase-2.1-resilience-patterns.md)
  Separate `ioredis` instances per concern: cache, rate-limit, pub/sub. Add `p-limit` concurrency cap on Stripe calls (max 10 concurrent). Named `https.Agent` with `maxSockets` per third-party domain. Isolates Stripe slowdowns from product listing and cache read paths.

- [ ] **3. Token Bucket rate limiting algorithm**
  → [phase-2.1-resilience-patterns.md](./phase-2.1-resilience-patterns.md)
  Add token bucket as a second strategy in `RateLimitService` alongside the existing sliding window. Redis hash per user (`tokens`, `lastRefill`). Atomic Lua script for refill + decrement. `RATE_LIMIT_ALGORITHM` env var switches strategies. Token bucket allows legitimate short bursts; sliding window penalises them — teaches the trade-off.

- [ ] **4. Fan-In Pattern (fulfillment confirmations)**
  → [phase-2.1-resilience-patterns.md](./phase-2.1-resilience-patterns.md)
  In `OrderSagaService`, replace fire-and-forget downstream calls with `Promise.allSettled([notifyWarehouse(), reserveInventory(), publishAnalytics()])` and a 5-second timeout. Treat inventory reservation as critical (compensate on failure), warehouse and analytics as non-critical (log failures, proceed). Emit `FULFILLMENT_STARTED` and `FULFILLMENT_CONFIRMED` events to `OrderEventStore`.

---

## Wave 2 — Infrastructure Evolution (Medium effort, operational maturity)

Both items extend existing infrastructure rather than adding new systems.
Distributed Lock (V2 item 10) must already be implemented before starting item 5.

- [ ] **5. Leader Election (distributed singleton jobs)**
  → [phase-8.1-deployment-advanced.md](./phase-8.1-deployment-advanced.md)
  Extend `DistributedLockService` with `LeaderElectionService` — a long-lived lease that renews every 10 seconds with a 30-second TTL. Each `@Cron()` job checks `isCurrentLeader` before executing. If the leader pod crashes, the lease expires in ≤30 seconds and another pod takes over. Inject `POD_NAME` via Kubernetes `fieldRef: metadata.name`.
  *Prerequisite: V2 item 10 (Distributed Lock Service)*

- [ ] **6. Canary Deployment (Istio + Argo Rollouts)**
  → [phase-8.1-deployment-advanced.md](./phase-8.1-deployment-advanced.md)
  Replace backend `Deployment` with an Argo `Rollout` resource. Traffic progresses 10% → 30% → 60% → 100% with 5-minute pauses. `CanaryAnalysis` template checks Prometheus for HTTP success rate ≥ 99% and p99 latency ≤ 500ms at each step — auto-promotes on pass, auto-rolls back on breach. Istio, Prometheus, and Argo CD are already deployed (Phase 11).

---

## Wave 3 — Business Logic (Medium-high effort, high product value)

Externalises hardcoded business rules so they can change without a deployment.
Item 8 (DSL) depends on item 7 (rule engine).

- [ ] **7. Rule-Based Architecture — Promotions Engine**
  → [phase-7.4-business-rules.md](./phase-7.4-business-rules.md)
  Add `PromotionRule` table with `condition` (JSON) and `action` (JSON) fields. `RulesEngineService.evaluate(cart, customer)` loads active rules ordered by priority and applies all matching actions. Admin CRUD endpoints to manage rules without a deployment. Integrate into `CartService.calculateTotals()` and `OrderSagaService` before payment.

- [ ] **8. Interpreter Pattern — Discount Rule DSL**
  → [phase-7.4-business-rules.md](./phase-7.4-business-rules.md)
  Add a human-readable expression language on top of the rule engine: `IF order.subtotal > 100 AND customer.tier == "GOLD" THEN discount(percentage: 15)`. Implement Lexer → Parser → AST → Interpreter pipeline. Store DSL string in `PromotionRule.conditionDsl` alongside the JSON condition. Fully backwards-compatible with existing JSON-only rules.
  *Prerequisite: item 7 (rule engine must exist first)*

---

## Wave 4 — Deep Architectural Refactors (High effort, significant learning value)

These three items refactor existing core modules. Do them in order — Event Sourcing
establishes the event foundation that the pipeline (item 11) will write into.

- [ ] **9. True Event Sourcing (evolve existing OrderEvent)**
  → [phase-9.5-architectural-patterns.md](./phase-9.5-architectural-patterns.md)
  Add `OrderProjectionService` that folds over `OrderEvent` rows to derive current order state. Route all `OrdersService.findOne()` reads through the projection. Add `OrderSnapshot` model to avoid full replay on every read (snapshot every 10 events). `Order.status` column remains as a denormalized cache updated reactively — not written directly. Migration path is non-breaking.
  *Prerequisite: V1 item 32 (OrderEventStore), V2 item 13 (choreography saga)*

- [ ] **10. Microkernel Pattern — Payment Provider Plugins**
  → [phase-9.5-architectural-patterns.md](./phase-9.5-architectural-patterns.md)
  Define `IPaymentProvider` interface. Create `PaymentPluginRegistry`. Wrap existing Stripe logic into `StripeProvider implements IPaymentProvider`. `PaymentService` resolves the active provider from the registry via `DEFAULT_PAYMENT_PROVIDER` env var. `OrderSagaService` injects `PaymentService` instead of `CircuitBreakerService` directly. Adding a second provider (PayPal, Braintree) requires no changes to the saga.

- [ ] **11. Pipe and Filter — Order Processing Pipeline**
  → [phase-9.5-architectural-patterns.md](./phase-9.5-architectural-patterns.md)
  Decompose `OrderSagaService.runOrderTransaction()` into a `OrderProcessingPipeline` — an array of named `IOrderFilter` handlers executed sequentially. Filters: ValidateInput → ResolveVariants → CheckInventory → ApplyDiscounts → CalculateTax → ComputeTotals → ChargePayment → CreateOrder → ReserveInventory → AppendEvents → EmitIntegration. Each filter is independently unit-testable with one mocked dependency. Compensation handlers registered per filter for rollback.
  *Prerequisite: item 7 (rule engine for ApplyDiscountsFilter), item 10 (Microkernel for ChargePaymentFilter)*

---

## Summary

- Wave 1 — Quick Wins: items 1–4 (soft delete, bulkhead, token bucket, fan-in)
- Wave 2 — Infrastructure Evolution: items 5–6 (leader election, canary deployment)
- Wave 3 — Business Logic: items 7–8 (promotions engine, discount DSL)
- Wave 4 — Deep Refactors: items 9–11 (event sourcing, microkernel, pipe and filter)

Total: **11 items**
