# 06 — State Management

Two patterns from the notes: normalized state shape and optimistic updates. Both improve perceived performance and teach fundamental patterns used in large-scale apps.
Source: `normalized-state.md`, `optimistic-update.md`

---

## Core Concepts from Notes

### Normalized State
Store data as `{ byId: { [id]: entity }, allIds: id[] }` instead of a flat array. Benefits:
- O(1) lookup by ID (no `.find()` on every render)
- Single source of truth — no duplicate data
- Easier to update one item without cloning the whole array

### Optimistic Updates
Update the UI immediately before the server responds. If the server rejects, roll back. The four steps:
1. Snapshot current state (`onMutate`)
2. Apply the change to local cache immediately
3. On server success: do nothing (or sync with server response)
4. On server error: roll back to the snapshot

---

## Items to Implement

### Normalized State

- [ ] **Normalized cart store** — the cart items from TanStack Query come back as an array. When caching this locally (for optimistic updates), store it in normalized form. In the cart Zustand store or query cache, use:
  ```ts
  type CartState = {
    byId: Record<string, CartItem>;
    allIds: string[];
  }
  ```
  This makes updating a single item's quantity (e.g. `byId[itemId].quantity = newQty`) O(1) instead of `.map()` over the array.
  - Complexity: Medium
  - Files: `src/features/cart/` (store or query cache transform)

- [ ] **Selector helpers for normalized cart** — add selector functions that derive the flat array when needed for rendering:
  ```ts
  const cartItems = allIds.map((id) => byId[id]);
  ```
  Components should never access `byId` directly — they use selectors.
  - Complexity: Easy (depends on normalized cart above)

---

### Optimistic Updates

TanStack Query provides `onMutate`, `onError`, and `onSettled` hooks on every `useMutation`. Use these for all cart and order mutations.

- [ ] **Optimistic update: Add to Cart** — in `useAddToCart.ts`, implement:
  - `onMutate`: cancel in-flight cart queries, snapshot previous cart, add the new item to cache immediately
  - `onError`: roll back to snapshot, show error state
  - `onSettled`: re-fetch cart from server to sync
  
  User experience: button shows "Added ✓" immediately without waiting for the network.
  - Complexity: Medium
  - File: `src/features/cart/hooks/useAddToCart.ts`

- [ ] **Optimistic update: Remove from Cart** — in `useRemoveCartItem.ts`:
  - `onMutate`: remove item from cache immediately
  - `onError`: restore the item
  - User experience: item disappears from cart list instantly.
  - Complexity: Medium
  - File: `src/features/cart/hooks/useRemoveCartItem.ts`

- [ ] **Optimistic update: Update Cart Quantity** — in `useUpdateCartItem.ts`:
  - `onMutate`: update the item's quantity in cache immediately
  - `onError`: restore previous quantity
  - User experience: quantity field and subtotal update instantly.
  - Complexity: Medium
  - File: `src/features/cart/hooks/useUpdateCartItem.ts`

- [ ] **Optimistic update: Cancel Order** — in `useCancelOrder.ts`:
  - `onMutate`: set order status to `CANCELLED` in cache immediately
  - `onError`: restore previous status
  - User experience: order status updates instantly in `OrderDetailView` without a loading spinner.
  - Complexity: Medium
  - File: `src/features/orders/hooks/useCancelOrder.ts`
