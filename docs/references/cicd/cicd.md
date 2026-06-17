# Phase 8 — CI/CD & Production Readiness

**Status:** ✅ Done
**Concept cluster:** How code gets to production without waking anyone up at 3am.

---

## What Was Built

### GitHub Actions Pipeline

`.github/workflows/ci.yml`

Triggered on push or PR to `main` or `develop` (path-filtered: only when backend files change).

Pipeline stages:

```
Push to develop/main
  │
  ├─ [parallel] Lint & Type Check (~10 min)
  │    ├── npm run lint:check      (ESLint)
  │    ├── npm run format:check    (Prettier)
  │    └── npm run type-check      (tsc --noEmit, no emitting files)
  │
  ├─ [parallel] Migration Safety Check (~5 min)
  │    └── apps/backend/scripts/migration-safety-check.sh
  │
  ├─ [sequential] Tests (~20 min) — uses real postgres + redis, NOT mocks
  │    ├── npx prisma generate
  │    ├── npx prisma migrate deploy
  │    └── npm run test --coverage → uploaded to Codecov
  │
  └─ [on push only] Build & Deploy
       ├── Docker multi-stage build
       ├── Push to ghcr.io with tags: sha-<commit> and branch (develop/main)
       ├── [develop] → blue-green deploy to staging (auto)
       └── [main]    → blue-green deploy to production (requires manual approval)
```

Key decisions:
- Tests run against a **real Postgres and real Redis** (GitHub Actions services), not mocks. Mocked tests gave false confidence in the past when mock behaviour diverged from real DB behaviour.
- Docker layer cache is used (`cache-from: type=gha`) so `npm ci` is cached as long as `package-lock.json` doesn't change. Without this, every CI run reinstalls all dependencies (~2 min wasted).
- Each pushed image gets an immutable `sha-<commit>` tag for rollback plus a floating `develop`/`main` tag for the deploy script.

### Migration Safety Check

`apps/backend/scripts/migration-safety-check.sh`

Runs before tests. Parses the latest pending migration SQL and fails the pipeline if it contains:

- `DROP COLUMN` on a column that may still be in use by the current deployed code
- `ALTER COLUMN TYPE` on a non-nullable column (requires a full table rewrite → lock)
- `DROP TABLE`
- `CREATE INDEX` without `CONCURRENTLY` (locks the table during build)

This enforces the expand-contract discipline at the CI level. A developer cannot accidentally deploy a breaking migration.

### Zero-Downtime Blue-Green Deploy

`apps/backend/scripts/blue-green-deploy.sh`

```
1. Pull new image from registry
2. Start "green" container with new image
3. Wait for green's health check to return 200 (max 60s)
4. Update Nginx upstream: switch traffic from blue → green
   (nginx -s reload — zero-downtime, in-flight requests on blue finish)
5. Drain blue: wait for its connection count to reach 0 (max 30s)
6. Stop blue container
```

Nginx's `proxy_next_upstream` handles the upstream swap without dropping any requests. If green's health check never passes, the script aborts and blue continues serving.

Why not Kubernetes? This project uses self-hosted Docker only. Blue-green with Nginx + Docker Compose achieves the same zero-downtime deploy at zero infrastructure cost.

### Why Migrations Run Before Code

The deploy order is always: **run migration → deploy new code** (never the reverse).

- New code expects the new schema. Deploy code first → it queries a column that doesn't exist → 500 errors until migration runs.
- Old code ignores unknown columns (Postgres just returns extra data that the old Prisma client doesn't know about). Old code + new schema is safe.
- New code + old schema is never safe.

For column removal (contract step): the column is only dropped after a deploy where the new code no longer references it. This means at least two deploys per column removal — but zero downtime.

### Automated Database Backup

`apps/backend/scripts/backup.sh`

Scheduled via cron (daily at 2 AM):

```bash
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
# Retain last 30 days: find ./backups -mtime +30 -delete
```

The backup is tested monthly with a restore drill to a separate database. **Backups you have never tested do not exist** — they may fail silently (corruption, wrong credentials, incomplete dump).

---

## Key Files

- `.github/workflows/ci.yml`
- `apps/backend/scripts/blue-green-deploy.sh`
- `apps/backend/scripts/migration-safety-check.sh`
- `apps/backend/scripts/backup.sh`
- `apps/backend/Dockerfile` (multi-stage build, layer ordering for cache)

---

## Docker Layer Ordering (for CI cache effectiveness)

```dockerfile
# CORRECT: least-changing layers first
COPY package.json package-lock.json ./   # rarely changes
RUN npm ci                               # cached unless lock file changes

COPY . .                                 # changes on every commit
RUN npm run build
```

Wrong order: `COPY . .` first → every commit busts the npm cache → `npm ci` reruns on every push → 2 extra minutes per CI run.
