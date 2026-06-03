# Phase 10 — Advanced Database

**Status:** ✅ Done (verified against running app 2026-06-03)

---

## Bugs Found and Fixed During Verification

Three bugs were caught during live testing — all fixed before merge.

**Bug 1 — `GET /api/admin/db/partitions` returned 500**

`pg_class.reltuples` is typed as `BIGINT` in Postgres. Node's `JSON.stringify` throws `"Do not know how to serialize a BigInt"` on any BigInt value returned from a raw query. Fixed by casting to `BIGINT::TEXT` in the SQL so the value arrives as a string.

Why this happens: `prisma.$queryRaw` returns data with native JS types. Postgres `bigint`, `int8`, and `count()` results all map to JS `BigInt`, which JSON can't serialize. Any raw query that touches `pg_class`, `pg_stat_statements`, or uses `count(*)` must either cast to `TEXT`/`INT` in SQL or convert with `Number()` in the service.

**Bug 2 — `POST /api/admin/db/reset-stats` returned 500**

`pg_stat_statements_reset()` is a void-returning Postgres function (returns no rows). `prisma.$queryRaw` fails on void-returning calls because it expects a result set. Fixed by switching to `prisma.$executeRaw`, which is the correct method for statements that don't return rows.

Rule: use `$queryRaw` when you need results back; use `$executeRaw` for `UPDATE`, `DELETE`, `VACUUM`, or any function that returns `void`.

**Bug 3 — RequestMetricsMiddleware silently dropped all writes**

The original fire-and-forget used `void (this.prisma as any).requestMetric.create(...)`. The `void` keyword completely swallowed any Prisma errors with no log trace. During testing this caused 0 rows appearing in the table with no error message anywhere.

Fixed by chaining `.catch(err => this.logger.error('RequestMetric write failed', err.message))`. Also removed the unnecessary `as any` cast — `prisma generate` had already added `requestMetric` to the typed client.

Lesson: `void promise` is acceptable for fire-and-forget only when you are certain the promise cannot fail. For any I/O operation, always add `.catch()` even if you don't rethrow — at minimum log the error so it is observable.

---

## What Was Built

### 1. pg_stat_statements — Query Analysis

`prisma/migrations/20260529000000_phase10_pg_stat_statements/migration.sql`

`pg_stat_statements` is a Postgres extension that tracks cumulative execution statistics for every unique SQL query. Without it, finding slow queries means guessing. With it, you measure.

The extension requires `shared_preload_libraries` — this must be set at Postgres startup, not via SQL. Added to `docker-compose.yml`:

```yaml
command: >
  postgres
  -c shared_preload_libraries=pg_stat_statements
  -c pg_stat_statements.track=all
  -c wal_level=replica   # for streaming replication (Step 3)
  -c max_wal_senders=3
```

**Admin endpoints (all require `ADMIN` role):**

- `GET /api/admin/db/slow-queries?limit=10` — top N queries sorted by total execution time
- `POST /api/admin/db/reset-stats` — reset counters after optimising a query
- `GET /api/admin/db/table-stats` — dead tuples, live tuples, table sizes, last vacuum

**Key insight — sort by `total_exec_time`, not `mean_exec_time`:**

A query called 1 million times at 1ms average costs more CPU than a query called 10 times at 500ms. `total_exec_time = calls × mean`. Always fix the highest `total_exec_time` first. After adding an index, call `POST /reset-stats`, replay the load, then check again.

**Script:** `scripts/analyze-slow-queries.sh` — run from your machine to query the dev DB directly:

```bash
bash scripts/analyze-slow-queries.sh
bash scripts/analyze-slow-queries.sh 20       # top 20
bash scripts/analyze-slow-queries.sh 10 reset # show then reset
```

---

### 2. Table Partitioning — RequestMetric

`prisma/migrations/20260529000001_phase10_request_metrics_partitioned/migration.sql`

`prisma/schema.prisma` — `RequestMetric` model with `@@id([id, timestamp])`

**Why a new table rather than converting orders?**

Converting an existing table to partitioned requires: rename old table, create partitioned version, migrate all data, recreate all FKs pointing to it. On a table with FK references from multiple models (`OrderItem`, `ReturnRequest`, etc.) this is risky. `RequestMetric` is designed as partitioned from the start — no incoming FKs, composite PK.

