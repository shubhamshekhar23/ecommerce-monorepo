# Phase 7.1 — API Advanced

**Status:** 🔲 Partial — Advanced filtering ✅ done; dynamic sorting, field selection, ETag pending
**Builds on:** [Phase 7 — Core Feature Backfill](./phase-7-features.md)
**Concept cluster:** Four REST API features that give clients control over what they receive — sorting by any field, filtering on any dimension, selecting only needed fields (at the ORM layer, not post-fetch), and conditional requests that skip bandwidth when nothing changed.

See [Phase 7.2 — Realtime APIs](./phase-7.2-realtime.md) and [Phase 7.3 — GraphQL](./phase-7.3-graphql.md) for push and query-based protocols.

---

## Dynamic Sorting — Single and Multi-field (`?sort=`)

**What:** Accept `?sort=price:asc` or `?sort=createdAt:desc,name:asc` on list endpoints and translate to a Prisma `orderBy` clause. Validate field names against an allowlist to prevent arbitrary column exposure.

**Why:** Clients currently receive data in fixed order (newest first). Allowing sort control server-side is cheaper and safer than returning full datasets for client-side sorting.

**Approach:**
- Add `sort?: string` to `FindProductsDto` with `@IsOptional() @Matches(/^(price|name|createdAt|avgRating)(:(asc|desc))?(,(price|name|createdAt|avgRating)(:(asc|desc))?)*$/)`.
- Create `parseSortParam(sort: string): Prisma.ProductOrderByWithRelationInput[]` in `common/utils/sort.util.ts` — split on `,`, then split each part on `:`, default direction to `asc`.
- Pass the array to `prisma.product.findMany({ orderBy: parseSortParam(sort) })`.
- Same pattern for `OrderQueryService` (sortable by `createdAt`, `total`, `status`).

**Key files:**
- `apps/backend/src/modules/products/dto/find-products.dto.ts` — add `sort` field
- `apps/backend/src/common/utils/sort.util.ts` — new parser (handles multi-field)
- `apps/backend/src/modules/products/products.service.ts` — pass `orderBy`
- `apps/backend/src/modules/orders/queries/order-query.service.ts` — same pattern

---

## Field Selection at ORM Level (`?fields=`)

**What:** Accept `?fields=id,name,price` and pass a Prisma `select` object so only the requested columns are fetched from the database — not stripped from the response after fetching everything.

**Why:** A response interceptor that strips fields after the fact still fetches all columns from the DB. ORM-level field selection means the SQL `SELECT id, name, price FROM "Product"` — unused columns never leave the database, reducing I/O and network transfer from DB to app server.

**Trade-off vs response interceptor:** ORM selection requires knowing the field set at query-build time; an interceptor requires no change to service code. The ORM approach is faster; the interceptor approach is simpler. Implement ORM-level for high-traffic list endpoints, interceptor for one-off convenience.

**Approach:**
- Add `fields?: string` to `FindProductsDto`.
- In `ProductsService.findAllCursor()`, if `fields` is present, build a Prisma `select` object:

```typescript
const select = fields
  ? Object.fromEntries(fields.split(',').map(f => [f.trim(), true]))
  : undefined;
return this.prisma.product.findMany({ where, orderBy, take, cursor, select });
```

- Validate field names against an allowlist before building select to prevent schema exposure.
- Omit `include` when `select` is provided — Prisma does not allow both simultaneously.

**Key files:**
- `apps/backend/src/modules/products/dto/find-products.dto.ts` — add `fields` field
- `apps/backend/src/modules/products/products.service.ts` — build `select` object
- `apps/backend/src/common/utils/field-select.util.ts` — allowlist validation helper

---

## Advanced Filtering (`?minPrice=`, `?maxPrice=`, `?categoryId=`, `?inStock=`)

**What:** Expose the existing price range and category filter logic (already implemented in `products.service.ts`) as documented, validated DTO fields on the `GET /products` endpoint.

**Why:** `products.service.ts` already computes `minPrice` and `maxPrice` from variant aggregates, but it's unclear whether these are exposed as query params on the controller. This item ensures the filters are wire-up, validated, and documented.

**Current state:** `products.service.ts` has `minPrice` and `maxPrice` on the response shape. The filtering DTO may not yet expose `?minPrice=` / `?maxPrice=` as accepted query params.

**Approach:**
- Add to `FindProductsDto`:
  - `@IsOptional() @Type(() => Number) @IsNumber() minPrice?: number`
  - `@IsOptional() @Type(() => Number) @IsNumber() maxPrice?: number`
  - `@IsOptional() @IsUUID() categoryId?: string`
  - `@IsOptional() @IsBoolean() @Transform(() => Boolean) inStock?: boolean`
- In `ProductsService.findAllCursor()`, build the `where` clause from these params:

```typescript
where: {
  isActive: true,
  deletedAt: null,
  ...(categoryId && { categoryId }),
  ...(inStock && { variants: { some: { stock: { gt: 0 }, isActive: true } } }),
  ...(minPrice !== undefined && { variants: { some: { price: { gte: minPrice } } } }),
}
```

**Key files:**
- `apps/backend/src/modules/products/dto/find-products.dto.ts` — add filter fields
- `apps/backend/src/modules/products/products.service.ts` — wire filters into `where` clause

---

## ETag / Conditional Requests

**What:** Return an `ETag` header with every product response and honour `If-None-Match` on subsequent requests — responding with `304 Not Modified` (and no body) when the resource hasn't changed.

**Why:** ETags allow browsers and API clients to cache responses locally and only re-download when the content has actually changed. A `304` response sends headers only — no body. For a 10 KB product payload requested every 30 seconds by a mobile app, ETags can eliminate 95% of bandwidth.

**Approach:**
- Create `EtagInterceptor implements NestInterceptor`.
- In `intercept()`, compute `ETag` as `'"' + createHash('sha1').update(JSON.stringify(response)).digest('hex') + '"'`.
- Set `res.setHeader('ETag', etag)`.
- Check `req.headers['if-none-match']` — if it matches, call `res.status(304).end()` and complete the observable without sending a body.
- Register as a global interceptor. Only applies to GET requests (skip for mutations).

**Key files:**
- `apps/backend/src/common/interceptors/etag.interceptor.ts` — new interceptor
- `apps/backend/src/common/interceptors/index.ts` — export it
- `apps/backend/src/main.ts` — register as global interceptor
