# Phase 7.3 — GraphQL

**Status:** ✅ Done
**Builds on:** [Phase 7.2 — Realtime APIs](./phase-7.2-realtime.md)
**Concept cluster:** A GraphQL layer on top of the existing REST API — starting with basic queries, then solving the N+1 problem with DataLoader, then protecting the server from expensive queries with complexity limits and persisted queries.

---

## GraphQL Endpoint (Code-First)

**What:** Expose a GraphQL API alongside REST using NestJS code-first approach. TypeScript classes with `@ObjectType()` / `@Field()` decorators generate the SDL schema automatically — no separate `.graphql` schema files.

**REST vs GraphQL — when to use which:**

GraphQL is not a REST replacement. Choose based on the access pattern:

| | REST | GraphQL |
|---|---|---|
| Data shape | Fixed per endpoint | Client-defined per query |
| Overfetch | Common | Eliminated |
| Caching | HTTP cache headers, CDN | Per-query (harder to CDN-cache) |
| Tooling | Universal | Requires schema-aware client |
| Best for | Simple CRUD, public APIs | Complex UIs, mobile clients, dashboards |

In this app: REST stays as the primary API. GraphQL is additive — a single `/graphql` endpoint for the frontend to make composite queries.

**Approach:**
- Install `@nestjs/graphql`, `@apollo/server`, `graphql`.
- `GraphQLModule.forRoot<ApolloDriverConfig>({ driver: ApolloDriver, autoSchemaFile: true, playground: process.env.NODE_ENV !== 'production' })`.
- Initial query set:
  - `Query.products(sort, filter, cursor)` → `[ProductType]`
  - `Query.product(id)` → `ProductType`
  - `Query.orders` (auth-gated) → `[OrderType]`
- `@ObjectType()` classes mirror existing response DTOs — no business logic duplication.
- Auth: create a `GqlJwtGuard` that reads `context.req.headers.authorization` instead of `req`.

**Key files:**
- `apps/backend/src/modules/products/products.resolver.ts`
- `apps/backend/src/modules/products/types/product.type.ts`
- `apps/backend/src/modules/orders/orders.resolver.ts`
- `apps/backend/src/app.module.ts` — import `GraphQLModule`
- `apps/backend/package.json` — add `@nestjs/graphql`, `@apollo/server`, `graphql`

---

## GraphQL DataLoader (N+1 Prevention)

**What:** Use DataLoader to batch and deduplicate database queries that would otherwise fire one query per resolved field — the classic GraphQL N+1 problem.

**Why:** A query like `products { id reviews { id } }` without DataLoader fires one DB query per product to fetch its reviews — 50 products = 51 queries. DataLoader batches all `reviewsByProductId` calls that happen within the same event loop tick into a single `WHERE productId IN (...)` query.

**The N+1 problem illustrated:**
```graphql
query {
  products {        # 1 query
    reviews {       # N queries — one per product
      rating
    }
  }
}
```

With DataLoader: 2 queries total regardless of N.

**Approach:**
- Create `ReviewsLoader` using `@nestjs/dataloader` or plain `DataLoader` from `dataloader` package.
- `ReviewsLoader.batchFn`: receives `productIds[]`, returns `Promise<Review[][]>` — fetches all reviews for all IDs in one `WHERE productId IN (...)` query, then groups by productId.
- In `ProductsResolver`: inject `ReviewsLoader` and call `this.reviewsLoader.load(product.id)` instead of `this.reviewsService.findByProductId(product.id)`.
- `ReviewsLoader` must be `REQUEST`-scoped so batching works within a single GraphQL operation, not across unrelated concurrent requests.

**Key files:**
- `apps/backend/src/modules/reviews/reviews.loader.ts` — new DataLoader
- `apps/backend/src/modules/products/products.resolver.ts` — use loader instead of direct service call
- `apps/backend/src/app.module.ts` — register loader as REQUEST-scoped provider

---

## GraphQL Query Complexity & Depth Limiting

**What:** Reject GraphQL queries that exceed a computed complexity score or nesting depth before they reach resolvers — preventing malicious queries from triggering O(n^k) DB load.

**Why:** Without limits, a client can construct `{ products { reviews { author { orders { items { product { reviews { ... } } } } } } } }` — an exponentially deep query that joins every table. Depth limiting rejects anything beyond a configured nesting level; complexity scoring assigns weights to fields and rejects queries above a total score.

**Approach:**
- Install `graphql-query-complexity` and `graphql-depth-limit`.
- In `GraphQLModule.forRoot`, add `validationRules`:

```typescript
validationRules: [
  depthLimit(5),
  createComplexityRule({
    estimators: [
      fieldExtensionsEstimator(),
      simpleEstimator({ defaultComplexity: 1 }),
    ],
    maximumComplexity: 100,
    onComplete: (complexity) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Query complexity: ${complexity}`);
      }
    },
  }),
]
```

- Mark expensive fields with `@Extensions({ complexity: 10 })` on the resolver method.

**Key files:**
- `apps/backend/src/app.module.ts` — add `validationRules` to `GraphQLModule.forRoot`
- `apps/backend/package.json` — add `graphql-query-complexity`, `graphql-depth-limit`

---

## Persisted Queries

**What:** Assign a hash ID to each query at build time. Clients send only the hash instead of the full query string, reducing request size and allowing the server to whitelist approved queries in production.

**Why:** In production, you rarely want arbitrary queries from unknown clients — only the queries your frontend uses. Persisted queries let you register approved queries at deploy time and reject anything else. They also reduce bandwidth: a 2 KB query string becomes a 64-byte hash.

**Approach:**
- Use Apollo's Automatic Persisted Queries (APQ) protocol: client sends `{ extensions: { persistedQuery: { version: 1, sha256Hash } } }` with no `query` field.
- If the server has seen the hash, it uses the cached query. If not, client retries with the full query and the server caches it.
- In NestJS: `@apollo/server` supports APQ via `cache` config. Use Redis as the APQ cache store (`new RedisCacheAdapter(redisClient)`).
- For full whitelist enforcement in production, pre-register query hashes at build time and reject unknown hashes.

**Key files:**
- `apps/backend/src/app.module.ts` — configure APQ cache in `GraphQLModule.forRoot`
- `apps/backend/src/modules/cache/cache.service.ts` — expose Redis client for APQ adapter
