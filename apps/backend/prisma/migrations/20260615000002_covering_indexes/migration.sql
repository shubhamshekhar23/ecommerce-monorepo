-- Phase 1 Backfill — Covering Indexes
--
-- A covering index (using PostgreSQL INCLUDE) stores extra columns alongside the
-- key columns so that the query engine can satisfy the entire SELECT from the
-- index without touching the heap (table pages). This eliminates random I/O for
-- the most frequent read paths.
--
-- When to use INCLUDE vs. adding columns to the key:
--   - Key columns: used in WHERE, JOIN, or ORDER BY — they must be in the key.
--   - INCLUDE columns: only projected in SELECT — storing them in the key would
--     increase index fan-out and bloat without improving selectivity.

-- ── ProductVariant price range lookup ─────────────────────────────────────────
-- Query: SELECT price FROM "ProductVariant" WHERE productId = $id AND isActive = true
-- Used in every product list page to compute min/max price range.
-- The existing Product_active_productId_idx covers the WHERE/JOIN, but Postgres
-- must still fetch the heap page to read `price`. INCLUDE (price) eliminates that.
DROP INDEX IF EXISTS "ProductVariant_active_productId_idx";
CREATE INDEX "ProductVariant_active_productId_price_idx"
  ON "ProductVariant"("productId")
  INCLUDE ("price")
  WHERE "isActive" = true;

-- ── OrderItem fetch by order ───────────────────────────────────────────────────
-- Query: SELECT productId, variantId, quantity, price FROM "OrderItem" WHERE orderId = $id
-- This is the inner loop of every order detail page and invoice render.
-- The heap fetch to read these four columns per row is eliminated by INCLUDE.
CREATE INDEX "OrderItem_orderId_covering_idx"
  ON "OrderItem"("orderId")
  INCLUDE ("productId", "variantId", "quantity", "price");
