# Troubleshooting Guide

Common issues and fixes when running the E-Commerce platform.

---

## Quick Diagnostics

Before diving into specific issues, run these to understand what is actually happening:

```bash
# Are all infrastructure containers running?
docker compose ps

# Backend logs (main app, port 4000)
docker compose logs -f app

# Any container crashing?
docker compose logs --tail=50 postgres
docker compose logs --tail=50 redis
docker compose logs --tail=50 rabbitmq

# Is the gateway responding?
curl http://localhost:3000/health

# Is the backend responding directly?
curl http://localhost:4000/health
```

---

## 1. Application Not Starting

**Symptom:** `npm run start:dev` exits immediately or hangs.

```bash
# Check environment file exists
ls apps/backend/.env

# Generate Prisma client (needed after fresh clone or schema change)
cd apps/backend && npx prisma generate

# Reinstall dependencies if modules are missing
rm -rf node_modules && npm install
```

**Missing env vars:** The app validates env on startup with `class-validator`. Check the error message — it will say exactly which var is missing. Copy `.env.example` and fill in values.

---

## 2. Database Connection Refused

**Symptom:** `Can't reach database server at localhost:5434` or `connect ECONNREFUSED 127.0.0.1:5434`

```bash
# Start the database container
cd apps/backend && docker compose up -d postgres pgbouncer

# Verify containers are running
docker compose ps postgres pgbouncer

# Test direct DB connection
docker compose exec postgres psql -U ecommerce_user -d ecommerce_db -c "SELECT 1"
```

**Wrong `DATABASE_URL`:** In development, the app connects through PgBouncer (port 6432), not Postgres directly (port 5434). Postgres external port is 5434 for tools like pgAdmin, but the app must use PgBouncer:

```env
# Correct for the NestJS app:
DATABASE_URL=postgresql://ecommerce_user:ecommerce_password@localhost:6432/ecommerce_db?pgbouncer=true&connection_limit=1

# Correct for migrations (bypasses PgBouncer):
DIRECT_DATABASE_URL=postgresql://ecommerce_user:ecommerce_password@localhost:5434/ecommerce_db
```

**Prisma migration error with PgBouncer:** If `prisma migrate deploy` fails with an advisory lock error, make sure you are using `DIRECT_DATABASE_URL` — migrations cannot use PgBouncer (advisory locks are session-scoped, incompatible with transaction pooling mode).

---

## 3. Redis Connection Refused

**Symptom:** `connect ECONNREFUSED 127.0.0.1:6379` on startup or during rate-limit/cache operations.

```bash
docker compose up -d redis
docker compose exec redis redis-cli ping
# Should return: PONG
```

Check `REDIS_URL=redis://localhost:6379` in `.env`.

**BullMQ jobs disappearing:** If you run BullMQ and caching on the same Redis instance with `allkeys-lru` eviction, Redis can evict pending jobs. The fix is two separate Redis instances — see DEPLOYMENT.md scaling section.

---

## 4. RabbitMQ Not Connecting

**Symptom:** Notification Service crashes on startup with AMQP connection error, or emails are never delivered.

```bash
docker compose up -d rabbitmq

# Wait ~10 seconds for RabbitMQ to initialize, then check:
curl -u guest:guest http://localhost:15672/api/overview
# Should return JSON with cluster info
```

Check that `RABBITMQ_URL=amqp://guest:guest@localhost:5672` is set in backend and notification-service `.env`.

**Outbox events stuck at PENDING:** The Outbox Processor polls every 5 seconds and publishes to RabbitMQ. If RabbitMQ is down, events stay `PENDING`. Once RabbitMQ recovers, the processor retries automatically. Check `OutboxEvent` status in the DB:

```sql
SELECT status, COUNT(*) FROM "OutboxEvent" GROUP BY status;
```

---

## 5. Port 3000 vs Port 4000

This is a common confusion point. The port assignments:

- **:3000** — Gateway (the public entry point, proxies to other services)
- **:4000** — Backend monolith (internal, not intended to be hit directly in production)
- **:3001** — Grafana
- **:3004** — Notification Service
- **:3005** — Search Service
- **:3006** — Auth Service

