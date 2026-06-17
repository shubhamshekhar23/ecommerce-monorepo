# 03 — Performance: Images & Media

Optimize how images are requested, loaded, and displayed. Next.js `<Image>` handles the heavy lifting (WebP conversion, responsive srcset) but several options need to be explicitly configured.
Source: `lazy-load-picture-tag.md`, `asset-optimization.md`

---

## Core Concepts from Notes

- **Progressive enhancement:** AVIF > WebP > JPEG/PNG — serve the most compressed format the browser supports
- **Above the Fold (ATF):** images visible on first paint — load eagerly at high priority
- **Below the Fold (BTF):** images outside the initial viewport — lazy load
- **Device Pixel Ratio (DPR):** Retina screens need 2x/3x images — the `sizes` attribute handles this
- **Blur placeholder:** show a low-res blurred version while the full image loads

---

## Items to Implement

- [ ] **AVIF format support in `next.config.js`** — Next.js Image converts to WebP by default. AVIF is 20–30% smaller than WebP and should be the first format tried. Add:
  ```js
  images: { formats: ['image/avif', 'image/webp'] }
  ```
  This is zero-code-change for components — Next.js handles format negotiation via Accept headers.
  - Complexity: Easy (one config line)
  - File: `apps/frontend/next.config.js`

- [ ] **`priority` prop on LCP images** — the Largest Contentful Paint image should not be lazy-loaded. Candidates:
  - First ProductCard image in the grid on `/products` (the one above the fold)
  - Hero image on the homepage `/`
  - Main product image on `/products/[slug]`
  
  Add `priority` prop to these `<Image>` components. Next.js will add `fetchpriority="high"` and preload link automatically.
  - Complexity: Easy
  - Files: `ProductCard.tsx`, `ProductDetailView.tsx`, homepage

- [ ] **Blur placeholder while images load** — currently shows an empty grey `<div>` while images fetch. Replace with a blur-up effect:
  - For static images: use `placeholder="blur"` with a `blurDataURL` (a tiny base64 JPEG of the same image)
  - For dynamic product images: generate a dominant-color placeholder using a `blurDataURL` that is a 1x1 pixel in the product's primary color, or use a low-res version of the image
  - Complexity: Medium (need to generate or fetch blurDataURL per product)
  - Files: `ProductCard.tsx`, `ProductDetailView.tsx`, `ProductImageGallery.tsx`

- [ ] **Intersection Observer for lazy load on visibility** — for components that contain images and are far below the fold (e.g., the second half of the product grid, the related products section), delay rendering the component itself until it enters the viewport. Use the `useIntersectionObserver` hook (from `src/hooks/`) combined with `React.lazy`.
  - This is "lazy load on visibility" from the notes — the component's JS bundle is only fetched when it scrolls into view.
  - Complexity: Medium
  - Depends on: `useIntersectionObserver` hook from 01-project-structure

- [ ] **Art direction with `<picture>` tag** — `srcset` and `sizes` only resize the same image for different viewports. Art direction serves a *different image composition* depending on the viewport — a wide landscape product lifestyle shot on desktop, a tight square crop focused on the product on mobile. Next.js `<Image>` does not support art direction; it requires the native `<picture>` element:
  ```tsx
  <picture>
    <source
      media="(min-width: 1024px)"
      srcSet="/product-hero-wide.webp"
      type="image/webp"
    />
    <source
      media="(min-width: 1024px)"
      srcSet="/product-hero-wide.jpg"
    />
    <source
      media="(max-width: 1023px)"
      srcSet="/product-hero-square.webp"
      type="image/webp"
    />
    <img
      src="/product-hero-square.jpg"
      alt="Product hero"
      loading="eager"
    />
  </picture>
  ```
  Apply to: homepage hero banner, featured product banners, any marketing image where the composition needs to change (not just scale) across breakpoints.
  - Complexity: Easy (once you have the different crops)
  - Files: homepage hero, any banner/editorial images
  - Note: Next.js `<Image>` is still preferred for all product photos (automated format conversion, caching). Reserve `<picture>` for editorial/marketing images where art direction is specifically needed.

- [ ] **CDN image transformations** — instead of storing multiple pre-cropped versions of every product image, use a CDN image transformation service. The client sends the desired dimensions and the CDN returns the correctly sized image:
  - **Cloudinary / Imgix / Bunny.net** — URL-based transformation: `https://res.cloudinary.com/demo/image/upload/w_400,h_400,c_fill/product.jpg`
  - **Next.js built-in image optimization** — already acts as a lightweight transformation layer (resize + format convert + cache). For most cases this is sufficient.
  - **Custom image optimization endpoint** — the notes describe "sending imgUrl and viewport size from client, service returns properly sized image." This is the pattern Cloudinary/Imgix implement. Only build a custom one if an external service is not acceptable.
  
  When to use a CDN service over Next.js built-in:
  - When you need transformations Next.js doesn't support (crop modes, face detection, background removal)
  - When images are stored in an external bucket and Next.js image optimization adds too much latency
  - Complexity: Medium (CDN integration + update image URLs)
  - File: `src/shared/config/config.ts` (add image CDN base URL), update all image URL construction

- [ ] **Adaptive images based on network speed** — serve a lower-quality image to users on slow connections. Use the Network Information API:
  ```ts
  const connection = (navigator as any).connection;
  const isSlowNetwork = connection?.effectiveType === '2g' || connection?.saveData;
  const imageQuality = isSlowNetwork ? 40 : 85;
  ```
  With Next.js Image, pass `quality={imageQuality}` dynamically. With a CDN like Cloudinary, adjust the quality parameter in the URL.
  - Complexity: Medium
  - Note: The Network Information API is not universally supported — treat it as progressive enhancement. Fall back to the default quality if the API is unavailable.

- [ ] **Responsive `sizes` attribute audit** — `ProductCard` already has `sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"`. Audit all other `<Image>` usages in the app and ensure they have correct `sizes` — wrong values cause the browser to download images larger than needed.
  - Complexity: Easy (audit + fix)
  - Files: `ProductImageGallery.tsx`, admin product views, homepage
