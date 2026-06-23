# 12 — PWA & Real-time

Advanced features. PWA makes the app installable and partially offline-capable. Real-time replaces polling with push updates.
Source: `others.md`

---

## Items to Implement

### Real-time Updates

- [x] **Server-Sent Events (SSE) for order status** — when a user is on the order detail page (`/orders/[id]`), subscribe to an SSE stream from the backend to receive live status changes (PENDING → PROCESSING → SHIPPED → DELIVERED).
  
  Why SSE over WebSockets here: order status updates are one-directional (server pushes, client reads). SSE is simpler — it's a plain HTTP connection with chunked streaming. WebSockets are bidirectional and add complexity not needed here.
  
  Implementation:
  ```ts
  const evtSource = new EventSource(`/api/orders/${orderId}/status`);
  evtSource.onmessage = (event) => {
    queryClient.setQueryData(['order', orderId], JSON.parse(event.data));
  };
  ```
  Close the connection when the component unmounts.
  - Complexity: Medium (requires backend SSE endpoint too)
  - File: `src/features/orders/hooks/useOrderStatusStream.ts`

- [x] **WebSocket for live cart/inventory** — if two users are viewing the same product, the stock count could go to zero. Use a WebSocket connection to receive real-time inventory updates and reflect them in the UI (disable "Add to Cart" when stock hits 0 without requiring a page refresh).
  - Complexity: Complex
  - Defer: implement after SSE works

---

### PWA

- [x] **`manifest.ts` for installability** — Next.js supports `app/manifest.ts` to generate a Web App Manifest. Required for "Add to Home Screen" on mobile:
  ```ts
  export default function manifest(): MetadataRoute.Manifest {
    return {
      name: 'ShopHub',
      short_name: 'ShopHub',
      start_url: '/',
      display: 'standalone',
      background_color: '#f4f6fb',
      theme_color: '#2563eb',
      icons: [/* 192x192, 512x512 */],
    };
  }
  ```
  - Complexity: Easy
  - File: `src/app/manifest.ts`
  - Depends on: PWA icons in `public/icons/`

- [x] **Service Worker for asset caching** — caches static JS, CSS, and image assets so the app loads instantly on repeat visits and the shell renders even offline. Use the `next-pwa` package which integrates with the Next.js build and generates the Service Worker automatically with Workbox.
  - Complexity: Medium
  - Install: `next-pwa`
  - Config: `next.config.js`

- [x] **Background sync for offline cart mutations** — when the user is offline and the IndexedDB cart queue has pending mutations (from `11-web-storage.md`), the Service Worker registers a background sync event. When connectivity returns (even if the browser tab is closed), the Service Worker fires and drains the queue.
  - Complexity: Complex
  - Depends on: IndexedDB cart queue (11-web-storage.md) + Service Worker above

---

## Admin Real-Time Order Feed

- [ ] **WebSocket admin order feed** → Socket.IO gateway at `/admin/orders`
  - The backend `OrdersGateway` emits `order:created` to the `/admin/orders` Socket.IO namespace every time a new order is placed
  - In `AdminOrdersView.tsx`: connect to `io('/admin/orders', { auth: { token: accessToken } })` on mount; listen for `order:created` events; prepend the new order object to the TanStack Query cache via `queryClient.setQueryData` so the table updates instantly without a refetch
  - Show a toast "New order #XYZ received" on each event so admins are notified even when scrolled down
  - Disconnect and clean up the socket on component unmount
  - Install `socket.io-client` if not already in the frontend dependencies
  - Create `features/admin/hooks/useAdminOrderFeed.ts` — encapsulates socket setup, teardown, and cache mutation; imported by `AdminOrdersView`
  - Why WebSocket here (not SSE): the admin dashboard may eventually send commands back (claim an order, mark as reviewed) over the same connection; Socket.IO's namespace/room model also makes it easy to scope the feed without multiple HTTP connections
  - Complexity: Medium
  - Files: `features/admin/hooks/useAdminOrderFeed.ts`, `features/admin/components/AdminOrdersView/AdminOrdersView.tsx`
