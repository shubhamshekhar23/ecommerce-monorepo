# Phase 12 — Testing Strategy

**Status:** ✅ Done
**Concept cluster:** Four testing layers that sit above unit tests — contract tests that verify service compatibility without a shared environment, E2E tests that cover the critical user journey end-to-end, Testcontainers that replace shared test databases with isolated per-run containers, and mutation testing that measures how well your tests actually catch bugs.

---

## Pact Consumer-Provider Contract Tests

**What:** Consumer-driven contract tests between the frontend (consumer) and backend (provider) using Pact. The consumer defines the response shape it expects; the provider verifies it matches what it actually returns — without both services running simultaneously.

**Why:** When the backend renames a response field, the frontend only discovers the break at runtime or in a full E2E run. Contract tests solve this: the consumer publishes a pact JSON file of expected interactions; the provider runs its test suite against the pact in CI — catching the break before either side deploys. No staging environment needed.

**Pact vs Integration Tests:**
- Integration tests: both services running, real network call — expensive, slow, flaky.
- Contract tests: consumer test generates a pact file; provider test runs against the file in isolation — fast, no shared infrastructure.

**Production approach — Pact Broker:** Committing pact files to the repo is fine for a single consumer-provider pair. In a multi-team setup, use a [Pact Broker](https://docs.pact.io/pact_broker) (self-hosted or PactFlow) as a central registry. The broker tracks which version of the consumer contract each provider version satisfies — enabling "can I deploy?" checks in CI.

**Approach:**
- Consumer test (`apps/frontend`): define expected interaction using `PactV3`.
- Running the consumer test generates `pacts/frontend-backend.json`.
- Provider test (`apps/backend/test/pact/`): `Verifier` points at a running backend instance and the pact file.
- Start with two contracts: `GET /api/v1/products` and `GET /api/v1/products/:id`.

```typescript
// Consumer
await provider.addInteraction({
  state: 'products exist',
  uponReceiving: 'a request for products',
  withRequest: { method: 'GET', path: '/api/v1/products' },
  willRespondWith: {
    status: 200,
    body: eachLike({ id: like('abc'), name: like('Widget'), price: like(9.99) }),
  },
});
```

**Key files:**
- `apps/frontend/src/pact/products.consumer.pact.ts`
- `apps/backend/test/pact/products.provider.pact.ts`
- `pacts/frontend-backend.json` — generated, committed to repo
- Both `package.json` files — add `@pact-foundation/pact`
- `.github/workflows/ci.yml` — consumer tests → provider verification

---

## E2E User-Journey Test

**What:** Expand `test/app.e2e-spec.ts` to cover the full critical user path end-to-end, asserting on both HTTP responses and business side effects (DB state, queued jobs, emitted events).

**Why:** The only current e2e test hits `GET /` → 200. A real E2E test catches seam-level failures: bugs at the boundary between modules that unit tests (which mock collaborators) miss entirely. Asserting only on HTTP responses leaves the bulk of the application's behaviour unverified — a handler could return 201 and silently fail to persist the order.

**Verify business side effects, not just HTTP:**

```typescript
// Don't just assert:
expect(response.status).toBe(201);

// Also assert:
const order = await prisma.order.findUnique({ where: { id: response.body.id } });
expect(order?.status).toBe('PENDING');
expect(order?.total).toBeCloseTo(expectedTotal);

const stockAfter = await prisma.productVariant.findUnique({ where: { id: variantId } });
expect(stockAfter?.stock).toBe(stockBefore - quantity);
```

**Full journey:**
1. `POST /api/v1/auth/register` → `201`, store `accessToken`
2. `GET /api/v1/products` → `200`, extract `productId` + `variantId`
3. `POST /api/v1/cart/items` (with auth) → `201`
4. `POST /api/v1/orders` → `201`, extract `orderId`
5. `GET /api/v1/orders/:id` → `200`, assert `status: 'PENDING'`
6. Assert DB: order row exists, stock decremented, audit log entry written

**Key files:**
- `apps/backend/test/app.e2e-spec.ts` — expand with full journey + side-effect assertions
- `apps/backend/test/jest-e2e.json` — set `testTimeout: 30000`
- `apps/backend/.env.test` — test database URL (`ecommerce_test`)
- `.github/workflows/ci.yml` — add e2e step for backend

---

## Testcontainers

**What:** Replace the shared test database with a per-run isolated Postgres container spun up and torn down by the test suite itself — so tests can run in parallel, never interfere, and leave no residue.

**Why:** A shared test database causes: test ordering dependencies (test A leaves data that causes test B to fail), flakiness in parallel runs, and the need to carefully clean up after every test. Testcontainers gives each test run its own isolated Postgres instance that starts fresh and is destroyed after the suite.

**Approach:**
- Install `testcontainers` and `@testcontainers/postgresql`.
- In `jest-e2e.json`, add a global setup file.
- In `global-setup.ts`:

```typescript
import { PostgreSqlContainer } from '@testcontainers/postgresql';

export default async () => {
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('ecommerce_test')
    .start();
  process.env.DATABASE_URL = container.getConnectionUri();
  global.__PG_CONTAINER__ = container;
  // Run migrations
  execSync('npx prisma migrate deploy', { env: process.env });
};
```

- In `global-teardown.ts`: `await global.__PG_CONTAINER__.stop()`.
- No `.env.test` file needed — the DATABASE_URL is set dynamically by the container.

**Key files:**
- `apps/backend/test/global-setup.ts` — new file
- `apps/backend/test/global-teardown.ts` — new file
- `apps/backend/test/jest-e2e.json` — add `globalSetup` and `globalTeardown`
- `apps/backend/package.json` — add `testcontainers`, `@testcontainers/postgresql`

---

## Mutation Testing

**What:** Run a mutation testing tool (Stryker) that automatically introduces small bugs (mutations) into the source code and checks whether the existing test suite catches them. A mutation that is not caught reveals a gap in test coverage.

**Why:** Code coverage (80% lines covered) tells you which lines were *executed* by tests. Mutation testing tells you which lines are actually *verified* by tests. A test that calls a function but doesn't assert on its output counts as 100% line coverage but 0% mutation coverage — it catches nothing.

**Example mutations Stryker introduces:**
- `stock >= qty` → `stock > qty` (boundary off-by-one)
- `status === 'PAID'` → `status !== 'PAID'`
- `total += item.price` → `total -= item.price`

**Approach:**
- Install `@stryker-mutator/core`, `@stryker-mutator/jest-runner`.
- Create `stryker.config.json`:

```json
{
  "testRunner": "jest",
  "mutate": [
    "src/modules/orders/**/*.ts",
    "src/modules/products/**/*.ts",
    "!**/*.spec.ts"
  ],
  "thresholds": { "high": 80, "low": 60, "break": 50 }
}
```

- Run: `npx stryker run`. Output: mutation score per file.
- Start with the order saga and cart — highest business risk, most critical to verify.
- Add `npx stryker run` to a weekly CI schedule (it's slow — not suitable for every PR).

**Key files:**
- `apps/backend/stryker.config.json` — new config
- `apps/backend/package.json` — add `@stryker-mutator/core`, `@stryker-mutator/jest-runner`
- `.github/workflows/ci.yml` — weekly scheduled mutation test run
