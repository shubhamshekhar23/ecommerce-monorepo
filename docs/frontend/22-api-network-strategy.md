# 22 — API & Network Strategy

Consolidates: API layer abstraction, retry/backoff, request deduplication, response validation, rate limiting, and API versioning.

---

## Current State

Each feature has an `api/` folder with fetch functions. The shared `apiClient.ts` wraps the HTTP client. The pattern is correct; these items formalize and harden it.

---

## Items to Implement

### API Abstraction

- [ ] **Typed request/response contract per endpoint** — every API function should have explicit TypeScript types for its input and output. No `any` in API functions. The return type should be the validated shape (see Zod validation below), not just the raw API response.
  ```ts
  // features/products/api/products.api.ts
  export async function getProducts(params: GetProductsParams): Promise<ProductsResponse> { ... }
  ```
  - Complexity: Easy (mostly enforcing existing pattern)

- [ ] **Centralized API error normalization** — documented in `20-error-handling-strategy.md`. The `apiClient.ts` interceptor converts HTTP error responses into typed `AppError` instances before they reach any hook. This is the single place that understands HTTP status codes.
  - Complexity: Medium
  - File: `src/shared/apiClient.ts`

- [ ] **Zod validation of API responses at runtime** — TypeScript types are erased at runtime. An unexpected backend response shape (missing field, wrong type) will silently cause bugs. Add Zod parsing at the API layer:
  ```ts
  const ProductSchema = z.object({ id: z.string(), name: z.string(), price: z.number(), ... });
  
  export async function getProduct(slug: string) {
    const raw = await apiClient.get(`/products/${slug}`);
    return ProductSchema.parse(raw.data); // throws ZodError if shape is wrong
  }
  ```
  The Zod schema doubles as the runtime type and the TypeScript type (`z.infer<typeof ProductSchema>`).
  - Complexity: Medium
  - Files: `features/*/api/*.ts`

### Retry & Resilience

- [ ] **Automatic retry with exponential backoff** — transient network errors (timeouts, 503s) should be retried automatically. Do not retry user errors (400, 401, 422):
  ```ts
  // TanStack Query config in queryClient.ts
  retry: (failureCount, error) => {
    if (error instanceof AppError && error.category !== 'network' && error.category !== 'server') {
      return false; // don't retry business/auth/validation errors
    }
    return failureCount < 3;
  },
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // exponential backoff, max 30s
  ```
  - Complexity: Easy
  - File: `src/shared/queryClient.ts`

- [ ] **Request timeout** — every API request should have a timeout. If the backend doesn't respond within N seconds, fail with a network error:
  ```ts
  // axios
  timeout: 10000 // 10 seconds
  ```
  Without this, a hanging request keeps the UI in loading state indefinitely.
  - Complexity: Easy
  - File: `src/shared/apiClient.ts`

- [ ] **Request cancellation with `AbortController`** — when a component unmounts mid-request (user navigates away), cancel the in-flight request to avoid state updates on unmounted components and wasted bandwidth. TanStack Query handles this automatically for queries; ensure custom fetch calls also use an `AbortController`.
  - Complexity: Easy–Medium
  - Files: any custom `fetch` calls outside TanStack Query

### Request Deduplication

- [ ] **Document TanStack Query deduplication** — TanStack Query already deduplicates identical in-flight requests: if `ProductCard` and `ProductDetailView` both call `useProducts()` at the same time, only one `GET /products` request fires. Document this explicitly so developers don't add their own deduplication logic unnecessarily.
  - Key setting: `staleTime` controls how long before a cached result is considered stale. Set appropriate per-query values in each hook rather than relying on the default (0).
  - Example: `useCategories` → `staleTime: 10 * 60 * 1000` (categories rarely change)
  - Complexity: Easy (documentation + staleTime audit)
  - File: all `useQuery` hooks in `features/*/hooks/`

### Rate Limiting & Spam Prevention

- [ ] **Disable buttons after submission** — for any action that costs money, sends an email, or creates a record: disable the trigger button for a cooldown period after submission. Covered for checkout in `19-payment-ux.md`. Apply the same pattern to:
  - Login form (prevent brute-force from frontend)
  - Register form
  - Review/feedback submission
  - Contact forms
  - Complexity: Easy
  - Pattern: `isSubmitting` state on the mutation hook + button `disabled={isPending || isSubmitting}`

- [ ] **Throttle on expensive UI interactions** — search, filter, and sort requests should use `useDebounce` (from `08-user-experience.md`) so rapid UI changes don't fire a request per keystroke.
  - Complexity: Easy (mostly already tracked in 08)

- [ ] **Duplicate submit prevention** — TanStack Query's `isPending` flag should block all re-submissions. Audit every form to ensure the submit button is disabled when `isPending === true`.
  - Complexity: Easy (audit)

### API Versioning

- [ ] **URL-based versioning** — all API calls go through `apiClient.ts` which has the base URL. When the backend introduces a breaking `/v2` endpoint, update the base URL or prefix per-endpoint:
  ```ts
  // src/shared/config.ts
  export const API_V1 = `${API_BASE}/v1`;
  export const API_V2 = `${API_BASE}/v2`;
  ```
  Individual API functions reference the version constant — components never know the version.
  - Complexity: Easy (document the pattern, implement when needed)
  - File: `src/shared/config.ts`