When testing locally without the gateway, hit `:4000` directly. Swagger UI is at `http://localhost:4000/api/docs`.

When testing the full stack (including JWT verification and routing), use `:3000` via the gateway.

---

## 6. JWT Errors

**Symptom:** 401 Unauthorized on every request, or "invalid signature" errors.

This project uses **RS256 (asymmetric)** JWT, not HS256. There is no single `JWT_SECRET` — there is a private/public key pair.

```bash
# Generate keys (one-time setup):
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
cat private.pem   # copy into JWT_PRIVATE_KEY in auth-service .env
cat public.pem    # copy into JWT_PUBLIC_KEY in backend .env and gateway .env
```

Keys must have `\n` line endings as a single string in `.env`, or use multi-line syntax:

```env
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqh...
-----END PUBLIC KEY-----"
```

**"TokenExpiredError":** Access tokens expire after 15 minutes. Use the refresh token to get a new one: `POST /api/auth/refresh`.

---

## 7. Gateway Returning 502 Bad Gateway

The gateway proxies to upstream services. 502 means the upstream is not reachable.

```bash
# Which upstream is down?
curl http://localhost:3000/health
# Response lists each service status

# Start whichever is missing
cd apps/auth-service && npm run start:dev     # if /api/auth fails
cd apps/backend && npm run start:dev           # if /api/* fails
cd apps/search-service && npm run start:dev    # if /api/search fails
```

The backend must run on port 4000 (`PORT=4000` in its `.env`) when the gateway is active — the gateway is the one using port 3000.

---

## 8. Prisma Migration Issues

```bash
# Check migration status
cd apps/backend && npx prisma migrate status

# Apply pending migrations
npx prisma migrate deploy

# Reset (WARNING: deletes all data — dev only)
npx prisma migrate reset

# Create a new migration after schema change
npx prisma migrate dev --name describe_your_change
```

**Advisory lock error:** Use `DIRECT_DATABASE_URL` (port 5434, bypasses PgBouncer). See issue #2 above.

**"Drift detected":** Prisma detected the DB schema differs from the migration history. This usually means someone ran raw SQL against the DB. Run `npx prisma migrate diff` to see what changed, then create a migration to reconcile.

---

### Schema changes in Docker — what to run and when

The backend container mounts source code from the host but keeps `node_modules` in a **separate named Docker volume** (`node_modules:/app/node_modules`). This means running `npx prisma generate` on the host does **not** update the client the container uses.

#### Normal flow (schema.prisma change → auto-generated migration)

```bash
# 1. Edit schema.prisma on the host, then run inside the container:
docker compose exec backend npx prisma migrate dev --name your_change_name
# This does three things automatically:
#   a) generates the migration SQL
#   b) applies it to the DB
#   c) regenerates the Prisma client inside the container
```

#### Manual migration flow (raw SQL + migrate resolve)

Used when Prisma can't express the change (GENERATED columns, partial indexes, custom constraints):

```bash
# 1. Write migration SQL in prisma/migrations/<timestamp>_name/migration.sql
# 2. Apply it directly to the DB:
psql "$DIRECT_DATABASE_URL" -f prisma/migrations/<timestamp>_name/migration.sql
# 3. Register it in Prisma's history:
docker compose exec backend npx prisma migrate resolve --applied <timestamp>_name
# 4. Regenerate the client — NOT automatic in this flow:
docker compose exec backend npx prisma generate
# 5. Restart so NestJS picks up the new types:
docker compose restart backend
```

#### Why running on the host doesn't help

```
Host:      node_modules/.prisma/client   ← updated by host-side prisma generate ✓
Container: Docker volume node_modules    ← completely separate, still has old types ✗
```

Running `npx prisma generate` from `apps/backend` on the host only updates the host copy.
The container never sees it.

---

## 9. Emails Not Being Delivered (Dev)

In development, all emails are captured by **Mailpit** — a local SMTP server that never actually sends to real addresses.

```bash
# Check Mailpit is running
docker compose ps mailpit

# Open the inbox UI
open http://localhost:8025
```

