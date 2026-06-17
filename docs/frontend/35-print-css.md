# 35 — Print CSS

Order receipts and invoices are often printed or saved as PDF. Without print styles, the printed page includes the navigation, hero backgrounds, irrelevant buttons, and breaks layouts awkwardly.

---

## Items to Implement

- [ ] **Global print reset in `globals.scss`** — add a `@media print` block that hides non-content elements:
  ```scss
  @media print {
    header,
    nav,
    footer,
    .Navbar,
    button:not(.print-include),
    .no-print {
      display: none !important;
    }

    body {
      background: white;
      color: black;
      font-size: 12pt;
    }

    a {
      color: black;
      text-decoration: underline;
    }

    // Print URLs after links
    a[href]::after {
      content: ' (' attr(href) ')';
      font-size: 10pt;
      color: #666;
    }
  }
  ```
  - Complexity: Easy
  - File: `src/styles/globals.scss` or `src/styles/_print.scss`

- [ ] **Order detail print styles** — the `/orders/[id]` page is the main printable page. Add print-specific styles that format it as a clean receipt:
  - Show: order ID, date, items, quantities, prices, subtotal, tax, total, shipping address
  - Hide: cancel button, back button, status change controls
  - Page break control: `page-break-inside: avoid` on order item rows
  - Complexity: Easy
  - File: `src/features/orders/components/OrderDetailView/OrderDetailView.module.scss`

- [ ] **"Print receipt" button on order detail** — add an explicit print button that calls `window.print()`. This is more discoverable than expecting users to know `Ctrl+P`. Style it as a secondary action, hide it in print mode itself (`.no-print`):
  ```tsx
  <button className="no-print" onClick={() => window.print()}>
    Print Receipt
  </button>
  ```
  - Complexity: Easy
  - File: `src/features/orders/components/OrderDetailView/OrderDetailView.tsx`

- [ ] **`@page` CSS rule** — control page margins and size for printed output:
  ```scss
  @media print {
    @page {
      margin: 1.5cm;
      size: A4;
    }
  }
  ```
  - Complexity: Easy

- [ ] **Admin invoice print styles** — if admin order view (`AdminOrdersView`) needs to support printing order summaries or packing slips, apply the same pattern.
  - Complexity: Easy
