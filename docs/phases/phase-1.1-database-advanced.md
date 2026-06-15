# Phase 1.1 — Database Advanced

**Status:** 🔲 Pending
**Builds on:** [Phase 1 — Database Deep Dive](./phase-1-database.md)
**Concept cluster:** Four patterns that separate a production data layer from a dev one — split hot/cold columns to shrink index page footprint, migrate data without locking the table (using ID-range batching, not `NOT IN`), build indexes without blocking reads, and snapshot immutable facts at write time so history never lies.

---

## Vertical Partitioning — Hot/Cold Column Split on Product

**What:** Move rarely-read `Product` columns (`description`, `specifications` JSONB) into a separate `ProductDetail` table joined 1:1. The main `Product` table becomes narrow and fits more rows per 8 KB heap page.

**Why:** PostgreSQL reads full rows from heap pages. Every `findAllCursor` listing query drags along `description` and `specifications` even when rendering a 20-item product grid that only shows name and price. A narrower table means fewer I/O operations for the hot listing path; description columns only warm up `shared_buffers` when the detail page is actually loaded.

**Approach:**
- Add `ProductDetail` model to `schema.prisma` with `@relation(fields: [productId], references: [id])`.
- Migration: `CREATE TABLE "ProductDetail" ...; -- copy via batched DO block (see below); ALTER TABLE "Product" DROP COLUMN description, DROP COLUMN specifications;`
- `ProductsService.findOne()` → `include: { detail: true }`. `findAllCursor()` → omit the include entirely.
- Split DTOs: `ProductListItemDto` (hot columns only) vs `ProductDetailDto` (includes detail).

**Key files:**
- `apps/backend/prisma/schema.prisma` — add `ProductDetail` model
- `apps/backend/prisma/migrations/<timestamp>_vertical_partition_product/migration.sql`
- `apps/backend/src/modules/products/products.service.ts` — update selects
- `apps/backend/src/modules/products/dto/` — list vs detail DTOs

---

## Large Table Migration with Batching (ID-range)

**What:** Migrate existing data (e.g., copying rows into `ProductDetail`) using ID-range batching with a cursor, not `NOT IN` — which degrades to a full sequential scan on every batch iteration as the table grows.

**Why:** `NOT IN (SELECT id FROM target)` re-scans the target table on every loop iteration — O(n²) total work. ID-range batching (`WHERE id > $last_id LIMIT 1000`) is O(n) and keeps each chunk fast regardless of how many rows have already moved.

**Approach:**

```sql
DO $$
DECLARE
  last_id TEXT := '';
  batch   RECORD;
BEGIN
  LOOP
    SELECT MAX(id) INTO batch
    FROM (
      SELECT id FROM "Product"
      WHERE id > last_id
      ORDER BY id
      LIMIT 1000
    ) chunk;

    EXIT WHEN batch.id IS NULL;

    INSERT INTO "ProductDetail" (productId, description, specifications)
    SELECT id, description, specifications
    FROM "Product"
    WHERE id > last_id AND id <= batch.id;

    last_id := batch.id;
    PERFORM pg_sleep(0.05);   -- 50 ms breathing room between batches
  END LOOP;
END $$;
```

Pair this in the same migration file as the `CREATE TABLE` and the final `ALTER TABLE DROP COLUMN`.

**Key files:**
- `apps/backend/prisma/migrations/<timestamp>_vertical_partition_product/migration.sql` — batched DO block

---

## Concurrent Index Creation

**What:** Build new indexes using `CREATE INDEX CONCURRENTLY` so the table remains fully readable and writable during the build, instead of holding a share lock that blocks all writes.

**Why:** A standard `CREATE INDEX` on a large table takes an `ACCESS SHARE` lock during the scan phase, blocking all concurrent writes for potentially minutes. `CONCURRENTLY` builds the index in multiple passes while allowing concurrent reads and writes throughout. The trade-off: it takes longer and cannot be run inside a transaction block.

**Approach:**
- For any new index on an existing large table, write the migration as a plain SQL file with `CREATE INDEX CONCURRENTLY`.
- Because Prisma migrations run inside an implicit transaction, add `-- @db.no-transaction` at the top of the file (or use `prisma migrate --no-transaction` for this specific migration).
- Example:

```sql
-- This migration must run outside a transaction (CONCURRENTLY cannot run in one)
CREATE INDEX CONCURRENTLY "Product_name_gin_idx"
  ON "Product" USING gin (to_tsvector('english', name));
```

- Apply this pattern retroactively to any future large-table index additions in this codebase.

**Key files:**
- Any future `apps/backend/prisma/migrations/<timestamp>/migration.sql` that adds indexes to large tables

---

## Denormalization — Snapshot `categoryName` on `OrderItem`

**What:** At order-placement time, copy `Category.name` into `OrderItem.categoryName` so historical orders always show the correct category even if the category is renamed or deleted later.

**Why:** Orders are immutable financial records. The schema already snapshots `price` on `OrderItem` — a price change should never retroactively alter an old order total. Category name deserves the same treatment: an admin renaming "Electronics" to "Consumer Tech" should not silently rewrite order history.

**Approach:**
- Add `categoryName String?` to `OrderItem` in `schema.prisma`.
- Migration: `ALTER TABLE "OrderItem" ADD COLUMN "categoryName" TEXT`.
- Backfill using ID-range pattern: update existing rows in chunks joining `Product → Category`.
- In `OrderSagaService.createOrderItems()`: resolve `product.category.name` and include it in the `create` data.

**Key files:**
- `apps/backend/prisma/schema.prisma` — add `categoryName String?` to `OrderItem`
- `apps/backend/prisma/migrations/<timestamp>_orderitem_category_name/migration.sql`
- `apps/backend/src/modules/orders/saga/order-saga.service.ts` — pass `categoryName` on item create
- `apps/backend/src/modules/orders/dto/order-response.dto.ts` — expose in response
