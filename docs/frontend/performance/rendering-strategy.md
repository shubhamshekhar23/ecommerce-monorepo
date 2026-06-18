# 05 — Rendering Strategy

Move from the current all-client-rendered approach to the appropriate rendering mode per page. This is the most impactful single set of changes for performance and SEO.
Source: `csr-ssr-ssg-pre-rendering.md`, `ssr-aws-react.md`

---

## Core Concepts from Notes

- **CSR (Client-Side Rendering):** Server sends an empty shell, JS fetches data and renders. Bad for SEO, slow first paint. Use for dashboards and authenticated-only views.
- **SSG (Static Site Generation):** Pages are built at deploy time as static HTML. Fastest possible load, best for SEO. Use when data doesn't change per-user and changes infrequently.
- **ISR (Incremental Static Regeneration):** Like SSG but re-generates in the background after a set interval. Use when data changes but not per-user.
- **SSR (Server-Side Rendering):** Page is rendered on the server per-request. Use when data is user-specific and must be fresh.
- **Server Components (Next.js App Router):** Components that render on the server and send only HTML — zero JS to the client. Use for UI that doesn't need interactivity.
- **Streaming SSR:** Send the page shell immediately, stream in data-dependent sections as they resolve. Improves Time to First Byte (TTFB).

---

## Rendering Decision Per Route

- `/` (homepage) → SSG with ISR (content changes occasionally)
- `/products` → SSG with ISR (product list changes, but not per-user)
- `/products/[slug]` → SSG via `generateStaticParams` (one static page per product)
- `/cart` → CSR (user-specific, always fresh)
- `/checkout` → CSR (user-specific, Stripe session)
- `/orders` → SSR or CSR (user-specific)
- `/orders/[id]` → SSR (user-specific, must be fresh)
- `/admin/*` → CSR (authenticated admin-only)

---

## Items to Implement

- [x] **`generateStaticParams` for product detail pages** — `app/products/[slug]/page.tsx` currently renders on-demand (SSR or CSR). Pre-generate all product slug pages at build time:
  ```ts
  export async function generateStaticParams() {
    const products = await fetchAllProductSlugs(); // call your API
    return products.map((p) => ({ slug: p.slug }));
  }
  ```
  Each product page becomes a static HTML file served from CDN. Zero server cost per page view.
  - Complexity: Medium
  - File: `src/app/products/[slug]/page.tsx`

- [x] **ISR (`revalidate`) for product listing** — add `export const revalidate = 60` to `app/products/page.tsx`. Next.js will serve the cached static page and regenerate it in the background when it's older than 60 seconds. Product listings don't need to be real-time.
  - Complexity: Easy
  - File: `src/app/products/page.tsx`

- [x] **`generateMetadata` as async Server Component function** — this is separate from SEO (10-seo.md) but requires the page to be a Server Component. Ensuring product detail pages are Server Components first unlocks both ISR and server-side metadata generation.
  - Complexity: Easy
  - File: `src/app/products/[slug]/page.tsx`

- [x] **Convert static layout components to Server Components** — `Header`, `Footer`, `Navbar` are marked `'use client'` or their children are. Anything that doesn't use `useState`, `useEffect`, browser APIs, or event handlers can be a Server Component. Server Components ship zero JS to the client.
  - Audit: check `Header.tsx`, `Footer.tsx`, `Navbar.tsx` for `'use client'` directives
  - Remove `'use client'` where not needed, extract interactive sub-parts into separate client components
  - Complexity: Medium (requires splitting components)
  - Files: `src/components/Header/`, `src/components/Footer/`, `src/components/Navbar/`

- [x] **Suspense boundaries for streaming SSR** — wrap data-dependent sections in `<Suspense>` so the page shell streams immediately while data loads:
  ```tsx
  <Suspense fallback={<ProductSkeleton />}>
    <ProductsView />
  </Suspense>
  ```
  This improves TTFB because the browser starts receiving and rendering HTML before all data is ready.
  - Complexity: Medium
  - Files: `app/products/page.tsx`, `app/orders/page.tsx`, `app/page.tsx`

- [x] **`loading.tsx` per route segment** — Next.js automatically wraps `page.tsx` in a Suspense boundary when a `loading.tsx` file exists in the same segment. Add one per route:
  - `app/products/loading.tsx` → renders `<ProductSkeleton />`
  - `app/orders/loading.tsx` → renders a skeleton matching the orders list
  - `app/cart/loading.tsx` → renders a cart skeleton
  - `app/checkout/loading.tsx` → renders a checkout skeleton
  - Complexity: Easy (once skeletons from 08-user-experience.md exist)
