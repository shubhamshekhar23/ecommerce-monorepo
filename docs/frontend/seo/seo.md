# 10 — SEO

SEO is critical for an ecommerce app — product pages need to rank in search results and look good when shared on social media. Next.js App Router has a first-class metadata API that makes most of this straightforward.
Source: `seo.md`, `index/seo.md`

---

## Core Concepts from Notes

- **Title tags and meta descriptions** — the most basic SEO signals. Each page needs a unique, keyword-rich title and description.
- **Structured data (JSON-LD)** — machine-readable markup that tells Google exactly what a page contains (a product, a price, availability). Enables rich results in search (price, rating, in-stock badge).
- **Sitemap** — an XML file listing all your URLs, so search engines can discover them without crawling every link.
- **Robots.txt** — tells crawlers which routes to index and which to skip.
- **OpenGraph tags** — control how the page looks when shared on Twitter, Slack, WhatsApp, etc.

---

## Items to Implement

### Per-Page Metadata

- [x] **`generateMetadata` for product detail pages** — `app/products/[slug]/page.tsx` currently uses the default root layout title. Add:
  ```ts
  export async function generateMetadata({ params }: { params: { slug: string } }) {
    const product = await fetchProduct(params.slug);
    return {
      title: `Buy ${product.name}`,
      description: product.description.slice(0, 155),
      openGraph: {
        title: product.name,
        description: product.description.slice(0, 155),
        images: [{ url: product.images[0]?.url }],
        type: 'website',
      },
    };
  }
  ```
  - Complexity: Easy
  - File: `src/app/products/[slug]/page.tsx`

- [x] **`generateMetadata` for products listing page** — add a static metadata export describing the catalog (e.g. "Shop all products — ShopHub").
  - Complexity: Easy
  - File: `src/app/products/page.tsx`

- [x] **`generateMetadata` for orders and cart pages** — mark these with `noindex` since they are user-specific and should never appear in search results:
  ```ts
  export const metadata = { robots: { index: false } };
  ```
  - Complexity: Easy
  - Files: `src/app/orders/page.tsx`, `src/app/cart/page.tsx`, `src/app/checkout/page.tsx`, all `src/app/admin/` pages

- [x] **OpenGraph image (`opengraph-image.tsx`)** — Next.js supports a `opengraph-image.tsx` file per route segment that dynamically generates an OG image using the Vercel OG library (`@vercel/og`). Add one for product pages (product image + name + price overlay). Controls the preview image when the URL is shared on social media.
  - Complexity: Medium
  - File: `src/app/products/[slug]/opengraph-image.tsx`

---

### Structured Data (JSON-LD)

- [x] **Product schema on product detail pages** — add a `<script type="application/ld+json">` tag to each product page with the Google Product schema:
  ```json
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Product Name",
    "image": "https://...",
    "description": "...",
    "offers": {
      "@type": "Offer",
      "price": "29.99",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    }
  }
  ```
  This enables rich results (price, availability) directly in Google Search.
  - Complexity: Easy–Medium
  - File: `src/app/products/[slug]/page.tsx`

- [x] **WebSite schema in root layout** — add a WebSite schema with a `SearchAction` so Google can display a search box directly in search results pointing to `/products?search={query}`.
  - Complexity: Easy
  - File: `src/app/layout.tsx`

---

### Discovery

- [x] **`sitemap.ts`** — Next.js App Router supports `app/sitemap.ts` that returns a list of URLs. Dynamically fetch all product slugs and category slugs at build/request time and return them. Exclude user-specific routes (`/cart`, `/orders`, `/admin`).
  - Complexity: Easy–Medium
  - File: `src/app/sitemap.ts`

- [x] **`robots.ts`** — add `app/robots.ts` to control crawler access:
  - Allow: `/`, `/products/*`
  - Disallow: `/admin/*`, `/cart`, `/checkout`, `/orders`
  - Point to sitemap URL
  - Complexity: Easy
  - File: `src/app/robots.ts`

- [x] **Canonical URLs per page** — add `alternates: { canonical: 'https://yourdomain.com/products/slug' }` to each page's metadata to prevent duplicate content issues from query strings (e.g. `/products?page=1` vs `/products`).
  - Complexity: Easy
  - Implement alongside `generateMetadata` items above

---

### URL Structure Audit

- [ ] **Verify search URLs are crawlable** — currently `/products?search=shoes` and `/products?category=1`. Category filter should ideally use the category slug, not an ID: `/products?category=electronics`. Check what the backend accepts and align the frontend URL params.
  - Complexity: Easy (URL change + backend check)
