# Phase 1.1 — Database Advanced

**Status:** 🔲 Pending
**Builds on:** [Phase 1 — Database Deep Dive](./phase-1-database.md)
**Concept cluster:** Three patterns that make a mature data model: split hot/cold columns to keep index pages lean, migrate existing data without locking the table, and snapshot immutable facts at write time so history never lies.

---

## Vertical Partitioning — Hot/Cold Column Split on Product

**What:** Move rarely-read `Product` columns (`description`, `specifications` JSONB) into a separate `ProductDetail` table joined 1:1. The main `Product` table becomes narrow and fits more rows per 8 KB page.

**Why:** PostgreSQL reads full rows from heap pages. Every `findAllCursor` listing query currently drags along `description` and `specifications` even when rendering a 20-item product grid that shows only name and price. A narrower table means fewer I/O operations for the hot listing path.

**Approach:**
- Add `ProductDetail` model to `schema.prisma` with `@relation(fields: [productId], references: [id])`.
- Migration: `CREATE TABLE "ProductDetail" ...; INSERT INTO ... SELECT ... FROM "Product"; ALTER TABLE "Product" DROP COLUMN description, DROP COLUMN specifications;` — run the INSERT as a batched migration (see item below).
- `ProductsService.findOne()` → `include: { detail: true }`. `findAllCursor()` → omit the include entirely.

**Key files:**
- `apps/backend/prisma/schema.prisma` — add `ProductDetail` model
- `apps/backend/prisma/migrations/<timestamp>_vertical_partition_product/migration.sql`
- `apps/backend/src/modules/products/products.service.ts` — update selects
- `apps/backend/src/modules/products/dto/` — split list vs detail DTOs

---

## Large Table Migration with Batching

**What:** Migrate existing data (e.g., copying `Product.description` into `ProductDetail`) using a PL/pgSQL loop with `pg_sleep` between chunks, instead of a single `INSERT INTO ... SELECT` that holds a table lock for minutes.

**Why:** A naive one-shot INSERT on a 10M-row table holds an `ACCESS SHARE` lock for the entire duration, blocking writes. Batching releases the lock between chunks and gives the autovacuum and WAL time to breathe.

**Approach:**

```sql
DO $$
DECLARE
  batch_size INT := 1000;
  rows_moved INT;
BEGIN
  LOOP
    INSERT INTO "ProductDetail" (productId, description, specifications)
    SELECT id, description, specifications
    FROM "Product"
    WHERE id NOT IN (SELECT productId FROM "ProductDetail")
    LIMIT batch_size;

    GET DIAGNOSTICS rows_moved = ROW_COUNT;
    EXIT WHEN rows_moved = 0;

    PERFORM pg_sleep(0.05);
  END LOOP;
END $$;
```

This IS the data-copy step of the vertical partitioning migration above — pair them in the same migration file.

**Key files:**
- `apps/backend/prisma/migrations/<timestamp>_vertical_partition_product/migration.sql` — batched DO block

---

## Denormalization — Snapshot `categoryName` on `OrderItem`

**What:** At order-placement time, copy `Category.name` into `OrderItem.categoryName` so historical orders always show the correct category, even if the category is renamed or deleted later.

**Why:** Orders are immutable financial records. The schema already snapshots `price` on `OrderItem` for the same reason — a product price change should never retroactively alter an old order total. Category name deserves the same treatment.

**Approach:**
- Add `categoryName String?` to `OrderItem` in `schema.prisma`.
- Migration: `ALTER TABLE "OrderItem" ADD COLUMN "categoryName" TEXT`.
- Backfill: `UPDATE "OrderItem" oi SET "categoryName" = c.name FROM "Product" p JOIN "Category" c ON p."categoryId" = c.id WHERE oi."productId" = p.id AND oi."categoryName" IS NULL`.
- In `OrderSagaService.createOrderItems()`: resolve `product.category.name` and include it in the `create` data.

**Key files:**
- `apps/backend/prisma/schema.prisma` — add `categoryName String?` to `OrderItem`
- `apps/backend/prisma/migrations/<timestamp>_orderitem_category_name/migration.sql`
- `apps/backend/src/modules/orders/saga/order-saga.service.ts` — pass `categoryName` on item create
- `apps/backend/src/modules/orders/dto/order-response.dto.ts` — expose in response
