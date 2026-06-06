# Phase 1 — Database Deep Dive

**Status:** ✅ Done
**Concept cluster:** The DB knowledge that separates junior from senior. Every query decision here has a production rationale.

---

## What Was Built

### Product Variants Schema

Migration: `prisma/migrations/20260528000000_phase1_variants_fts/migration.sql`

The old `Product` model had a flat `price`/`stock` — impossible to sell "Size L, Color Red" at a different price than "Size S, Color Blue". The redesign:

```
Product (parent — searchable, displayable)
  └── VariantType ("Size", "Color")
        └── VariantOption ("S", "M", "L" / "Red", "Blue")
ProductVariant (the actual sellable SKU)
  └── VariantAttributeValue (variantId → optionId, composite PK)
  └── VariantImage (per-variant images)
```

Key decisions:

- `VariantAttributeValue` has a **composite primary key** (`variantId, optionId`) — enforces that a variant cannot have two options of the same type (e.g. Size=S AND Size=M at once)
- `OrderItem.variantAttributes` is a **JSONB snapshot** of attributes at purchase time, not a FK — a variant can be deleted or repriced after the order and the order still remembers exactly what was sold
- `CartItem.variantId` was added as nullable first (expand step) — this is the expand-contract migration pattern in action

### Cursor-Based Pagination

`src/common/utils/cursor-pagination.util.ts`

The `GET /api/products?cursor=<token>&limit=20` endpoint uses cursor pagination instead of offset:

```sql
-- Offset (bad at scale):
SELECT * FROM products ORDER BY id LIMIT 20 OFFSET 50000;
-- Postgres must count and discard 50,000 rows every time.

-- Cursor (correct):
SELECT * FROM products WHERE id > $cursor ORDER BY id LIMIT 20;
-- Jumps directly to the position via the index. O(log n), not O(n).
```

Cursors are opaque base64 tokens so clients cannot construct them manually. The `CursorPageDto` type encodes/decodes the cursor in the service layer.

### PostgreSQL Full-Text Search

`prisma/schema.prisma` — `Product.searchVector` is a **generated stored column**:

```sql
ALTER TABLE "Product" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', "name"), 'A') ||
    setweight(to_tsvector('english', coalesce("description", '')), 'B')
  ) STORED;

CREATE INDEX "Product_searchVector_idx" ON "Product" USING GIN ("searchVector");
```

- Weight A (name) ranks higher than weight B (description)
- GIN index makes `@@` queries fast — full sequential scan without it
- Zero external dependency: ships inside Postgres

Used in `src/modules/products/products.service.ts` via `prisma.$queryRaw` with `plainto_tsquery` + `ts_rank` ordering.

### Pessimistic Locking for Inventory

`src/modules/orders/orders.service.ts`

During order creation, stock is reserved inside a Prisma transaction with `SELECT FOR UPDATE`:

```sql
SELECT * FROM "ProductVariant" WHERE id = $id FOR UPDATE;
UPDATE "ProductVariant" SET stock = stock - $qty WHERE id = $id AND stock >= $qty;
```

Without `FOR UPDATE`: 10 concurrent checkout requests for the last unit all read `stock=1`, all pass the stock check, all succeed → oversell by 9.
With `FOR UPDATE`: the first transaction acquires the lock; the other 9 block until it commits, then see `stock=0` and correctly fail.

### Expand-Contract Migrations

Every schema change follows the expand-contract pattern to avoid downtime:

1. **Expand** — add the new column as nullable; deploy code that writes to both old and new
2. **Backfill** — migration populates the new column from existing data
3. **Contract** — make the new column required; remove the old column in a later deploy

Example: `CartItem.variantId` was introduced nullable. Old code that doesn't know about variants continues working. New code writes the variantId. Eventually the old column reference is dropped.

### Indexes

`prisma/migrations/20260224185818_add_indexes_user_product_order/migration.sql` and the phase 1 migration add:

- B-tree indexes on `Product(slug)`, `Product(categoryId)`, `Order(userId)`, `User(email)` — equality and range lookups
- GIN index on `Product(searchVector)` — full-text search
- Partial indexes for active-only queries (`prisma/migrations/20260606000000_partial_indexes/migration.sql`)

**Why not `@@index([isActive])`?**

A plain boolean index on a 90%-true column is ignored by the Postgres planner — it estimates a sequential scan is cheaper than the index lookup plus random heap fetch. These indexes wasted storage and were never used.

