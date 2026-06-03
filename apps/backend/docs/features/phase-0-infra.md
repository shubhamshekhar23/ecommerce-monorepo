# Phase 0 — Infrastructure Foundation

**Status:** ✅ Done
**Concept cluster:** Container/infra layer — the environment every senior dev runs locally and deploys to prod.

---

## What Was Built

### Multi-Stage Dockerfile

`apps/backend/Dockerfile` has two stages:

- **builder** — installs all dependencies (including devDependencies), compiles TypeScript to `dist/`
- **runner** — copies only `dist/` and `node_modules --production`; no TypeScript compiler, no dev tools

The production image is roughly 10× smaller than a naïve single-stage build. Smaller image = smaller attack surface + faster CI pulls.

### Docker Compose Stack

`docker-compose.yml` (development) brings up the full local environment:

- **nginx** (:80) — reverse proxy; injects `X-Request-ID`, applies rate-limit headers, upstream keepalive
- **app** (:4000) — NestJS backend, source-mounted for hot reload in dev
- **postgres** (:5434) — PostgreSQL 16
- **pgbouncer** (:6432) — connection pooler sitting in front of Postgres
- **redis** (:6379) — cache, session, BullMQ queues
- **pgadmin** (:5050) — Postgres GUI
- **jaeger** (:16686) — distributed tracing
- **prometheus** (:9090) — metrics scraping
- **grafana** (:3001) — dashboards

### PgBouncer — Connection Pooling

PgBouncer runs in **transaction pooling mode**: a database connection is held only during a transaction, then returned to the pool. This means 100 Node.js instances × 5 Prisma connections = 500 app-side connections map to ~20 real Postgres connections.

Key config points:
- `DATABASE_URL` uses `?pgbouncer=true&connection_limit=1` — tells Prisma to use one connection per container and disable prepared statements (which are session-scoped and break in transaction mode)
- `DIRECT_DATABASE_URL` bypasses PgBouncer — used for `prisma migrate deploy` because migrations use advisory locks (session-scoped, incompatible with transaction pooling)

### Nginx as Reverse Proxy

`nginx.conf`:
- Proxies all traffic to the NestJS app upstream
- Injects `X-Request-ID` header (UUID) on every request so log lines can be correlated
- Upstream keepalive (reuses TCP connections to the app, avoids TCP handshake per request)
- Rate limiting zone configured (`limit_req_zone`) — coarse-grained protection before requests reach the application

### Graceful Shutdown

`apps/backend/src/main.ts`:
- `app.enableShutdownHooks()` — NestJS listens for SIGTERM/SIGINT
- On signal: stop accepting new connections → wait for in-flight requests to complete → close DB/Redis connections → exit
- 10-second forced exit timeout prevents zombie containers if a drain stalls

Without graceful shutdown: every deploy/restart drops in-flight requests and leaves DB connections in a half-open state.

### Health Checks

`src/modules/health/health.controller.ts` using `@nestjs/terminus`:
- `GET /health` — liveness probe (is the process alive?)
- `GET /api/health/ready` — readiness probe: checks PostgreSQL connection, Redis connection, disk space
- Wired to Docker's `HEALTHCHECK` directive so the orchestrator knows when the container is actually ready to serve traffic

---

## Key Files

- `apps/backend/Dockerfile`
- `apps/backend/docker-compose.yml`
- `apps/backend/nginx.conf`
- `apps/backend/src/main.ts`
- `apps/backend/src/modules/health/health.controller.ts`

---

## The Aha Moment

Run `docker stats` while load testing. Watch Postgres connections with:

```sql
SELECT count(*) FROM pg_stat_activity;
```

With PgBouncer: stays flat at ~20.
Without PgBouncer: spikes to 500+ and eventually errors with "too many connections".
