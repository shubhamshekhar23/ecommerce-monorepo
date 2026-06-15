# Phase 12 — Testing Strategy

**Status:** 🔲 Pending
**Concept cluster:** The codebase has unit tests for individual services and a single e2e stub. Two gaps remain: verifying service contracts across boundaries without a full staging environment, and testing the complete user journey end-to-end.

---

## Pact Consumer-Provider Contract Tests

**What:** Add consumer-driven contract tests between the frontend (consumer) and the backend (provider) using Pact. The consumer defines the shape it expects; the provider verifies it matches what it actually returns — without both services running simultaneously.

**Why:** When the backend renames a response field (e.g., `avgRating` → `averageRating`), the frontend only discovers the break at runtime or in full E2E tests. Contract tests solve this: the consumer publishes a pact (a JSON file of expected interactions) and the provider runs its test suite against the pact in CI — catching the break before either side deploys. No staging environment needed.

**Approach:**
- Install `@pact-foundation/pact` in both frontend (consumer) and backend (provider).
- Consumer test (`apps/frontend/src/pact/products.consumer.pact.ts`): define expected interaction using `PactV3` — `GET /api/v1/products → { id, name, price, avgRating, reviewCount }`. Running the test generates `pacts/frontend-backend.json`.
- Provider test (`apps/backend/test/pact/products.provider.pact.ts`): `Verifier` points at the running backend and the pact file. Running this verifies the backend satisfies the consumer's contract.
- Commit pact files to the repo. CI order: consumer tests first → pact JSON generated → provider verification.
- Start with two contracts: `GET /api/v1/products` (list) and `GET /api/v1/products/:id` (detail).

**Key files:**
- `apps/frontend/src/pact/products.consumer.pact.ts` — consumer pact definition
- `apps/backend/test/pact/products.provider.pact.ts` — provider verification
- `pacts/frontend-backend.json` — generated pact file (committed to repo)
- Both `package.json` files — add `@pact-foundation/pact`
- `.github/workflows/ci.yml` — add pact verification step

---

## E2E User-Journey Test

**What:** Expand `test/app.e2e-spec.ts` to cover the full critical user path: register → login → browse products → add to cart → place order. Each step asserts on response shape, status codes, and side effects.

**Why:** The only current e2e test is a single stub that hits `GET /` and checks for 200 — it gives zero confidence about real flows. E2E tests are the only test type that catches seam-level failures: bugs that live at the boundary between modules that unit tests (which mock collaborators) cannot find. The full checkout flow exercises auth, products, cart, order saga, stock decrement, and audit logging in one run.

**Approach:**
- Use `supertest` against the full `AppModule` with a real test database (not mocked Prisma).
- Test database: `DATABASE_URL` pointing to `ecommerce_test`; run `prisma migrate deploy` in `beforeAll`.
- Full journey:
  1. `POST /api/v1/auth/register` → assert `201`, store `accessToken`
  2. `GET /api/v1/products` → assert `200`, extract `productId` and `variantId`
  3. `POST /api/v1/cart/items` (with auth header) → assert `201`
  4. `POST /api/v1/orders` → assert `201`, extract `orderId`
  5. `GET /api/v1/orders/:id` → assert `200` with `status: 'PENDING'`
- `afterAll`: delete test user and all associated data.
- Add `npm run test:e2e` to the backend CI job after unit tests.

**Key files:**
- `apps/backend/test/app.e2e-spec.ts` — expand with full journey
- `apps/backend/test/jest-e2e.json` — set `testTimeout: 30000`
- `apps/backend/.env.test` — test database URL
- `.github/workflows/ci.yml` — add e2e step for backend