If no emails appear in Mailpit:
1. Check notification-service is running and connected to RabbitMQ
2. Check RabbitMQ management UI (http://localhost:15672) — are messages being consumed?
3. Check notification-service logs: `cd apps/notification-service && npm run start:dev`

**SMTP_HOST in notification-service `.env`** must point to `localhost:1025` (Mailpit) in development:

```env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
```

---

## 10. OpenSearch / Search Not Working

**Symptom:** `GET /api/search?q=laptop` returns empty results or 503.

```bash
# Check OpenSearch is running
docker compose ps opensearch
curl http://localhost:9200/_cluster/health

# Check search-service logs for indexing errors
cd apps/search-service && npm run start:dev
```

OpenSearch takes ~30 seconds to start. The search service has built-in retry logic (8 attempts, 5-second intervals) but it must be running when it retries.

**Index empty after product creation:** Products are indexed via RabbitMQ events. Check:
1. `OutboxEvent` table — are `product.created` events getting published? (`SELECT * FROM "OutboxEvent" WHERE "eventType" = 'product.created'`)
2. RabbitMQ management — is the search-service queue consuming?
3. OpenSearch directly: `curl 'http://localhost:9200/products/_count'`

---

## 11. TypeScript / Build Errors

```bash
# Type check without building (fastest)
cd apps/backend && npm run type-check

# Full rebuild
rm -rf dist && npm run build
```

**Prisma type errors after a schema change** (e.g. `Property 'price' is missing in type`):
The Prisma client types are stale. If running in Docker, regenerate inside the container — not on the host:

```bash
docker compose exec backend npx prisma generate
docker compose restart backend
```

If running locally (not Docker):
```bash
cd apps/backend && npx prisma generate
```

**Gateway build:** The gateway uses `npx nest build` (not just `tsc`) because it needs the NestJS compiler for decorators:

```bash
cd apps/gateway && npx nest build
node dist/main.js
```

---

## 12. Tests Failing

```bash
# Run all unit tests
cd apps/backend && npm run test

# Run with coverage report
npm run test:cov

# Run a specific file
npm run test -- orders.service.spec.ts

# Run E2E tests (requires running DB + Redis)
npm run test:e2e
```

Tests use a real Postgres and Redis (configured via `.env.test` or environment variables in CI). If the DB is not running, the integration tests will fail. There are intentionally no DB mocks — mocked tests gave false confidence when mock behaviour diverged from real DB behaviour.

---

## 13. Linting / Formatting Errors

```bash
# Check (no writes)
npm run lint:check
npm run format:check

# Fix auto-fixable issues
npm run lint -- --fix
npm run format
```

Pre-commit hooks run lint + format + type-check automatically. If a commit fails, the hook output tells you exactly what to fix.

---

## 14. High Memory Usage

```bash
# Check container memory
docker stats

# Increase Node.js heap if needed
NODE_OPTIONS="--max-old-space-size=2048" npm run start:dev
```

Common causes:
- Pino logging in pretty mode (pino-pretty) uses more memory; switch to JSON format in production
- Large Prisma result sets without `select` — always specify which fields you need
- BullMQ job results accumulating in Redis — set `removeOnComplete: true` on jobs

---

## 15. Circuit Breaker Open (Stripe 503 Errors)

**Symptom:** All payment attempts return `503 Service Unavailable` even though Stripe is fine.

The circuit breaker trips after 50% error rate over 5+ requests and stays open for 30 seconds before attempting a probe request. This is usually caused by a burst of failures (bad Stripe key, network blip).

Check the backend logs for: `[CircuitBreaker] State changed: closed → open`

Wait 30 seconds for the half-open probe. If Stripe responds successfully, the circuit closes automatically.

If the circuit is permanently open after Stripe recovers, restart the backend (the circuit state is in-memory, not persisted).

---

## 16. Phase 10 — DB Analytics Endpoints

### `GET /api/admin/db/slow-queries` returns empty array

`pg_stat_statements` only tracks queries after the extension is loaded AND after queries have been run. Two possible causes:

1. **Postgres was not started with `shared_preload_libraries=pg_stat_statements`.**
   Check: `docker compose exec postgres psql -U ecommerce_user -d ecommerce_db -c "SHOW shared_preload_libraries;"`
   If empty, postgres is running without the flag. The `docker-compose.yml` already sets this via `command: postgres -c shared_preload_libraries=...`. If you started postgres before this change was applied, restart it: `docker compose restart postgres`.

2. **No queries have been run since the last `pg_stat_statements_reset()`.**
   Hit a few endpoints, then call the slow-queries API again.

### `GET /api/admin/db/slow-queries` → 500 with "BigInt serialization"

Any raw Postgres query that returns `bigint` (e.g. `COUNT(*)`, `pg_class.reltuples`, `pg_stat_statements.calls`) will cause `JSON.stringify` to throw `"Do not know how to serialize a BigInt"`. Fix in the service: either cast to `TEXT` in SQL (`calls::TEXT`) or convert in TypeScript (`Number(row.calls)`).

### `POST /api/admin/db/reset-stats` → 500

`pg_stat_statements_reset()` returns `void`. Using `prisma.$queryRaw` on a void-returning function causes a `PrismaClientKnownRequestError`. Use `prisma.$executeRaw` for any Postgres function or statement that returns no rows.

### `GET /api/admin/db/partitions` → 500 on first deploy

The `RequestMetric` table is partitioned. Prisma's `migrate deploy` applies the migration that creates the partitioned table, but if you run `prisma migrate deploy` against a fresh DB before restarting postgres with `shared_preload_libraries`, the `CREATE EXTENSION` migration fails. Fix: restart postgres first, then run migrations.

### `GET /api/admin/db/replication/lag` → `replicaConnected: false`

The replica is not running. This is expected when using only `docker-compose.yml`. Start the replica with (run from monorepo root):
```bash
docker compose -f docker-compose.yml -f docker-compose.replica.yml up -d
```
Add `READ_REPLICA_DATABASE_URL=postgresql://ecommerce_user:ecommerce_password@localhost:5435/ecommerce_db` to `.env`. The `ReadReplicaService` falls back to the primary if this env var is not set.

### RequestMetric table has 0 rows after many requests

The middleware samples 10% of requests (by design). With low traffic, you may see 0 rows. Send 50+ requests to a non-health-check endpoint to get consistent samples:
```bash
for i in $(seq 1 50); do curl -s http://localhost:4000/api/products > /dev/null; done
```

If still 0 rows, check that the middleware is logging errors (look for `RequestMetric write failed` in the backend log). The most common cause is a fire-and-forget promise failing silently — the middleware now logs errors via `.catch()`.

### Partition "no partition found for row" error

This appears in the backend log when a request timestamp falls outside all existing partitions. It happens if a new quarter starts before the next partition is created. Fix:
```bash
bash apps/backend/scripts/create-partition.sh
# or via API:
curl -X POST http://localhost:4000/api/admin/db/partitions/create-next -H "Authorization: Bearer $ADMIN_TOKEN"
```
Schedule `create-partition.sh` to run on the 25th of the last month of each quarter (March 25, June 25, September 25, December 25).

---

## Development Checklist

Before reporting a bug, verify:

- [ ] `docker compose ps` — all infrastructure containers are `Up`
- [ ] Backend is running on port **4000** (not 3000)
- [ ] `apps/backend/.env` exists and has `DATABASE_URL`, `REDIS_URL`, `JWT_PUBLIC_KEY`
- [ ] Schema changed? Run `docker compose exec backend npx prisma generate` (not on host) then `docker compose restart backend`
- [ ] `npx prisma migrate deploy` has been run (or `migrate dev` for dev)
- [ ] Gateway is running on port 3000 (if testing through gateway)
- [ ] Auth service is running on port 3006 (if testing auth endpoints)

---

## Getting Help

- Swagger UI (backend direct): http://localhost:4000/api/docs
- RabbitMQ management: http://localhost:15672
- Jaeger traces: http://localhost:16686
- Mailpit inbox: http://localhost:8025
- Prisma Studio (DB browser): `cd apps/backend && npx prisma studio`
