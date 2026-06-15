-- Phase 7 backfill: add variantId to OrderItem and StockAlert
-- OrderItem.variantId lets us restock the correct variant on refund (Item 5).
-- StockAlert.variantId enables variant-level subscription notifications (Item 7).

-- Migration A: OrderItem.variantId
ALTER TABLE "OrderItem" ADD COLUMN "variantId" TEXT;

CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Migration B: StockAlert.variantId
ALTER TABLE "StockAlert" ADD COLUMN "variantId" TEXT;

-- Drop old product+user unique constraint, replace with product+variant+user
DROP INDEX "StockAlert_productId_userId_key";

CREATE UNIQUE INDEX "StockAlert_productId_variantId_userId_key"
  ON "StockAlert"("productId", "variantId", "userId");

CREATE INDEX "StockAlert_variantId_notified_idx"
  ON "StockAlert"("variantId", "notified");

ALTER TABLE "StockAlert"
  ADD CONSTRAINT "StockAlert_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
