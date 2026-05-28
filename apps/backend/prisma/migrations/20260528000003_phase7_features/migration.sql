-- Phase 7: Core Feature Backfill
-- Adds: Address, Coupon, ProductReview, ProductRating, StockAlert,
--        PasswordResetToken, ReturnRequest, ReturnItem
--        + snapshot columns on Order

-- ── Enums ─────────────────────────────────────────────────────────────────────
CREATE TYPE "CouponType"    AS ENUM ('PERCENTAGE', 'FIXED');
CREATE TYPE "ReviewStatus"  AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "ReturnStatus"  AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED');

-- ── Order: snapshot columns ───────────────────────────────────────────────────
ALTER TABLE "Order" ADD COLUMN "subtotal"         DECIMAL(10,2);
ALTER TABLE "Order" ADD COLUMN "discountAmount"   DECIMAL(10,2);
ALTER TABLE "Order" ADD COLUMN "shippingCost"     DECIMAL(10,2);
ALTER TABLE "Order" ADD COLUMN "taxAmount"        DECIMAL(10,2);
ALTER TABLE "Order" ADD COLUMN "couponId"         TEXT;
ALTER TABLE "Order" ADD COLUMN "couponCode"       TEXT;
-- Snapshot of shipping address — JSON so the order survives address edits/deletes
ALTER TABLE "Order" ADD COLUMN "shippingAddress"  JSONB;

-- ── Address ───────────────────────────────────────────────────────────────────
CREATE TABLE "Address" (
  "id"         TEXT        NOT NULL,
  "userId"     TEXT        NOT NULL,
  "firstName"  TEXT        NOT NULL,
  "lastName"   TEXT        NOT NULL,
  "line1"      TEXT        NOT NULL,
  "line2"      TEXT,
  "city"       TEXT        NOT NULL,
  "state"      TEXT        NOT NULL,
  "country"    TEXT        NOT NULL,
  "postalCode" TEXT        NOT NULL,
  "isDefault"  BOOLEAN     NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL,

  CONSTRAINT "Address_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Address_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- ── Coupon ────────────────────────────────────────────────────────────────────
CREATE TABLE "Coupon" (
  "id"             TEXT           NOT NULL,
  "code"           TEXT           NOT NULL,
  "type"           "CouponType"   NOT NULL,
  "value"          DECIMAL(10,2)  NOT NULL,
  "minOrderAmount" DECIMAL(10,2),
  "maxUses"        INTEGER,
  "usedCount"      INTEGER        NOT NULL DEFAULT 0,
  "expiresAt"      TIMESTAMPTZ,
  "isActive"       BOOLEAN        NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX "Coupon_isActive_idx"    ON "Coupon"("isActive");

CREATE TABLE "CouponUsage" (
  "id"       TEXT        NOT NULL,
  "couponId" TEXT        NOT NULL,
  "orderId"  TEXT        NOT NULL,
  "userId"   TEXT        NOT NULL,
  "usedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "CouponUsage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CouponUsage_couponId_fkey"
    FOREIGN KEY ("couponId") REFERENCES "Coupon"("id")
);
CREATE UNIQUE INDEX "CouponUsage_couponId_orderId_key" ON "CouponUsage"("couponId", "orderId");
CREATE INDEX "CouponUsage_couponId_idx" ON "CouponUsage"("couponId");
CREATE INDEX "CouponUsage_userId_idx"   ON "CouponUsage"("userId");

-- ── ProductReview + ProductRating ─────────────────────────────────────────────
CREATE TABLE "ProductReview" (
  "id"        TEXT           NOT NULL,
  "productId" TEXT           NOT NULL,
  "userId"    TEXT           NOT NULL,
  "rating"    INTEGER        NOT NULL,
  "title"     TEXT,
  "body"      TEXT,
  "status"    "ReviewStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ    NOT NULL,

  CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductReview_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE,
  CONSTRAINT "ProductReview_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "ProductReview_rating_check" CHECK ("rating" BETWEEN 1 AND 5)
);
CREATE UNIQUE INDEX "ProductReview_productId_userId_key" ON "ProductReview"("productId", "userId");
CREATE INDEX "ProductReview_productId_status_idx" ON "ProductReview"("productId", "status");
CREATE INDEX "ProductReview_status_idx"            ON "ProductReview"("status");

-- Materialized aggregate — updated by event handler, not by direct writes.
CREATE TABLE "ProductRating" (
  "productId"   TEXT          NOT NULL,
  "avgRating"   DECIMAL(3,2)  NOT NULL,
  "reviewCount" INTEGER       NOT NULL DEFAULT 0,
  "updatedAt"   TIMESTAMPTZ   NOT NULL,

  CONSTRAINT "ProductRating_pkey" PRIMARY KEY ("productId"),
  CONSTRAINT "ProductRating_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE
);

-- ── StockAlert ────────────────────────────────────────────────────────────────
CREATE TABLE "StockAlert" (
  "id"        TEXT        NOT NULL,
  "productId" TEXT        NOT NULL,
  "userId"    TEXT        NOT NULL,
  "email"     TEXT        NOT NULL,
  "notified"  BOOLEAN     NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "StockAlert_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockAlert_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE,
  CONSTRAINT "StockAlert_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "StockAlert_productId_userId_key" ON "StockAlert"("productId", "userId");
CREATE INDEX "StockAlert_productId_notified_idx"     ON "StockAlert"("productId", "notified");

-- ── PasswordResetToken ────────────────────────────────────────────────────────
-- tokenHash stores SHA-256(rawToken). The raw token is only in the email link.
-- On verification: hash(submitted) == tokenHash AND usedAt IS NULL AND expiresAt > now()
CREATE TABLE "PasswordResetToken" (
  "id"        TEXT        NOT NULL,
  "userId"    TEXT        NOT NULL,
  "tokenHash" TEXT        NOT NULL,
  "usedAt"    TIMESTAMPTZ,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PasswordResetToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_idx"           ON "PasswordResetToken"("userId");

-- ── ReturnRequest + ReturnItem ────────────────────────────────────────────────
CREATE TABLE "ReturnRequest" (
  "id"        TEXT           NOT NULL,
  "orderId"   TEXT           NOT NULL,
  "userId"    TEXT           NOT NULL,
  "reason"    TEXT           NOT NULL,
  "status"    "ReturnStatus" NOT NULL DEFAULT 'PENDING',
  "refundId"  TEXT,
  "createdAt" TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ    NOT NULL,

  CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReturnRequest_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id"),
  CONSTRAINT "ReturnRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
);
CREATE INDEX "ReturnRequest_orderId_idx" ON "ReturnRequest"("orderId");
CREATE INDEX "ReturnRequest_userId_idx"  ON "ReturnRequest"("userId");
CREATE INDEX "ReturnRequest_status_idx"  ON "ReturnRequest"("status");

CREATE TABLE "ReturnItem" (
  "id"              TEXT    NOT NULL,
  "returnRequestId" TEXT    NOT NULL,
  "orderItemId"     TEXT    NOT NULL,
  "quantity"        INTEGER NOT NULL,
  "reason"          TEXT,

  CONSTRAINT "ReturnItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReturnItem_returnRequestId_fkey"
    FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE,
  CONSTRAINT "ReturnItem_orderItemId_fkey"
    FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id")
);
CREATE INDEX "ReturnItem_returnRequestId_idx" ON "ReturnItem"("returnRequestId");
