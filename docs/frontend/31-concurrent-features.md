# 31 — React 18 Concurrent Features

React 18 introduced concurrent rendering primitives that allow the UI to remain responsive during expensive state updates. These are especially useful for search/filter interactions where input must feel instant but the list rendering is expensive.

---

## Core Primitives

- **`useTransition`** — marks a state update as non-urgent. React renders the UI with the old state until the transition completes, keeping the page responsive. Returns `[isPending, startTransition]`.
- **`useDeferredValue`** — defers updating a value until the browser has idle time. Similar effect to `useTransition` but for values you don't directly control.
- **`Suspense`** — already used in the codebase for streaming SSR; concurrent rendering also uses Suspense to show fallbacks during transitions.

---

## Items to Implement

- [ ] **`useTransition` for product filter/search** — when the user types in the search box or selects a category, the product list re-renders. On a large list this can cause the input to stutter. Mark the list update as a transition:
  ```tsx
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [deferredSearch, setDeferredSearch] = useState('');

  const handleSearchChange = (value: string) => {
    setSearch(value); // update input immediately (urgent)
    startTransition(() => {
      setDeferredSearch(value); // update product list non-urgently
    });
  };
  ```
  The input stays responsive; the list updates when React has capacity.
  - Complexity: Easy
  - File: `src/features/products/components/ProductsView/ProductsView.tsx`

- [ ] **`useDeferredValue` for category sidebar filter** — when selecting a category, the filter value drives an expensive re-render of the product grid. Defer the value that drives the heavy render:
  ```tsx
  const selectedCategory = useUrlState('category');
  const deferredCategory = useDeferredValue(selectedCategory);
  // pass deferredCategory to the query, not selectedCategory
  const { data } = useProducts({ category: deferredCategory });
  ```
  During the transition, show the product grid at reduced opacity (`opacity: isPending ? 0.5 : 1`) to indicate it's updating.
  - Complexity: Easy

- [ ] **`isPending` visual indicator** — whenever a transition is pending, show a subtle visual cue that the content is updating. Do not show a full skeleton (which is jarring) — use opacity reduction or a thin progress bar at the top of the list:
  ```tsx
  <div style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 200ms' }}>
    <ProductGrid ... />
  </div>
  ```
  - Complexity: Easy

- [ ] **`useTransition` for admin table filtering** — admin views with search/filter inputs over large datasets benefit from the same pattern. Apply to `AdminProductsView` search and status filter.
  - Complexity: Easy (same pattern)
  - Files: `AdminProductsView.tsx`, `AdminOrdersView.tsx`

- [ ] **Combine with `useDebounce` correctly** — `useTransition` and `useDebounce` solve different problems and are not alternatives:
  - `useDebounce` reduces the number of requests sent to the server (batches keystrokes before firing an API call)
  - `useTransition` keeps the input responsive during local state transitions (like filtering an already-loaded list)
  - Use both together: debounce the API call, use transition for the local render update
  - Complexity: Easy (documentation + apply correctly in ProductsView)
