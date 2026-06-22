# 16 — Testing

A complete testing strategy for the frontend. Tests are only valuable if they run in CI and block bad merges. See `17-ci-cd-quality-gates.md` for the enforcement layer.

---

## Testing Pyramid

From fastest/cheapest to slowest/most realistic:

- Unit Tests — pure functions, hooks, utilities
- Component Tests — individual React components in isolation
- Integration Tests — multiple components working together
- E2E Tests — full user journeys in a real browser
- Visual Regression — screenshot diffs
- Accessibility Tests — automated A11Y audits

---

## Items to Implement

### Unit Tests

- [x] **Test pure utility functions** — every function in `features/*/utils/` and `src/shared/` should have unit tests. These have no side effects and are the easiest to test:
  - `auth.utils.ts` — token parsing, expiry checks
  - Cart total calculation, discount application (once in utils)
  - Form schema validators (`auth.schemas.ts`, checkout validation)
  - Complexity: Easy
  - Tool: Jest (already in Next.js)

- [x] **Test custom hooks** — use `@testing-library/react` with `renderHook` to test hooks in isolation:
  - `useDebounce` — verify value updates after delay
  - `useScrollRestoration` — verify save/restore behavior
  - `useLocalStorage` — verify get/set/clear
  - Complexity: Easy–Medium

### Component Tests

- [x] **Set up React Testing Library** — install `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`. Configure in `jest.config.ts`.
  - Complexity: Easy (setup)

- [x] **MSW (Mock Service Worker) for API mocking** — use MSW to intercept network requests in tests. This means components are tested against realistic API responses without a real server. Define handlers in `src/__tests__/mocks/handlers.ts`.
  - Install: `msw`
  - Define: one handler file per feature (`products.handlers.ts`, `cart.handlers.ts`)
  - Complexity: Medium

- [x] **Test `ProductCard`** — render with a mock product, assert:
  - Product name, price, stock status are visible
  - "Add to Cart" button is disabled when `stock === 0`
  - Clicking "Add to Cart" when unauthenticated redirects to `/login`
  - Clicking "Add to Cart" when authenticated calls the mutation
  - Complexity: Medium

- [x] **Test `LoginForm` / `RegisterForm`** — assert:
  - Submitting with empty fields shows validation errors
  - Submitting valid data calls the API mutation
  - Error response from API renders the error message
  - Complexity: Medium

- [x] **Test `CartView`** — assert:
  - Empty cart renders empty state
  - Items render with correct quantity and subtotal
  - Remove button calls the correct mutation
  - Complexity: Medium

- [x] **Accessibility tests with `jest-axe`** — in every component test, add:
  ```ts
  import { axe, toHaveNoViolations } from 'jest-axe';
  expect.extend(toHaveNoViolations);

  it('has no accessibility violations', async () => {
    const { container } = render(<ProductCard product={mockProduct} />);
    expect(await axe(container)).toHaveNoViolations();
  });
  ```
  - Complexity: Easy (add to existing tests)
  - Depends on: `jest-axe` install

### Integration Tests

- [x] **Test add-to-cart flow** — render `ProductCard` + cart count in Navbar together. Assert that clicking "Add to Cart" updates the cart count.
  - Complexity: Medium

- [x] **Test product filter + results** — render `CategorySidebar` + `ProductGrid` together with MSW handlers. Assert filtering by category changes the displayed products.
  - Complexity: Medium

### E2E Tests

- [x] **Set up Playwright** — preferred over Cypress for Next.js App Router. Supports multiple browsers, is faster, and has better TypeScript support.
  - Install: `@playwright/test`
  - Config: `playwright.config.ts` pointing to `localhost:3000`
  - Complexity: Medium (setup)

- [x] **E2E: Browse and add to cart** — user journey:
  1. Visit `/products`
  2. Click a product card
  3. Click "Add to Cart"
  4. Navigate to `/cart`
  5. Assert item is in cart
  - Complexity: Medium

