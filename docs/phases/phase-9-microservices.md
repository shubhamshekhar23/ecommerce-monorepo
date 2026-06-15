# Phase 9 — Microservices Extraction

**Status:** ✅ Done
**Concept cluster:** Extract services as deliberate learning exercises using the Strangler Fig pattern. The extraction process is the lesson — not just the end result.

---

## Strangler Fig Pattern

Never do a big-bang rewrite. Route some traffic to the new service while the monolith handles the rest. Gradually move more traffic. Each extraction below follows this pattern.

---

## Step 1 — Notification Service

**Port:** 3004
**Location:** `apps/notification-service/`

The notification module in the monolith had no shared state — it only sent emails. Perfect first extraction.

**What it does:**
- Consumes events from RabbitMQ (via `@golevelup/nestjs-rabbitmq`)
- `OrderConsumer` subscribes to `order.placed` and `order.shipped` routing keys
- `UserConsumer` subscribes to `user.registered`
- Sends emails via `MailerService` using Handlebars templates

**How events flow:**
```
Backend (monolith)
  └── Prisma transaction commits order
  └── OutboxService.publish() → writes OutboxEvent to DB atomically
  └── OutboxProcessor polls every 5s → publishes to RabbitMQ exchange

RabbitMQ
  └── Routes to notification-service queue

Notification Service
  └── OrderConsumer.onOrderPlaced() → renders order-confirmation template → sends email
```

**Error handling:** Failed messages call `Nack(false)` → RabbitMQ sends to Dead Letter Queue. The message is not lost; a human can inspect the DLQ and replay it.

**Key learning:** gRPC vs REST vs message queue for service-to-service communication. Notifications are fire-and-forget — a message queue is the right choice. If the notification service is down, messages queue up and are delivered when it recovers. REST would require the caller to handle failures and retry.

---

## Step 2 — Search Service

**Port:** 3005
**Location:** `apps/search-service/`

**What it does:**
- Consumes `product.created`, `product.updated`, `product.deleted` from RabbitMQ
- Indexes/updates/removes products in OpenSearch
- Exposes `GET /api/search?q=<term>&page=1&limit=20` — fuzzy multi-match search

**OpenSearch query:**
```json
{
  "query": {
    "multi_match": {
      "query": "blue sneaker",
      "fields": ["name^3", "description"],
      "fuzziness": "AUTO"
    }
  }
}
```

`name^3` boosts name matches 3× over description matches. `fuzziness: AUTO` handles typos.

**Startup resilience:** The service retries OpenSearch connection 8 times with 5-second delays. OpenSearch takes longer to start than the service — without retry logic the service crashes on startup.

**Strangler fig routing in Gateway:** `GET /api/search**` routes to this service. All other product endpoints (`/api/products/**`) still go to the monolith. Users experience a seamless transition.

**Key learning:** Eventual consistency in practice. The monolith writes to Postgres → Outbox → event → Search service indexes. The index lags by ~500ms. This is acceptable for search. It is NOT acceptable for stock checks (those always read Postgres directly).

---

## Step 3 — Auth Service

**Port:** 3006
**Location:** `apps/auth-service/`

**What it does:**
- `POST /api/auth/register` — creates user in shared Postgres, publishes `user.registered` event, returns RS256 JWT
- `POST /api/auth/login` — validates credentials, supports 2FA, returns JWT
- `POST /api/auth/refresh` — rotates refresh token
- `GET /.well-known/jwks.json` — public key endpoint for JWT verification

**Why Auth is the hardest extraction:** every other service depends on it. The Auth Service went down = nobody can log in = entire platform is down. It gets the most careful deployment treatment.

**Database:** Uses the same shared Postgres instance but with a separate Prisma schema (`apps/auth-service/prisma/schema.prisma`) containing only `User` and `RefreshToken` models. This avoids duplicating the entire schema while keeping the service self-contained.

**RS256 key pair distribution:**
- Private key: `apps/auth-service/.env` (JWT_PRIVATE_KEY)
- Public key: `apps/backend/.env` and `apps/gateway/.env` (JWT_PUBLIC_KEY)
- Services never need to talk to the Auth Service to verify a token — they verify locally using the public key

**Key learning:** Token introspection vs self-validating JWT. Self-validating (what we use) adds 0ms overhead but cannot revoke tokens mid-lifetime. Token introspection (call `/auth/introspect` on every request) adds ~20ms latency but enables instant revocation. Choose based on your threat model.

