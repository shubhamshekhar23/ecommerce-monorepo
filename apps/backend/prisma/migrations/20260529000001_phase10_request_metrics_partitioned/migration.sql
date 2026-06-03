-- Phase 10: RequestMetric table — range-partitioned by timestamp
--
-- Why this table demonstrates partitioning better than converting orders:
--   - Designed as partitioned from scratch (no existing FK references to migrate)
--   - (id, timestamp) composite PK satisfies the PostgreSQL requirement:
--     partition key MUST be part of any unique/PK constraint
--   - Natural time-series access pattern: almost all queries filter by date range
--   - Archiving is instant: DROP TABLE request_metric_2025_q4 requires no VACUUM
--
-- Why (id, timestamp) and not just (id)?
--   PostgreSQL cannot enforce uniqueness across partitions unless the partition
--   key is included. If we used PRIMARY KEY (id) alone on a partitioned table,
--   Postgres would raise: "insufficient columns in PRIMARY KEY for partition key".
--
-- Prisma note: Prisma maps @@id([id, timestamp]) to this composite PK.
-- findUnique({ where: { id_timestamp: { id, timestamp } } }) works correctly.
-- For findById-style lookups, use findFirst({ where: { id } }) — it uses the index.

CREATE TABLE "RequestMetric" (
    "id"         BIGSERIAL,
    "timestamp"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "method"     TEXT NOT NULL,
    "path"       TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "userId"     TEXT,
    PRIMARY KEY ("id", "timestamp")
) PARTITION BY RANGE ("timestamp");

-- ── Partitions: one per quarter ─────────────────────────────────────────────
-- Today is 2026-06-03 so Q1 and Q2 are active/recent.
-- Always create at least 2 future quarters ahead.

CREATE TABLE "request_metric_2026_q1" PARTITION OF "RequestMetric"
    FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');

CREATE TABLE "request_metric_2026_q2" PARTITION OF "RequestMetric"
    FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');

CREATE TABLE "request_metric_2026_q3" PARTITION OF "RequestMetric"
    FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');

CREATE TABLE "request_metric_2026_q4" PARTITION OF "RequestMetric"
    FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

CREATE TABLE "request_metric_2027_q1" PARTITION OF "RequestMetric"
    FOR VALUES FROM ('2027-01-01 00:00:00+00') TO ('2027-04-01 00:00:00+00');

-- ── Indexes ──────────────────────────────────────────────────────────────────
-- Created on the parent — automatically inherited by all child partitions.
CREATE INDEX "request_metric_timestamp_idx" ON "RequestMetric" ("timestamp");
CREATE INDEX "request_metric_path_status_idx" ON "RequestMetric" ("path", "statusCode");
CREATE INDEX "request_metric_user_idx" ON "RequestMetric" ("userId") WHERE "userId" IS NOT NULL;

-- ── Auto-partition function ───────────────────────────────────────────────────
-- Creates the NEXT quarter's partition.
-- Call from a monthly maintenance cron: SELECT create_next_quarter_partition();
-- or from the admin API: POST /api/admin/db/partitions/create-next
CREATE OR REPLACE FUNCTION create_next_quarter_partition(
    base_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS TEXT AS $$
DECLARE
    quarter_start  TIMESTAMPTZ;
    quarter_end    TIMESTAMPTZ;
    partition_name TEXT;
BEGIN
    -- Advance to the start of the quarter AFTER the one containing base_date
    quarter_start := date_trunc('quarter', base_date + INTERVAL '3 months');
    quarter_end   := quarter_start + INTERVAL '3 months';
    partition_name := 'request_metric_' ||
        to_char(quarter_start, 'YYYY') || '_q' ||
        to_char(quarter_start, 'Q');

    IF EXISTS (
        SELECT 1 FROM pg_tables
        WHERE tablename = partition_name AND schemaname = 'public'
    ) THEN
        RETURN 'Already exists: ' || partition_name;
    END IF;

    EXECUTE format(
        'CREATE TABLE %I PARTITION OF "RequestMetric" FOR VALUES FROM (%L) TO (%L)',
        partition_name, quarter_start, quarter_end
    );
    RETURN 'Created: ' || partition_name;
END;
$$ LANGUAGE plpgsql;
