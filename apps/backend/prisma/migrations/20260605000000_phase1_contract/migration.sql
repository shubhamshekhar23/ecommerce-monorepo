-- Phase 1 Contract Step
--
-- The expand step (20260528000000_phase1_variants_fts) added ProductVariant tables
-- and made CartItem.variantId nullable so old code kept working.
-- All application code now reads price/stock from ProductVariant, not Product.
-- This migration completes the pattern: drops the legacy columns and enforces
-- the new constraints.
--
-- NOTE: searchVector is a GENERATED tsvector column managed by raw SQL (see
-- phase1_variants_fts migration). It is intentionally NOT declared in schema.prisma
-- so Prisma does not auto-manage it. Do NOT drop it here.

-- ── Step 1: Remove legacy price/cost/stock from Product ──────────────────────
-- These columns were the "expand" columns — kept alive while app code migrated.
-- All reads/writes now go through ProductVariant.price/cost/stock.
ALTER TABLE "Product" DROP COLUMN IF EXISTS "price";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "cost";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "stock";

-- Drop the price index — column no longer exists
DROP INDEX IF EXISTS "Product_price_idx";

-- ── Step 2: Enforce variantId on CartItem ────────────────────────────────────
-- Remove any cart items that still have variantId = NULL (stale dev data).
DELETE FROM "CartItem" WHERE "variantId" IS NULL;

-- Make variantId required
ALTER TABLE "CartItem" ALTER COLUMN "variantId" SET NOT NULL;

-- Swap unique constraint: was (cartId, productId) — now (cartId, variantId).
-- This allows a user to have two different variants of the same product in their cart.
ALTER TABLE "CartItem" DROP CONSTRAINT IF EXISTS "CartItem_cartId_productId_key";
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_variantId_key" UNIQUE ("cartId", "variantId");

-- Update FK: variantId was SET NULL on delete (variant deleted → item nulled).
-- Now it is RESTRICT — a variant with cart items cannot be deleted.
ALTER TABLE "CartItem" DROP CONSTRAINT IF EXISTS "CartItem_variantId_fkey";
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
