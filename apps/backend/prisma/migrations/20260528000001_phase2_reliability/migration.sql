-- Phase 2: Reliability Patterns
-- Adds IdempotencyKey and OutboxEvent tables for duplicate-request prevention
-- and transactional at-least-once event delivery.

-- CreateEnum
CREATE TYPE "OutboxEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

-- IdempotencyKey: stores the request key and the cached response body so that
-- retrying the same POST /orders request returns the same result without
-- re-running the handler. The @@unique([userId, key]) ensures per-user uniqueness.
CREATE TABLE "IdempotencyKey" (
    "id"           TEXT         NOT NULL,
    "userId"       TEXT         NOT NULL,
    "key"          TEXT         NOT NULL,
    "statusCode"   INTEGER      NOT NULL DEFAULT 201,
    "responseBody" JSONB        NOT NULL DEFAULT '{}',
    "processedAt"  TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IdempotencyKey_userId_key_key" ON "IdempotencyKey"("userId", "key");
CREATE INDEX "IdempotencyKey_userId_idx"    ON "IdempotencyKey"("userId");
CREATE INDEX "IdempotencyKey_createdAt_idx" ON "IdempotencyKey"("createdAt");

-- OutboxEvent: domain events written atomically inside the business transaction
-- (order creation) and then dispatched asynchronously by the OutboxProcessor.
-- If the app crashes after the DB commit but before enqueuing, the processor
-- will retry on the next poll cycle — guaranteeing at-least-once delivery.
--
-- Why JSON payload (not FK)?  The event must survive even if related records are
-- deleted later.  Snapshot the data you need at publish time.
CREATE TABLE "OutboxEvent" (
    "id"            TEXT                 NOT NULL,
    "aggregateId"   TEXT                 NOT NULL,
    "aggregateType" TEXT                 NOT NULL,
    "eventType"     TEXT                 NOT NULL,
    "payload"       JSONB                NOT NULL,
    "status"        "OutboxEventStatus"  NOT NULL DEFAULT 'PENDING',
    "attempts"      INTEGER              NOT NULL DEFAULT 0,
    "error"         TEXT,
    "processedAt"   TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- Compound index: processor queries WHERE status='PENDING' ORDER BY createdAt ASC
CREATE INDEX "OutboxEvent_status_createdAt_idx" ON "OutboxEvent"("status", "createdAt");
CREATE INDEX "OutboxEvent_aggregateId_idx"      ON "OutboxEvent"("aggregateId");
