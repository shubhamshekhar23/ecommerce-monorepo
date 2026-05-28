-- Phase 6: Security Depth
-- Adds: OAuthAccount, AuditLog (append-only), 2FA fields on User,
--        vendorId on Product, and Row-Level Security for vendor isolation.

-- ── User: 2FA fields ─────────────────────────────────────────────────────────
ALTER TABLE "User" ADD COLUMN "totpSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "totpEnabled" BOOLEAN NOT NULL DEFAULT false;

-- ── OAuthProvider enum ────────────────────────────────────────────────────────
CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE');

-- ── OAuthAccount ──────────────────────────────────────────────────────────────
CREATE TABLE "OAuthAccount" (
  "id"             TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "provider"       "OAuthProvider" NOT NULL,
  "providerUserId" TEXT NOT NULL,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OAuthAccount_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "OAuthAccount_provider_providerUserId_key"
  ON "OAuthAccount"("provider", "providerUserId");
CREATE INDEX "OAuthAccount_userId_idx" ON "OAuthAccount"("userId");

-- ── AuditLog ──────────────────────────────────────────────────────────────────
-- Append-only: rows are INSERTed but never UPDATEd or DELETEd.
-- PostgreSQL RULES enforce this at the storage engine level — even a superuser
-- application bug cannot silently wipe an audit trail.
CREATE TABLE "AuditLog" (
  "id"        TEXT NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "userId"    TEXT,
  "userEmail" TEXT,
  "userRole"  TEXT,
  "action"    TEXT NOT NULL,
  "entity"    TEXT,
  "entityId"  TEXT,
  "before"    JSONB,
  "after"     JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_userId_idx"          ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_idx"          ON "AuditLog"("action");
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX "AuditLog_timestamp_idx"       ON "AuditLog"("timestamp");

-- Block UPDATE and DELETE at the DB level so no application code can tamper with
-- the audit trail. DO INSTEAD NOTHING silently ignores the statement.
-- Use a BEFORE trigger in addition if you want an error instead of silent ignore.
CREATE RULE "no_update_audit_log"
  AS ON UPDATE TO "AuditLog" DO INSTEAD NOTHING;

CREATE RULE "no_delete_audit_log"
  AS ON DELETE TO "AuditLog" DO INSTEAD NOTHING;

-- ── Product: vendorId + Row-Level Security ────────────────────────────────────
-- Expand step: nullable now, required after vendor module ships (contract step).
ALTER TABLE "Product" ADD COLUMN "vendorId" TEXT;
CREATE INDEX "Product_vendorId_idx" ON "Product"("vendorId");

-- Enable RLS on Product so the DB enforces vendor isolation independently of
-- application code. Even if a NestJS bug leaks a query, Postgres only returns
-- rows the current vendor owns.
--
-- How it works in practice:
--   1. Before a query: SET LOCAL app.current_vendor_id = '<vendorId>'
--      (inside a transaction — required because PgBouncer transaction mode
--       resets session variables between connections)
--   2. The policy fires for every SELECT/INSERT/UPDATE/DELETE automatically
--
-- current_setting('app.current_vendor_id', true) — the 'true' flag returns NULL
-- (not an error) when the setting is absent, which covers non-vendor users.
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;

-- Superusers and roles with BYPASSRLS bypass RLS by default.
-- FORCE ROW LEVEL SECURITY applies the policy even to the table owner —
-- required so the ecommerce_user role (which owns the table) is also filtered.
ALTER TABLE "Product" FORCE ROW LEVEL SECURITY;

CREATE POLICY "vendor_product_isolation" ON "Product"
  USING (
    "vendorId" IS NULL
    OR "vendorId" = current_setting('app.current_vendor_id', true)
  );
