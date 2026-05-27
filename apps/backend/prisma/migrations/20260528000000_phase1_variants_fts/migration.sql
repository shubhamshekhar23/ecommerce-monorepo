-- Phase 1: Product Variants + Full-Text Search
--
-- Learning concepts demonstrated here:
--   1. Schema normalization: product → variant type → option → variant SKU
--   2. Expand-contract pattern: CartItem.variantId added nullable (expand step)
--   3. Generated tsvector column + GIN index for zero-dependency full-text search
--   4. Composite primary key on VariantAttributeValue (enforces 1 option per type)

-- ── Variant Taxonomy ──────────────────────────────────────────────────────────

-- CreateTable: VariantType ("Size", "Color" — belongs to a Product)
CREATE TABLE "VariantType" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VariantType_pkey" PRIMARY KEY ("id")
);

-- CreateTable: VariantOption ("S", "M", "L", "Red" — belongs to a VariantType)
CREATE TABLE "VariantOption" (
    "id" TEXT NOT NULL,
    "variantTypeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "VariantOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ProductVariant (the actual sellable SKU with price/cost/stock)
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "cost" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable: VariantImage (per-variant images)
CREATE TABLE "VariantImage" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VariantImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable: VariantAttributeValue (junction: variantId + optionId)
-- Composite PK prevents a variant from having two options of the same type (e.g. Size=S AND Size=M)
CREATE TABLE "VariantAttributeValue" (
    "variantId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,

    CONSTRAINT "VariantAttributeValue_pkey" PRIMARY KEY ("variantId","optionId")
);

-- ── Expand-contract: CartItem ─────────────────────────────────────────────────
-- Step 1 (Expand): add variantId nullable — existing rows are unaffected.
-- Step 2 (Backfill): create a default variant per product, update cartItems.variantId.
-- Step 3 (Contract, future migration): make variantId NOT NULL, drop productId FK,
--   change @@unique([cartId, productId]) → @@unique([cartId, variantId]).
ALTER TABLE "CartItem" ADD COLUMN "variantId" TEXT;

-- ── OrderItem: variant attributes snapshot ────────────────────────────────────
-- JSONB snapshot of variant attributes at purchase time (e.g. {"Size":"L","Color":"Red"}).
-- Stored as JSON, NOT a FK, because variants can be deleted after purchase.
ALTER TABLE "OrderItem" ADD COLUMN "variantAttributes" JSONB;

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX "VariantType_productId_name_key" ON "VariantType"("productId", "name");
CREATE INDEX "VariantType_productId_idx" ON "VariantType"("productId");

CREATE UNIQUE INDEX "VariantOption_variantTypeId_value_key" ON "VariantOption"("variantTypeId", "value");
CREATE INDEX "VariantOption_variantTypeId_idx" ON "VariantOption"("variantTypeId");

CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");
CREATE INDEX "ProductVariant_sku_idx" ON "ProductVariant"("sku");
CREATE INDEX "ProductVariant_isActive_idx" ON "ProductVariant"("isActive");
CREATE INDEX "ProductVariant_productId_isActive_idx" ON "ProductVariant"("productId", "isActive");

CREATE INDEX "VariantImage_variantId_idx" ON "VariantImage"("variantId");

CREATE INDEX "VariantAttributeValue_variantId_idx" ON "VariantAttributeValue"("variantId");
CREATE INDEX "VariantAttributeValue_optionId_idx" ON "VariantAttributeValue"("optionId");

CREATE INDEX "CartItem_variantId_idx" ON "CartItem"("variantId");

-- ── Full-Text Search: Generated tsvector column + GIN index ───────────────────
-- Why no Elasticsearch? PostgreSQL's built-in FTS handles 99% of e-commerce search needs.
-- tsvector: pre-tokenised, stemmed representation of the text.
-- setweight A/B: name matches rank higher than description matches.
-- GENERATED ALWAYS AS: Postgres maintains this automatically — no application code needed.
-- GIN index: inverted index purpose-built for full-text and array containment queries.
--
-- Query pattern (in service layer):
--   WHERE "searchVector" @@ plainto_tsquery('english', $1)
--   ORDER BY ts_rank("searchVector", plainto_tsquery('english', $1)) DESC
ALTER TABLE "Product" ADD COLUMN "searchVector" tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', "name"), 'A') ||
        setweight(to_tsvector('english', COALESCE("description", '')), 'B')
    ) STORED;

CREATE INDEX "products_search_vector_idx" ON "Product" USING GIN("searchVector");

-- ── Foreign Keys ──────────────────────────────────────────────────────────────

ALTER TABLE "VariantType" ADD CONSTRAINT "VariantType_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VariantOption" ADD CONSTRAINT "VariantOption_variantTypeId_fkey"
    FOREIGN KEY ("variantTypeId") REFERENCES "VariantType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VariantImage" ADD CONSTRAINT "VariantImage_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VariantAttributeValue" ADD CONSTRAINT "VariantAttributeValue_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VariantAttributeValue" ADD CONSTRAINT "VariantAttributeValue_optionId_fkey"
    FOREIGN KEY ("optionId") REFERENCES "VariantOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
