# 21 — Feature Flags

Feature flags decouple deployment from release. Code ships to production hidden behind a flag; the flag is enabled when ready. In ecommerce this enables gradual rollouts, A/B tests, and safe experimentation without feature branches.

---

## Use Cases in This App

- `newCheckout` — test a redesigned checkout flow with 10% of users
- `newSearch` — enable a new full-text search UI
- `wishlist` — enable wishlist feature when backend is ready
- `recommendations` — enable AI-recommended products section
- `darkMode` — enable dark mode toggle for users
- `adminV2` — test a new admin dashboard layout

---

## Items to Implement

### Flag Provider

- [x] **`FeatureFlagProvider`** — a React context that reads flag values and exposes them to the component tree. Keep it simple: flags are key-value pairs, values are booleans (or strings for A/B variants).
  
  ```tsx
  // src/shared/featureFlags/FeatureFlagProvider.tsx
  type Flags = {
    newCheckout: boolean;
    newSearch: boolean;
    wishlist: boolean;
    recommendations: boolean;
  };

  const FeatureFlagContext = createContext<Flags>(defaultFlags);

  export function FeatureFlagProvider({ children }: { children: ReactNode }) {
    const flags = useFlags(); // loads from config/API/env
    return (
      <FeatureFlagContext.Provider value={flags}>
        {children}
      </FeatureFlagContext.Provider>
    );
  }

  export const useFeatureFlag = (key: keyof Flags) =>
    useContext(FeatureFlagContext)[key];
  ```
  - Complexity: Medium
  - File: `src/shared/featureFlags/`

- [x] **Flag source options** — start simple (env vars), evolve to a service:
  - **Level 1 (start here): environment variables** — `NEXT_PUBLIC_FLAG_WISHLIST=true`. Zero external dependency. Flags change with deployment.
  - **Level 2: JSON config file** — `public/flags.json` fetched at runtime. Flags change without redeployment.
  - **Level 3: Feature flag service** — LaunchDarkly, Unleash, or Flagsmith. Real-time updates, user targeting, A/B splitting. Introduce when Level 2 becomes limiting.
  - Complexity: Easy (Level 1), Medium (Level 2), Complex (Level 3)

### Usage Pattern

- [x] **`useFeatureFlag` hook at component level** — flags should be checked at the component level, not inside business logic:
  ```tsx
  function ProductCard({ product }) {
    const wishlistEnabled = useFeatureFlag('wishlist');
    return (
      <div>
        {/* ... */}
        {wishlistEnabled && <WishlistButton productId={product.id} />}
      </div>
    );
  }
  ```
  - Complexity: Easy (once provider is set up)

- [x] **Route-level flag guard** — for entire pages behind a flag, create a guard component:
  ```tsx
  function FlagGuard({ flag, children }: { flag: keyof Flags; children: ReactNode }) {
    const enabled = useFeatureFlag(flag);
    if (!enabled) return <NotFoundPage />;
    return <>{children}</>;
  }
  ```
  - Complexity: Easy

### Environment-Variable Flag Validation

- [x] **Add flag env vars to Zod validation** — once `25-environment-config.md` is implemented, add feature flag env vars to the Zod schema so a misconfigured flag (typo, wrong type) fails at startup, not silently.
  - Complexity: Easy
  - Depends on: `25-environment-config.md`

---

## Activating the Recommendations Flag

The `recommendations` flag is already declared in `featureFlags.ts` and `env.ts` but no component actually calls the recommendations API. It is a dead stub.

- [ ] **Wire the `recommendations` flag to the analytics-service API** → `GET /api/recommendations/products/:id`
  - Create `features/recommendations/api/recommendations.api.ts` — `getRecommendations(productId)` hitting the analytics-service via the gateway
  - Create `features/recommendations/hooks/useRecommendations.ts` — TanStack query keyed on `["recommendations", productId]`; disabled when the flag is off or `productId` is undefined
  - Create `features/recommendations/components/RecommendationStrip/RecommendationStrip.tsx` — horizontal scrollable row of `ProductCard`s labelled "You might also like"; renders nothing when the query returns an empty array
  - Wrap with `<FlagGuard flag="recommendations">` in `ProductDetailView.tsx` so the section only appears when `NEXT_PUBLIC_FLAG_RECOMMENDATIONS=true`
  - Complexity: Medium
  - Files: `features/recommendations/`, `features/products/components/ProductDetailView/ProductDetailView.tsx`

---

## Admin Feature Flag Management UI

The backend exposes a full CRUD API for runtime feature flags stored in the database. The frontend currently reads flags only from env vars (build-time). This panel lets admins toggle flags live without a redeployment.

- [ ] **Admin feature flags page** → `GET /admin/feature-flags`, `POST /admin/feature-flags`, `PATCH /admin/feature-flags/:name`, `DELETE /admin/feature-flags/:name`
  - Create `app/[locale]/admin/feature-flags/page.tsx` — table of all runtime flags; columns: name, enabled (toggle), description, created at, actions
  - Enabled toggle: calls `PATCH /admin/feature-flags/:name` with `{ enabled: !current }` inline — no page reload needed
  - "New flag" form: name and description fields; calls `POST /admin/feature-flags`
  - Delete: calls `DELETE /admin/feature-flags/:name` with a confirmation dialog
  - Add "Feature Flags" link under a "System" section in `AdminNav.tsx`
  - Document in a page comment that env vars are build-time defaults; database flags override at runtime when the backend checks them
  - Create `features/admin/hooks/useFeatureFlags.ts`, `useCreateFeatureFlag.ts`, `useUpdateFeatureFlag.ts`, `useDeleteFeatureFlag.ts`
  - Complexity: Medium