**The key constraint:** PostgreSQL requires the partition key to be part of any unique constraint. Since we partition by `RANGE (timestamp)`, the PK must include `timestamp`:

```sql
PRIMARY KEY ("id", "timestamp")   -- correct for partitioned table
PRIMARY KEY ("id")                -- ERROR: insufficient columns in PRIMARY KEY
```

Prisma maps this to `@@id([id, timestamp])`.

**Partitions created:** Q1–Q4 2026, Q1 2027 — with an auto-create function for future quarters:

```sql
SELECT create_next_quarter_partition();  -- creates the NEXT quarter
```

**Middleware:** `src/common/middleware/request-metrics.middleware.ts` records 10% of HTTP requests into the table (sampled, fire-and-forget). After some traffic, demonstrate partition pruning:

```sql
-- EXPLAIN shows only request_metric_2026_q2 scanned:
EXPLAIN SELECT * FROM "RequestMetric"
WHERE timestamp >= '2026-04-01' AND timestamp < '2026-07-01';
```

The `EXPLAIN` output shows an `Append` node with only the matching partition — Q1 and Q3 are not scanned at all.

**Script:** `scripts/create-partition.sh` — create/list partitions manually:

```bash
bash scripts/create-partition.sh          # create next quarter
bash scripts/create-partition.sh list     # list all partitions and their sizes
```

**Admin endpoint:** `POST /api/admin/db/partitions/create-next` — call from the API instead of the shell.

---

### 3. Streaming Replication — Read Replica

`docker-compose.replica.yml` (monorepo root) — compose override file (not active by default)

`docker/postgres-replica/init-primary.sh` — configures the primary on first start

`docker/postgres-replica/init-replica.sh` — runs `pg_basebackup` on the replica on first start

**How to start with the replica:**

```bash
# from monorepo root:
docker compose -f docker-compose.yml -f docker-compose.replica.yml up -d
```

The replica container:
1. Waits for the primary to be healthy
2. Runs `pg_basebackup` — takes a full binary copy of the primary's data directory over the replication protocol
3. Writes `standby.signal` and `primary_conninfo` (the `-R` flag does this automatically)
4. Starts in hot standby mode — readable, but rejects writes

Primary exposes `:5434`, replica exposes `:5435`. The NestJS app connects to PgBouncer (`:6432`) for writes; `ReadReplicaService` connects to the replica at `READ_REPLICA_DATABASE_URL`.

**ReadReplicaService:** `src/modules/db-analytics/read-replica.service.ts`

A second `PrismaClient` instance pointed at `READ_REPLICA_DATABASE_URL`. Falls back to `DIRECT_DATABASE_URL` (primary direct) if the replica is not configured — so analytics endpoints work in both setups.

```env
# Add to apps/backend/.env when replica is running:
READ_REPLICA_DATABASE_URL=postgresql://ecommerce_user:ecommerce_password@localhost:5435/ecommerce_db
```

**Replication endpoints:**

- `GET /api/admin/db/replication/lag` — queries the replica for `pg_last_xact_replay_timestamp()`, reports lag in seconds
- `GET /api/admin/db/replication/status` — queries the primary's `pg_stat_replication`, shows connected replicas and byte-level lag

**Monitor lag from the primary:**

```sql
SELECT client_addr, state, (sent_lsn - replay_lsn) AS lag_bytes
FROM pg_stat_replication;
```

Healthy lag: < 1 second. Lag > 30s = stale reads on analytics queries.

**What queries to route to the replica:**

Use `ReadReplicaService` for: admin analytics, reports, aggregations, anything that tolerates seconds of lag.

Never use the replica for: stock checks at checkout, payment confirmation reads, any read where stale data has business consequences.

---

### 4. VACUUM and Bloat Monitoring

`GET /api/admin/db/table-stats` (part of `DbAnalyticsModule`)

`scripts/check-table-bloat.sh`

Dead tuples accumulate via MVCC — every UPDATE writes a new row version, every DELETE marks a row dead. VACUUM reclaims them. Without VACUUM, tables bloat and scans slow down.

The `pg_stat_user_tables` view reports:

- `n_dead_tup` — dead rows not yet vacuumed
- `n_live_tup` — visible rows
- `dead_pct` = `n_dead_tup / (n_live_tup + n_dead_tup)` — the bloat ratio
- `last_autovacuum` — when autovacuum last ran on this table