A partial index (with `WHERE isActive = true`) only indexes the rows that match the predicate. It is:
- ~90% smaller than a full-table index
- More likely to fit in `shared_buffers` (stays cached between requests)
- Always chosen by the planner for any query that filters `isActive = true`

```sql
-- Product: browse by category, sorted by recency (cursor pagination hot path)
CREATE INDEX "Product_active_categoryId_createdAt_idx"
  ON "Product"("categoryId", "createdAt" DESC) WHERE "isActive" = true;

-- ProductVariant: active variants for a product page
CREATE INDEX "ProductVariant_active_productId_idx"
  ON "ProductVariant"("productId") WHERE "isActive" = true;

-- Category: active category tree (navigation — runs on every page request)
CREATE INDEX "Category_active_parentId_idx"
  ON "Category"("parentId") WHERE "isActive" = true;

-- Coupon: code lookup at checkout
CREATE INDEX "Coupon_active_code_idx"
  ON "Coupon"("code") WHERE "isActive" = true;

-- User: admin panel role filter
CREATE INDEX "User_active_role_createdAt_idx"
  ON "User"("role", "createdAt" DESC) WHERE "isActive" = true;
```

These are managed by raw SQL migration (same pattern as `searchVector`) because Prisma's `@@index` does not support a `WHERE` clause for PostgreSQL. The plain `@@index([isActive])` entries were removed from `schema.prisma`.

---

## Contract Step (completed)

Migration: `prisma/migrations/20260605000000_phase1_contract/migration.sql`

### What changed

**App code** — all reads of `Product.price/cost/stock` replaced with `ProductVariant` equivalents:

- `cart.service.ts` — `addItem` now requires `variantId`; price/stock from `ProductVariant`; unique lookup is `cartId_variantId`
- `cart.controller.ts` — `POST /cart/items` body now accepts `variantId`
- `order-saga.service.ts` — Locks `ProductVariant` rows; checks `ProductVariant.stock`; snapshots variant price + attributes on `OrderItem`
- `products.service.ts` — `create` makes a default `ProductVariant`; listing returns `priceRange {min, max}`; FTS query joins variants for price
- `csv-import.service.ts` — Upserts `ProductVariant` with price/cost/stock instead of writing to `Product`
- `orders.service.ts` — Order cancellation restores `ProductVariant.stock`
- `returns.service.ts` — Return approval restores `ProductVariant.stock`
  |

**Contract migration**:

```sql
ALTER TABLE "Product" DROP COLUMN "price";
ALTER TABLE "Product" DROP COLUMN "cost";
ALTER TABLE "Product" DROP COLUMN "stock";

DELETE FROM "CartItem" WHERE "variantId" IS NULL;
ALTER TABLE "CartItem" ALTER COLUMN "variantId" SET NOT NULL;
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_cartId_productId_key";
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_variantId_key" UNIQUE ("cartId", "variantId");
```

The expand-contract pattern is now fully complete. `Product` is metadata-only (name, slug, description, category). All pricing and inventory live exclusively on `ProductVariant`.

### Indexes

`prisma/migrations/20260224185818_add_indexes_user_product_order/migration.sql` and the phase 1 migration add:

- B-tree indexes on `Product(slug)`, `Product(categoryId)`, `Order(userId)`, `User(email)` — equality and range lookups
- GIN index on `Product(searchVector)` — full-text search
- Partial indexes for active-only queries (only index rows where `isActive = true`)

---

## Key Files

- `prisma/migrations/20260528000000_phase1_variants_fts/migration.sql`
- `prisma/schema.prisma` (Product, ProductVariant, VariantType, VariantOption, VariantAttributeValue)
- `src/common/utils/cursor-pagination.util.ts`
- `src/modules/products/products.service.ts`
- `src/modules/products/variants/`

---

## The Aha Moment

Run `EXPLAIN ANALYZE` on a cursor query vs an offset query at page 2500:

```sql
EXPLAIN ANALYZE SELECT * FROM "Product" ORDER BY id LIMIT 20 OFFSET 50000;
-- Seq Scan / Index Scan with 50,000 rows discarded. Slow.

EXPLAIN ANALYZE SELECT * FROM "Product" WHERE id > '...' ORDER BY id LIMIT 20;
-- Index Scan, 0 rows discarded. Fast regardless of page number.
```

This is the single most common pagination mistake in production — offset gets slower with every page.

---
