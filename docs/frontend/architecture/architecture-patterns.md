# 14 — Architecture Patterns

Structural improvements based on the clean architecture patterns from the notes. These are refactors — they don't add features but make the codebase more maintainable and teach important patterns.
Source: `component-based.md`, `domain-driven-design.md`, `event-bus-pattern.md`, `layered-pattern.md`

---

## Items to Implement

### Feature Public API (Component-Based Pattern)

- [x] **Top-level `index.ts` per feature** — each feature should expose a public API via a barrel file. Other features and pages should import from `@/features/cart` not from `@/features/cart/hooks/useCart` or `@/features/cart/components/CartView/CartView`.
  
  Example `src/features/cart/index.ts`:
  ```ts
  export { CartView } from './components/CartView/CartView';
  export { CartSummary } from './components/CartSummary/CartSummary';
  export { useCart } from './hooks/useCart';
  export { useAddToCart } from './hooks/useAddToCart';
  // internal helpers are NOT exported
  ```
  This enforces the "encapsulation" principle from the Component-Based pattern — internal structure can change without breaking imports.
  - Complexity: Easy
  - Affects: all 6 features

---

### Event Bus Pattern

- [x] **Event Bus for cross-feature communication** — currently, when `useAddToCart` succeeds, the cart component shows a button state change. But the notification toast (from `08-user-experience.md`) is a separate concern that shouldn't be coupled into the mutation hook.
  
  An event bus decouples this:
  - Cart hook publishes: `eventBus.emit('cart:item-added', { productName })`
  - Toast system subscribes: `eventBus.on('cart:item-added', ({ productName }) => toast.success(...))`
  
  Implementation: use `mitt` (250-byte pub/sub library) rather than building from scratch.
  ```ts
  // src/shared/eventBus.ts
  import mitt from 'mitt';
  type Events = {
    'cart:item-added': { productName: string };
    'cart:item-removed': { productId: string };
    'order:placed': { orderId: string };
    'auth:session-expired': void;
  };
  export const eventBus = mitt<Events>();
  ```
  - Complexity: Medium
  - File: `src/shared/eventBus.ts`
  - Consumers: toast system in `providers.tsx`, notification badge in Header

---

### Domain-Driven Design (DDD)

- [x] **Explicit domain model typing** — the notes describe Entities (have identity, mutable), Value Objects (no identity, immutable), and Aggregates (cluster of objects treated as one unit). Reflect this in the interfaces:
  
  In our app:
  - `Product` is an Entity (has `id`, mutable stock)
  - `CartItem` is an Entity (has `id`, mutable quantity)
  - `Order` is an Aggregate root (owns `OrderItems` as value objects — an order item has no meaning outside an order)
  - `Price`, `Address` are Value Objects (immutable, no identity)
  
  Concretely: rename or re-comment the interfaces to make this intent clear. Add `Readonly<>` where a value object should not be mutated.
  - Complexity: Easy (mostly a naming/commenting exercise, no runtime change)
  - Files: `src/features/*/interfaces/index.ts`

- [x] **Bounded context enforcement — no cross-feature deep imports** — the DDD bounded context principle says each domain (feature) manages its own model. Enforce by:
  1. ESLint rule or `no-restricted-imports` to block `import from '@/features/cart/...'` from inside `@/features/orders/...`
  2. Any shared types move to `src/interfaces/` (shared kernel in DDD terms)
  - Complexity: Medium
  - File: `.eslintrc.js` (add `no-restricted-imports` rule)

---

### Layered Pattern

- [x] **`useReducer` for cart state transitions** — the cart has complex state transitions: add, remove, update quantity, clear, apply discount, loading states per-item. These are currently spread across multiple `useState` calls and mutation callbacks.
  
  Introduce a `cartReducer` with explicit action types:
  ```ts
  type CartAction =
    | { type: 'ADD_ITEM'; payload: CartItem }
    | { type: 'REMOVE_ITEM'; payload: { id: string } }
    | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
    | { type: 'CLEAR' };
  ```
  This is the Layered pattern applied to UI state: the reducer is the business logic layer, the component is the presentation layer. The component dispatches actions, it doesn't implement transitions.
  - Complexity: Medium
  - File: `src/features/cart/` (new `cartReducer.ts` + update `CartView.tsx`)
