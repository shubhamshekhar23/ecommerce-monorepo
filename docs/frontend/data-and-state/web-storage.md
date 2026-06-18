# 11 — Web Storage

The right storage mechanism for the right data. Four browser storage options, each with different scope, persistence, and size limits.
Source: `web-storage.md`

---

## Storage Options Compared

- **`sessionStorage`** — persists for the tab's lifetime only. Cleared when tab is closed. Each tab has its own independent sessionStorage. Best for: temporary navigation state (scroll position, last-viewed list).
- **`localStorage`** — persists until explicitly cleared. Shared across all tabs of the same origin. Best for: user preferences that should survive sessions.
- **`IndexedDB`** — transactional, key-value object store. Handles large structured data. Asynchronous API. Best for: offline data queues, large data that can't fit in localStorage.
- **Cookies** — sent with every request to the server. Best for: auth tokens, A/B flags. Not managed by the frontend directly.

---

## Items to Implement

### sessionStorage

- [x] **`sessionStorage` for scroll position** — this is documented in `08-user-experience.md` (`useScrollRestoration`). The web storage connection: `sessionStorage` is the right store (not `localStorage`) because scroll position is tab-specific and should reset when the user closes the tab or opens a new one.
  - Complexity: Easy
  - Depends on: `useScrollRestoration` hook from 08-user-experience.md

- [x] **`sessionStorage` for product list page cache** — cache the last-loaded products list so back-navigation from a product detail page is instant. Store: `sessionStorage.setItem('products-cache', JSON.stringify(products))`. Retrieve on mount before TanStack Query re-fetches.
  - Complexity: Medium
  - Note: set a TTL (timestamp) alongside the cache to invalidate it after a few minutes.
  - File: `src/features/products/hooks/useProducts.ts` or `ProductsView.tsx`

---

### localStorage

- [x] **`localStorage` for user preferences** — persist preferences that should survive across sessions:
  - Sort order preference (e.g. "Price: Low to High") — key: `products-sort-order`
  - Sidebar collapsed state (category sidebar open/closed) — key: `category-sidebar-collapsed`
  - Items-per-page preference (for any paginated view) — key: `admin-page-size`
  
  Build as a typed wrapper using the `useLocalStorage` hook from `src/hooks/`.
  - Complexity: Easy (once `useLocalStorage` hook is built)
  - Files: `CategorySidebar.tsx`, products view sort control, admin views

---

### IndexedDB

- [x] **IndexedDB offline cart queue** — the most advanced item in this file. Goal: if the user adds an item to cart while offline, queue the mutation in IndexedDB and sync it when connectivity returns (pairs with Service Worker background sync from `12-pwa-realtime.md`).
  - Use the `idb` npm package as a thin wrapper over the raw IndexedDB API (the raw API is verbose).
  - Store: `{ id, action: 'ADD' | 'REMOVE' | 'UPDATE', payload, timestamp }`
  - On reconnect (or when Service Worker background sync fires): drain the queue and replay mutations.
  - Complexity: Complex
  - Depends on: Service Worker from 12-pwa-realtime.md
  - Defer until PWA implementation
