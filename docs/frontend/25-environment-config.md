# 25 — Environment Configuration

Replace raw `process.env` access scattered across the codebase with a single validated, typed config module. A misconfigured environment should fail loudly at startup, not silently at the point of use.

---

## Problem with Direct `process.env` Access

```ts
// scattered everywhere — no type safety, no validation, fails at runtime
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
fetch(`${apiUrl}/products`); // apiUrl could be undefined
```

If `NEXT_PUBLIC_API_URL` is missing from `.env`, the app starts fine and only fails when a user makes a request. The error is far from the cause.

---

## Items to Implement

- [ ] **`src/shared/config/env.ts` — Zod-validated environment schema** — define all environment variables in one place and parse them with Zod at module load time:
  ```ts
  import { z } from 'zod';

  const envSchema = z.object({
    // Public (browser-accessible)
    NEXT_PUBLIC_API_URL: z.string().url(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
    NEXT_PUBLIC_APP_URL: z.string().url(),
    
    // Feature flags
    NEXT_PUBLIC_FLAG_WISHLIST: z.coerce.boolean().default(false),
    NEXT_PUBLIC_FLAG_RECOMMENDATIONS: z.coerce.boolean().default(false),
    
    // Server-only (not prefixed with NEXT_PUBLIC)
    STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  });

  export const env = envSchema.parse(process.env);
  ```
  If validation fails, Zod throws immediately with a clear error listing every missing/invalid variable. The app fails at startup, not at runtime.
  - Complexity: Easy
  - File: `src/shared/config/env.ts`

- [ ] **Replace all `process.env` access with `env.*`** — find and replace across the codebase:
  ```
  grep -r "process.env" src/
  ```
  Every occurrence should become `env.NEXT_PUBLIC_API_URL`, etc.
  - Complexity: Easy (mechanical)
  - Files: `src/shared/config.ts`, `src/shared/apiClient.ts`, `src/lib/stripe.ts`, any feature using env vars

- [ ] **`src/shared/config/config.ts` — derived constants** — separate from raw env vars, have a config file that derives app-level constants from the validated env:
  ```ts
  import { env } from './env';

  export const config = {
    apiUrl: env.NEXT_PUBLIC_API_URL,
    appUrl: env.NEXT_PUBLIC_APP_URL,
    stripe: {
      publishableKey: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    },
    features: {
      wishlist: env.NEXT_PUBLIC_FLAG_WISHLIST,
      recommendations: env.NEXT_PUBLIC_FLAG_RECOMMENDATIONS,
    },
  } as const;
  ```
  Components import `config.features.wishlist`, not `env.NEXT_PUBLIC_FLAG_WISHLIST`. The naming is semantic, not tied to env var naming conventions.
  - Complexity: Easy
  - File: `src/shared/config/config.ts`

- [ ] **`.env.example` file** — maintain a committed `.env.example` with all required variable names (no values). New developers know exactly what to set up:
  ```
  NEXT_PUBLIC_API_URL=
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
  NEXT_PUBLIC_APP_URL=
  STRIPE_SECRET_KEY=
  ```
  - Complexity: Easy
  - File: `.env.example` at repo root (or `apps/frontend/.env.example`)

- [ ] **Type-safe env in `next.config.js`** — Next.js allows remapping env vars in the config. Use `env` here too (with a simpler Node.js-level schema check since Zod may not be available before the app boots):
  ```js
  if (!process.env.NEXT_PUBLIC_API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is required');
  }
  ```
  The full Zod validation in `env.ts` catches the rest once the Next.js module system initializes.
  - Complexity: Easy
