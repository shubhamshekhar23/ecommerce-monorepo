# 29 — Shared Types (Monorepo)

This is specific to the monorepo structure. Currently, TypeScript types for entities like `Product`, `Order`, and `CartItem` are defined independently in the frontend and implied by the backend NestJS DTOs. When the backend changes a field name or type, the frontend silently drifts out of sync — the mismatch only surfaces at runtime.

---

## The Problem

```
apps/
  backend/         src/products/dto/product.dto.ts   → defines Product shape
  frontend/        src/features/products/interfaces/index.ts → defines Product shape again
```

Two sources of truth. If the backend renames `product.imageUrl` to `product.images[]`, the frontend TypeScript still compiles cleanly — it has no knowledge of the backend change.

---

## Items to Implement

- [x] **Create `packages/shared-types/`** — a new package in the monorepo that both apps import:
  ```
  packages/
    shared-types/
      src/
        product.types.ts
        order.types.ts
        cart.types.ts
        user.types.ts
        auth.types.ts
      package.json
      tsconfig.json
      index.ts
  ```
  - `package.json` name: `@ecommerce/shared-types`
  - No runtime dependencies (types only, erased at compile time)
  - Complexity: Medium (monorepo workspace setup)

- [x] **Define canonical types in `shared-types`** — the types here are the single source of truth. They should match what the API actually returns (not what either app assumes):
  ```ts
  // packages/shared-types/src/product.types.ts
  export interface Product {
    id: string;
    name: string;
    slug: string;
    price: number;
    stock: number;
    images: ProductImage[];
    categoryId: string;
    description: string;
    createdAt: string;
  }

  export interface ProductImage {
    id: string;
    url: string;
    altText: string;
    isMain: boolean;
  }
  ```
  - Complexity: Easy (moving existing types)

- [x] **Frontend imports from shared-types** — replace feature-level interface definitions with imports from the shared package:
  ```ts
  // Before
  // src/features/products/interfaces/index.ts (defines Product locally)

  // After
  import type { Product } from '@ecommerce/shared-types';
  ```
  - Complexity: Easy (once the package exists)
  - Files: `src/features/*/interfaces/index.ts`

- [ ] **Backend NestJS DTOs derive from shared-types** — this is the backend-side change. Backend response classes should implement or extend the shared type. A type mismatch in a backend DTO now causes a TypeScript error in the shared package, which surfaces in CI.
  - Complexity: Medium (backend change)
  - File: backend DTO files

- [x] **Add `shared-types` to the CI matrix** — the monorepo CI workflow filters by service path. Add `packages/shared-types/**` as a trigger for both the frontend and backend CI jobs — a change to shared types runs both test suites.
  - Complexity: Easy
  - File: `.github/workflows/*.yml`

- [ ] **Zod schemas co-located with shared types** — Zod schemas validate the shape at runtime. If the Zod schema and the TypeScript type live in `shared-types`, both apps can use the same runtime validator:
  ```ts
  // packages/shared-types/src/product.types.ts
  export const ProductSchema = z.object({ ... });
  export type Product = z.infer<typeof ProductSchema>;
  ```
  Frontend uses `ProductSchema.parse()` in API functions (see `22-api-network-strategy.md`). One schema, used everywhere.
  - Complexity: Medium
  - Depends on: `22-api-network-strategy.md` (Zod API response validation)
