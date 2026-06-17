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

- [ ] **`FeatureFlagProvider`** — a React context that reads flag values and exposes them to the component tree. Keep it simple: flags are key-value pairs, values are booleans (or strings for A/B variants).
  
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

- [ ] **Flag source options** — start simple (env vars), evolve to a service:
  - **Level 1 (start here): environment variables** — `NEXT_PUBLIC_FLAG_WISHLIST=true`. Zero external dependency. Flags change with deployment.
  - **Level 2: JSON config file** — `public/flags.json` fetched at runtime. Flags change without redeployment.
  - **Level 3: Feature flag service** — LaunchDarkly, Unleash, or Flagsmith. Real-time updates, user targeting, A/B splitting. Introduce when Level 2 becomes limiting.
  - Complexity: Easy (Level 1), Medium (Level 2), Complex (Level 3)

### Usage Pattern

- [ ] **`useFeatureFlag` hook at component level** — flags should be checked at the component level, not inside business logic:
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

- [ ] **Route-level flag guard** — for entire pages behind a flag, create a guard component:
  ```tsx
  function FlagGuard({ flag, children }: { flag: keyof Flags; children: ReactNode }) {
    const enabled = useFeatureFlag(flag);
    if (!enabled) return <NotFoundPage />;
    return <>{children}</>;
  }
  ```
  - Complexity: Easy

### Environment-Variable Flag Validation

- [ ] **Add flag env vars to Zod validation** — once `25-environment-config.md` is implemented, add feature flag env vars to the Zod schema so a misconfigured flag (typo, wrong type) fails at startup, not silently.
  - Complexity: Easy
  - Depends on: `25-environment-config.md`