Rule of thumb: `dead_pct > 20%` on a high-write table (`OutboxEvent`, `AuditLog`, `Order`) means autovacuum is falling behind. Fix options:

- Short term: `VACUUM <table>` — reclaims dead rows, no lock
- Long term: tune `autovacuum_vacuum_scale_factor` (default 20%) down to 5% for high-write tables
- `VACUUM FULL` — reclaims all bloat but acquires an exclusive table lock for minutes. Almost never the right choice on a live production table. Use `pg_repack` instead.

**Script:**

```bash
bash scripts/check-table-bloat.sh          # show bloat report
bash scripts/check-table-bloat.sh vacuum   # show + VACUUM tables > 20% dead
```

---

## Key Files

- `prisma/migrations/20260529000000_phase10_pg_stat_statements/migration.sql`
- `prisma/migrations/20260529000001_phase10_request_metrics_partitioned/migration.sql`
- `prisma/migrations/20260529000002_phase10_replica_user/migration.sql`
- `prisma/schema.prisma` — `RequestMetric` model with composite PK
- `src/modules/db-analytics/db-analytics.service.ts`
- `src/modules/db-analytics/db-analytics.controller.ts`
- `src/modules/db-analytics/read-replica.service.ts`
- `src/common/middleware/request-metrics.middleware.ts`
- `docker-compose.yml` — postgres service updated with pg_stat_statements + WAL flags
- `docker-compose.replica.yml` — replica add-on (override file)
- `docker/postgres-replica/init-primary.sh`
- `docker/postgres-replica/init-replica.sh`
- `scripts/analyze-slow-queries.sh`
- `scripts/check-table-bloat.sh`
- `scripts/create-partition.sh`

---

## Running Phase 10

### 1. Apply migrations

```bash
cd apps/backend

# Restart postgres first (pg_stat_statements needs shared_preload_libraries at startup)
docker compose down postgres
docker compose up -d postgres
docker compose up -d pgbouncer

# Apply the three new migrations
npx prisma migrate deploy
```

### 2. Generate new Prisma client (for RequestMetric model)

```bash
npx prisma generate
```

### 3. Verify pg_stat_statements works

```bash
# Run some load
npm run load:mixed

# Check slow queries
bash scripts/analyze-slow-queries.sh

# Or via the API:
curl -H "Authorization: Bearer <admin-token>" http://localhost:4000/api/admin/db/slow-queries
```

### 4. Verify partitioned table

```bash
# List partitions
bash scripts/create-partition.sh list

# Check partition pruning (look for "Append" with filtered child tables)
docker compose exec postgres psql -U ecommerce_user ecommerce_db -c \
  "EXPLAIN SELECT * FROM \"RequestMetric\" WHERE timestamp >= '2026-04-01' AND timestamp < '2026-07-01';"
```

### 5. Start the read replica (optional)

```bash
# from monorepo root:
docker compose -f docker-compose.yml -f docker-compose.replica.yml up -d

# Check replication status after ~30 seconds:
curl -H "Authorization: Bearer <admin-token>" http://localhost:4000/api/admin/db/replication/lag
```

### 6. Check table bloat

```bash
bash scripts/check-table-bloat.sh
```

---

## CDC / Change Data Capture (Study Notes — Not Implemented)

The roadmap mentions WAL-based CDC as the production-grade alternative to the Outbox pattern for syncing data to the Search Service. Here's how it works conceptually:

Instead of the application writing to an `OutboxEvent` table and a processor polling it, a CDC tool (Debezium) subscribes directly to the Postgres WAL. Every INSERT/UPDATE/DELETE produces a CDC event with the before/after row state.

Benefits over the Outbox:
- Zero application overhead — the WAL is already written by Postgres; no extra table writes
- Exact row-level changes including before-state (useful for audit/sync)
- Near-zero lag (WAL events arrive within milliseconds of commit)

The tradeoff: Debezium requires Kafka (heavy) or Kafka-less mode with a connector; logical replication slots must be monitored (they block WAL cleanup if the consumer falls behind).

For this project's scale, the Outbox + RabbitMQ approach is simpler to operate. CDC becomes worth the complexity at very high write volumes or when you need multi-consumer fan-out of every row change.
