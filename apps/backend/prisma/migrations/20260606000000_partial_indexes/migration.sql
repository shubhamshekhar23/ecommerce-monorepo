-- Phase 1 — Partial Indexes
--
-- Plain @@index([isActive]) on a boolean column is nearly useless:
-- when 90% of rows have isActive = true, Postgres estimates a seq scan is cheaper
-- than the index lookup + random heap fetch and ignores the index entirely.
--
-- A partial index (WHERE isActive = true) indexes ONLY active rows:
--   - ~90% smaller than a full-table index
--   - fits in the shared_buffers cache instead of being evicted constantly
--   - Postgres always uses it for isActive = true queries because the planner
--     knows it covers exactly that predicate
--
-- Each index below is sized to match the real access pattern in the application.

-- ── Drop the plain isActive boolean indexes ────────────────────────────────────
-- These are superseded by the partial indexes below.

DROP INDEX IF EXISTS "Product_isActive_idx";
DROP INDEX IF EXISTS "ProductVariant_isActive_idx";
DROP INDEX IF EXISTS "User_isActive_idx";
DROP INDEX IF EXISTS "Coupon_isActive_idx";

-- ── Product ────────────────────────────────────────────────────────────────────
-- Access pattern 1: cursor-paginated browse, no category filter
--   WHERE isActive = true ORDER BY createdAt DESC, id DESC
CREATE INDEX "Product_active_createdAt_idx"
  ON "Product"("createdAt" DESC)
  WHERE "isActive" = true;

-- Access pattern 2: browse by category (most common filter)
--   WHERE isActive = true AND categoryId = $cat ORDER BY createdAt DESC
-- The (categoryId, createdAt DESC) composite lets Postgres seek to the
-- right category and scan in sort order without a filesort.
CREATE INDEX "Product_active_categoryId_createdAt_idx"
  ON "Product"("categoryId", "createdAt" DESC)
  WHERE "isActive" = true;

-- ── ProductVariant ─────────────────────────────────────────────────────────────
-- Access pattern: load active variants for a product page
--   WHERE productId = $id AND isActive = true
CREATE INDEX "ProductVariant_active_productId_idx"
  ON "ProductVariant"("productId")
  WHERE "isActive" = true;

-- ── Category ───────────────────────────────────────────────────────────────────
-- Access pattern: build the active category tree (navigation — runs on every page)
--   WHERE isActive = true AND parentId IS NULL   (root categories)
--   WHERE isActive = true AND parentId = $id     (children)
CREATE INDEX "Category_active_parentId_idx"
  ON "Category"("parentId")
  WHERE "isActive" = true;

-- ── Coupon ─────────────────────────────────────────────────────────────────────
-- Access pattern: validate a coupon code at checkout
--   WHERE code = $code AND isActive = true AND expiresAt > now()
-- Only active coupons are ever looked up by code in the checkout flow.
CREATE INDEX "Coupon_active_code_idx"
  ON "Coupon"("code")
  WHERE "isActive" = true;

-- ── User ───────────────────────────────────────────────────────────────────────
-- Access pattern: admin panel — list active users filtered by role
--   WHERE isActive = true AND role = $role ORDER BY createdAt DESC
CREATE INDEX "User_active_role_createdAt_idx"
  ON "User"("role", "createdAt" DESC)
  WHERE "isActive" = true;
