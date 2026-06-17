# 34 — Breadcrumbs

Breadcrumbs improve navigation (users know where they are in the hierarchy), SEO (Google renders breadcrumbs in search results with structured data), and accessibility (landmarks for screen reader users).

---

## Target Breadcrumb Paths

- Homepage: (no breadcrumb)
- Products listing: `Home > Products`
- Product detail: `Home > Products > Electronics > iPhone 15`
- Order detail: `Home > My Orders > Order #1234`
- Admin product edit: `Admin > Products > Edit: iPhone 15`

---

## Items to Implement

- [ ] **`Breadcrumb` component** — renders an `<nav aria-label="Breadcrumb">` with an `<ol>` of links. Accessible by default (ordered list with nav landmark):
  ```tsx
  // src/components/Breadcrumb/Breadcrumb.tsx
  interface BreadcrumbItem {
    label: string;
    href?: string; // undefined for the current (last) item
  }

  function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
    return (
      <nav aria-label="Breadcrumb">
        <ol>
          {items.map((item, i) => (
            <li key={i}>
              {item.href ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <span aria-current="page">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    );
  }
  ```
  - Complexity: Easy
  - File: `src/components/Breadcrumb/Breadcrumb.tsx`

- [ ] **Breadcrumb on product detail page** — derive breadcrumb from the product's category:
  ```tsx
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    { label: product.category.name, href: `/products?category=${product.category.slug}` },
    { label: product.name }, // no href — current page
  ];
  ```
  - Complexity: Easy
  - File: `src/features/products/components/ProductDetailView/ProductDetailView.tsx`

- [ ] **Breadcrumb on order detail page**:
  ```tsx
  [
    { label: 'Home', href: '/' },
    { label: 'My Orders', href: '/orders' },
    { label: `Order #${order.id.slice(0, 8)}` },
  ]
  ```
  - Complexity: Easy
  - File: `src/features/orders/components/OrderDetailView/OrderDetailView.tsx`

- [ ] **Breadcrumb on admin pages** — admin edit pages show where the editor is in the admin hierarchy:
  ```tsx
  // /admin/products/[id]/edit
  [
    { label: 'Admin', href: '/admin' },
    { label: 'Products', href: '/admin/products' },
    { label: `Edit: ${product.name}` },
  ]
  ```
  - Complexity: Easy
  - Files: admin edit pages

- [ ] **JSON-LD `BreadcrumbList` structured data** — add alongside the breadcrumb component so Google shows the breadcrumb trail directly in search results:
  ```json
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://shop.com/" },
      { "@type": "ListItem", "position": 2, "name": "Products", "item": "https://shop.com/products" },
      { "@type": "ListItem", "position": 3, "name": "iPhone 15" }
    ]
  }
  ```
  Add to `generateMetadata` or as a `<script type="application/ld+json">` in the page component.
  - Complexity: Easy
  - Connection: `10-seo.md` (structured data)
