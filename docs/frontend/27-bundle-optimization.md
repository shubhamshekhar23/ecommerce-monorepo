# 27 — Bundle Optimization

Reduce the JS sent to the browser. Next.js handles a lot automatically (code splitting per route, tree shaking), but these items require intentional decisions from the developer.

---

## Core Principle

Every byte of JavaScript the browser downloads must be parsed, compiled, and executed before the page is interactive. Smaller bundle = faster TTI (Time to Interactive).

---

## Items to Implement

### Analysis

- [ ] **`@next/bundle-analyzer` setup** — the first step is knowing what's in the bundle. Without analysis, optimization is guesswork.
  ```ts
  // next.config.js
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
  });
  module.exports = withBundleAnalyzer({ /* next config */ });
  ```
  Add script: `"analyze": "ANALYZE=true next build"`. Run and inspect which dependencies are largest.
  - Complexity: Easy
  - File: `next.config.js`, `package.json`

- [ ] **Identify largest dependencies** — after running the analyzer, look for:
  - Libraries imported in full but only a small part is used (e.g. `lodash` — use `lodash-es` + tree shaking, or replace with native equivalents)
  - Large libraries that could be replaced with smaller ones (e.g. `moment.js` → `date-fns`)
  - Duplicate dependencies (two versions of the same library bundled)
  - Complexity: Easy (analysis) + varies (fixes)

### Code Splitting

- [ ] **Dynamic imports for heavy third-party libraries** — libraries that aren't needed on first load should be dynamically imported:
  ```ts
  // Stripe: only needed on checkout page
  const { loadStripe } = await import('@stripe/stripe-js');

  // Chart library: only needed on admin dashboard
  const { Chart } = await import('chart.js');
  ```
  - Complexity: Easy
  - Files: `src/lib/stripe.ts`, any admin analytics components

- [ ] **Route-level code splitting** — Next.js already splits per route. Verify that no route's page.tsx imports the entire app's logic. Check for barrel file anti-patterns:
  ```ts
  // BAD: imports everything from features/products, even unused parts
  import { ... } from '@/features/products';
  
  // GOOD: import only what's needed
  import { ProductCard } from '@/features/products/components/ProductCard/ProductCard';
  ```
  - Complexity: Easy (audit)

- [ ] **Vendor chunk splitting** — configure Next.js/Webpack to split vendor code (node_modules) from application code. Vendors change less frequently → better CDN caching:
  ```ts
  // next.config.js
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: { test: /node_modules/, name: 'vendors', chunks: 'all' }
      }
    };
    return config;
  }
  ```
  - Complexity: Medium

### Tree Shaking

- [ ] **Ensure tree shaking works** — tree shaking eliminates unused code. It only works with ES modules (`import`/`export`), not CommonJS (`require`). Verify:
  - All local code uses ES module syntax
  - Libraries used are ES module-compatible (check `"module"` field in their `package.json`)
  - Barrel files (`index.ts`) that re-export everything prevent tree shaking — prefer named imports from the specific file
  - Complexity: Easy (audit)

### Import Discipline

- [ ] **Avoid large library defaults** — common mistakes that bloat bundles:
  - `import _ from 'lodash'` → imports the entire library. Use `import debounce from 'lodash-es/debounce'`
  - `import * as Icons from 'react-icons/fa'` → imports every icon. Use `import { FaShoppingCart } from 'react-icons/fa'`
  - `import { format } from 'date-fns'` → fine (date-fns is tree-shakeable)
  - Audit: `npm run analyze` reveals which imports contribute most
  - Complexity: Easy (once analyzer shows the problem)

### Performance Budget in CI

- [ ] **Bundle size gate in CI** — from `17-ci-cd-quality-gates.md`, fail CI when any page's bundle exceeds a size budget. Set budgets after initial analysis:
  - First load JS for homepage: < 120kb gzipped
  - First load JS for product listing: < 140kb gzipped
  - Checkout page: < 200kb gzipped (includes Stripe)
  - Complexity: Medium (depends on CI setup from 17)
