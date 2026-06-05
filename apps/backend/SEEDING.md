# Database Seeding Guide

Two seed scripts are available depending on your need.

## Choosing a seed

| | `prisma:seed` (minimal) | `prisma:seed:extensive` |
|---|---|---|
| **Use when** | Fast local resets during development | Load testing, realistic data, demo |
| **Runtime** | ~2s | ~10s |
| **Users** | 6 (1 admin + 5 fixed) | 201 (1 admin + 200 faker-generated) |
| **Products** | 12 (hardcoded) | 330 (15 per leaf category) |
| **Variants** | None | 2,325 ProductVariants with full attribute values |
| **Orders** | 5 | ~380 (weighted status distribution) |
| **Reviews** | None | ~1,370 with ProductRating aggregates |
| **Coupons** | None | 20 (5 fixed + 15 random) |
| **Addresses** | None | ~305 |
| **Carts** | None | ~140 carts, ~440 items |
| **Returns** | None | ~30 requests, ~55 items |
| **AuditLog** | None | 500 entries |
| **OutboxEvent** | None | 300 events |
| **Entry point** | `prisma/seed.ts` | `prisma/seed.extensive.ts` |

---

## Prerequisites

- Docker services running: `docker-compose up -d postgres redis`
- Dependencies installed: `npm install` (from monorepo root or `apps/backend`)

---

## Minimal seed

Hardcoded, deterministic, fast. Good for day-to-day development.

```bash
# From apps/backend/
npm run prisma:seed
```

**Test credentials**

```
admin@ecommerce.com   /  Admin@123
john.doe@example.com  /  User@123
jane.smith@example.com / User@123
```

**What it creates:** 6 users, 6 categories (Electronics + Fashion trees), 12 products with images, 5 carts with items, 5 orders across all statuses.

---

## Extensive seed

Uses `@faker-js/faker` to generate realistic volumes. Clears all data first, then re-populates. Run this when you need data that resembles production.

```bash
# From apps/backend/
npm run prisma:seed:extensive
```

**Test credentials**

```
admin@ecommerce.com  /  Admin@123
any other user       /  Password@123
```

**What it creates**

| Table | Count | Notes |
|---|---|---|
| User | 201 | 200 random + 1 fixed admin |
| Category | 27 | 5 roots, 22 leaf categories |
| Product | 330 | 15 per leaf category, faker names/descriptions |
| VariantType | ~435 | "Size", "Color", "RAM", etc. — varies by category |
| VariantOption | ~2,025 | "S/M/L", "Black/White", "8GB/16GB", etc. |
| ProductVariant | ~2,325 | One SKU per option combination, own price/stock |
| VariantImage | ~3,500 | 1–2 images per variant SKU |
| VariantAttributeValue | ~3,540 | Junction rows (e.g. Size=L AND Color=Red) |
| Address | ~305 | 1–2 per user, snapshot-safe |
| Coupon | 20 | SAVE10, SAVE20, FLAT15, NEWUSER, FREESHIP + 15 random |
| Order | ~380 | Weighted: ~50% DELIVERED, ~10% CANCELLED, etc. |
| OrderItem | ~950 | 1–4 items per order, variantAttributes JSONB snapshot |
| CouponUsage | ~75 | ~25% of paid orders applied a coupon |
| Cart / CartItem | ~140 / ~440 | Active sessions — ~70% of users have a cart |
| ProductReview | ~1,370 | PENDING / APPROVED / REJECTED |
| ProductRating | ~265 | Materialized aggregates auto-computed from approved reviews |
| StockAlert | ~20 | Users subscribed to out-of-stock products |
| ReturnRequest / ReturnItem | ~30 / ~55 | Return state machine — ~20% of DELIVERED orders |
| AuditLog | 500 | 21 action types with before/after diffs, real entity IDs, IP + user agent |
| OutboxEvent | 300 | 11 domain event types — ~50% PROCESSED, ~27% PENDING, ~13% PROCESSING, ~10% FAILED |

**Variant config by category** — the seed uses category-aware variant types so the data is realistic:

| Category | Variant Types |
|---|---|
| Men's / Women's Clothing | Size (XS–XXL) × Color |
| Footwear | Size (6–12) × Color |
| Laptops | RAM (8/16/32GB) × Storage (256GB–1TB) |
| Smartphones | Storage (64–512GB) × Color |
| Audio, Watches, Bedding | Category-appropriate types |
| Everything else | Color |

---

## Modular structure

The extensive seed is split into modules under `prisma/seeds/`:

```
prisma/
  seed.ts                  ← minimal seed (entry point)
  seed.extensive.ts        ← extensive seed (entry point)
  seeds/
    constants.ts           ← volume knobs (COUNTS.USERS, COUNTS.PRODUCTS_PER_LEAF_CATEGORY, …)
    users.ts
    categories.ts
    products.ts            ← also handles VariantType / VariantOption / ProductVariant / VariantImage
    coupons.ts             ← must run before orders (orders reference coupon IDs)
    orders.ts              ← also writes CouponUsage rows
    addresses.ts
    carts.ts               ← Cart + CartItem (with real variantId references)
    reviews.ts             ← ProductReview + ProductRating aggregates
    stock-alerts.ts        ← StockAlert (only for out-of-stock products)
    returns.ts             ← ReturnRequest + ReturnItem (only for DELIVERED orders)
    audit-log.ts           ← AuditLog (500 entries across 21 action types)
    outbox-events.ts       ← OutboxEvent (300 events across PROCESSED/PENDING/FAILED)
```

To change volumes, edit `prisma/seeds/constants.ts`:

```ts
export const COUNTS = {
  USERS: 200,
  PRODUCTS_PER_LEAF_CATEGORY: 15,
  MAX_VARIANTS_PER_PRODUCT: 12,
  ORDERS_PER_USER: 4,
  REVIEWS_PER_PRODUCT: 8,
  COUPONS: 20,
  ADDRESSES_PER_USER: 2,
};
```

---

## Resetting data

Both seeds clear all existing data before inserting, so running either one is a full reset:

```bash
npm run prisma:seed             # reset to minimal state
npm run prisma:seed:extensive   # reset to extensive state
```

For a full schema + data reset (re-runs all migrations too):

```bash
npx prisma migrate reset        # runs migrations then prisma:seed automatically
```

---

## Troubleshooting

**`ENOENT: no such file or directory, open 'prisma/schema.prisma'`**
Run the command from `apps/backend/`, not the monorepo root.

**`P1000: Authentication failed`**
Check `DIRECT_DATABASE_URL` in `apps/backend/.env` — the extensive seed uses this to bypass PgBouncer.

**`P2002: Unique constraint failed`**
Faker occasionally generates a duplicate email or slug. Both seeds use `skipDuplicates: true` / `.catch(() => {})` on affected tables so this is handled automatically.

**Seed hangs**
Check that the `postgres` container is healthy: `docker-compose ps postgres`.
