-- Phase 1 Backfill — Soft Delete with deletedAt Timestamp
--
-- isActive = false is ambiguous: it means "deactivated" OR "deleted" with no way to tell.
-- A nullable deletedAt timestamp is unambiguous:
--   - NULL                → not deleted
--   - a timestamp         → soft-deleted at that moment (audit trail)
--   - isActive = false    → separately means "admin-deactivated" (non-destructive)
--
-- The WHERE deletedAt IS NULL partial index is tiny (only deleted rows are excluded)
-- and always matches the filter used in every active-record query.

-- ── User ──────────────────────────────────────────────────────────────────────
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Partial index: only non-deleted users are ever queried (the default)
CREATE INDEX "User_deletedAt_not_deleted_idx"
  ON "User"("createdAt" DESC)
  WHERE "deletedAt" IS NULL;

-- ── Product ───────────────────────────────────────────────────────────────────
ALTER TABLE "Product" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Combined with isActive so the product list query
--   WHERE isActive = true AND deletedAt IS NULL ORDER BY createdAt DESC
-- can use a single partial index.
CREATE INDEX "Product_active_not_deleted_idx"
  ON "Product"("createdAt" DESC)
  WHERE "isActive" = true AND "deletedAt" IS NULL;