---

## Step 4 — API Gateway

**Port:** 3000
**Location:** `apps/gateway/`

The Gateway is the single public entry point. All traffic from the internet goes through it.

**What it does:**
1. **JWT verification** — verifies the RS256 Bearer token using the public key
2. **Header injection** — injects `X-User-Id` and `X-User-Email` into the request
3. **Routing** — proxies requests to the correct upstream service

**Routing rules (in priority order):**
- `/api/auth/**` → Auth Service (port 3006) — no JWT required (login/register)
- `/api/search**` → Search Service (port 3005) — JWT optional
- `/api/**` (everything else) → Backend monolith (port 4000)
- `/health` → handled locally by Gateway's `HealthController`

**JWT middleware behaviour:**
- Valid token → injects headers, passes through
- Invalid/expired token → 401 Unauthorized (does not hit upstream)
- No token → passes through (upstream decides if auth is required)

`bodyParser: false` is critical — the gateway must not parse request bodies. It streams them byte-for-byte to the upstream. Parsing and re-serializing the body would break multipart uploads and add latency.

**Implementation:** `http-proxy-middleware` v3 handles the actual proxying. Each `createProxyMiddleware()` instance is mounted as Express middleware in `main.ts` before NestJS routes.

---

## Service Ports Reference

```
Gateway          :3000  — public entry point
Backend          :4000  — monolith (internal only)
Auth Service     :3006  — internal only
Search Service   :3005  — internal only
Notification Svc :3004  — internal only (no HTTP API, RabbitMQ consumer)
RabbitMQ         :5672  — message bus, :15672 management UI
OpenSearch       :9200  — search engine
Mailpit          :1025  — SMTP (dev), :8025 web UI
PostgreSQL       :5434  — via Docker
PgBouncer        :6432  — connection pooler
```

---

## Key Files

- `apps/notification-service/src/consumers/order.consumer.ts`
- `apps/notification-service/src/consumers/user.consumer.ts`
- `apps/search-service/src/search/search.service.ts`
- `apps/search-service/src/search/search.controller.ts`
- `apps/auth-service/src/auth/auth.service.ts`
- `apps/auth-service/src/auth/auth.controller.ts`
- `apps/gateway/src/main.ts` (JWT middleware + proxy routing)
- `apps/gateway/src/health/health.controller.ts`

---

## Phase 9 Backfill (2026-06-15)

### API Versioning — `/api/v1/` Prefix

**Problem:** All services exposed routes at `/api/*` with no version segment. Introducing breaking changes to an endpoint (new required field, changed response shape, removed field) had no safe path — existing clients would break with no notice and no fallback.

**Why version in the URL path:** Header-based versioning (`Accept: application/vnd.ecommerce.v1+json`) is theoretically cleaner but browsers, curl, and most frontend HTTP clients make it harder to reason about. Path versioning is visible, cacheable, and explicit — the URL uniquely identifies the resource including its version contract.

**What changed:**

- `apps/backend/src/main.ts` — default prefix changed from `api` to `api/v1` (still overridable via `API_PREFIX` env var for future versions)
- `apps/auth-service/src/main.ts` — `setGlobalPrefix('api/v1', { exclude: ['health'] })`
- `apps/search-service/src/main.ts` — same
- `apps/analytics-service/src/main.ts` — added `setGlobalPrefix('api/v1', { exclude: ['health'] })` (was missing entirely)
- `apps/gateway/src/main.ts` — all `pathFilter` strings updated from `/api/...` to `/api/v1/...`; the catch-all function guard updated to match `path.startsWith('/api/v1/')` and exclude the v1 auth/search/recommendations prefixes
- `apps/frontend/src/shared/config.ts` — default API base URL changed from `http://localhost:4000/api` to `http://localhost:4000/api/v1`

**How to ship a v2 without breaking v1:**
- Deploy new controllers at `/api/v2/products` alongside the existing `/api/v1/products`
- Add a `v2` pathFilter entry in the gateway above the `v1` catch-all
- Deprecate v1 after clients have migrated (return a `Deprecation` header)

**Ports are unchanged.** This is a path change only — docker-compose, Kubernetes Service definitions, and inter-service URLs do not need updating.