- [x] **E2E: Full checkout flow** — user journey:
  1. Login
  2. Add product to cart
  3. Navigate to checkout
  4. Fill shipping details
  5. Complete payment (use Stripe test card)
  6. Assert order confirmation page
  - Complexity: Complex (requires Stripe test mode setup)

- [x] **E2E: Auth flow** — register new user, login, logout, verify redirects.
  - Complexity: Medium

- [x] **E2E: Admin product CRUD** — login as admin, create product, verify it appears in listing, edit it, delete it.
  - Complexity: Medium

### Visual Regression Tests

- [x] **Playwright screenshot tests** — for key UI components (ProductCard, Navbar, checkout form), capture screenshots and compare against baseline. Fails CI when visual changes occur unexpectedly.
  - Use: Playwright's built-in `expect(page).toHaveScreenshot()` or `@playwright/experimental-ct-react` for component-level snapshots
  - Complexity: Medium

### Performance Tests

- [x] **Render time budget with React Testing Library** — measure how long a component takes to mount and assert it stays within a budget. Catches regressions where a component becomes unexpectedly slow (e.g. a heavy `useMemo` or accidental re-render cascade):
  ```ts
  it('renders ProductGrid within performance budget', () => {
    const start = performance.now();
    render(<ProductGrid products={mockProducts} isLoading={false} error={null} />);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(50); // 50ms budget
  });
  ```
  - Complexity: Easy (add to existing component tests)
  - Start with: `ProductGrid`, `CartView`, `AdminProductsView`

- [ ] **Interaction performance with Playwright `page.metrics()`** — in E2E tests, measure key navigation metrics after each user journey step:
  ```ts
  const metrics = await page.metrics();
  expect(metrics.TaskDuration).toBeLessThan(100);
  // Also available: LayoutCount, RecalcStyleCount, ScriptDuration
  ```
  Add to the browse-and-add-to-cart E2E test to track performance regressions on the critical path.
  - Complexity: Medium
  - Depends on: Playwright E2E setup

- [ ] **React Profiler in dev tests** — wrap components under test with `<React.Profiler>` to capture render counts and duration. Catch unexpected re-renders caused by missing memoization:
  ```tsx
  const onRender = jest.fn();
  render(
    <React.Profiler id="ProductCard" onRender={onRender}>
      <ProductCard product={mockProduct} />
    </React.Profiler>
  );
  // Verify it rendered exactly once on mount
  expect(onRender).toHaveBeenCalledTimes(1);
  ```
  - Complexity: Easy
  - Use on: `ProductCard`, `CartItemRow`, any component suspected of over-rendering

- [x] **Web Vitals assertion in Lighthouse CI** — the CI gate (in `17-ci-cd-quality-gates.md`) runs Lighthouse and enforces score thresholds. Treat failing Web Vital scores (LCP > 2.5s, CLS > 0.1, FID > 100ms) as test failures, not just warnings.
  - Complexity: Easy (config in Lighthouse CI setup, not a code test)
  - Documented in: `17-ci-cd-quality-gates.md` but enforced as a performance test gate

### Contract Tests

- [x] **Pact consumer contract tests** — a Pact test already exists at `src/__tests__/pacts/products.pact.spec.ts`. Extend to cover all feature APIs:
  - Auth endpoints (`/auth/login`, `/auth/register`, `/auth/me`)
  - Cart endpoints
  - Orders endpoints
  - Complexity: Medium (pattern already established)

### Storybook

- [x] **Set up Storybook** — for component documentation and interaction testing:
  ```
  npx storybook@latest init
  ```
  - Complexity: Medium (setup)

- [x] **Stories for shared components** — `ProductCard`, `FormField`, `ProductSkeleton`, `Navbar`, `Footer`, button variants, error states
  - Complexity: Easy (one story file per component)

- [x] **Storybook interaction tests** — use `@storybook/test` to write interaction tests inside stories. These run in CI via `storybook test`.
  - Complexity: Medium
