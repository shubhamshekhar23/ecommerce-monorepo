# 20 — Error Handling Strategy & Logging

Define exactly how each type of error is handled — caught, displayed, and logged. Without a unified strategy, every component handles errors differently and errors get silently swallowed.

---

## Error Classification

Every error the frontend encounters falls into one of these categories. The category determines how it's handled:

- **Validation errors** — user input failed schema validation. Show inline field errors. Do not log to Sentry (not a bug).
- **Business errors** — server rejected the request with a known business reason (e.g. "out of stock", "coupon expired", "email already taken"). Show a specific, actionable message. Do not log to Sentry.
- **Authentication errors** — 401/403 responses. Trigger token refresh or redirect to login. Log 403s to Sentry (unexpected permission denials).
- **Network errors** — no internet, timeout, connection refused. Show "Check your connection" message with a retry button. Do not log to Sentry unless persistent.
- **Server errors** — 500/502/503 from the API. Show "Something went wrong on our end". Log to Sentry with request context.
- **Unknown/unexpected errors** — anything that reaches an Error Boundary. Always log to Sentry with full context.

---

## Items to Implement

### Error Classification Layer

- [x] **Typed API error class** — create a custom error class that carries the error category and a user-facing message:
  ```ts
  // src/shared/errors.ts
  export type ErrorCategory = 
    | 'validation' | 'business' | 'auth' | 'network' | 'server' | 'unknown';

  export class AppError extends Error {
    constructor(
      public readonly category: ErrorCategory,
      public readonly userMessage: string,
      public readonly originalError?: unknown,
    ) {
      super(userMessage);
    }
  }
  ```
  - Complexity: Easy
  - File: `src/shared/errors.ts`

- [x] **API error normalizer** — in `apiClient.ts`, intercept all error responses and convert them to `AppError` before they reach any hook or component:
  ```ts
  // axios interceptor
  error.response?.status === 400 → AppError('business', server message)
  error.response?.status === 401 → AppError('auth', 'Session expired')
  error.response?.status === 422 → AppError('validation', server message)
  error.response?.status >= 500  → AppError('server', 'Something went wrong on our end')
  !error.response               → AppError('network', 'Check your connection')
  ```
  - Complexity: Medium
  - File: `src/shared/apiClient.ts`

### Display Layer

- [ ] **Per-category display rules** — in mutation hooks' `onError` callbacks, check the error category and display accordingly:
  - `validation` / `business` → toast or inline message with the `userMessage`
  - `auth` → trigger silent refresh or redirect (handled by interceptor)
  - `network` → toast with "Retry" action button
  - `server` / `unknown` → generic toast + log to Sentry
  - Complexity: Medium (apply in all mutation hooks)

- [ ] **Retry UI for network errors** — for network-category errors, the toast should include a "Try Again" button that re-fires the mutation. TanStack Query's `retry` option handles automatic retries; the manual retry button is for user-initiated retries after the automatic ones fail.
  - Complexity: Medium

### Logging Strategy

Replace all `console.log`, `console.error`, and `console.warn` calls with a structured logger.

- [x] **Create a `logger` utility** — thin wrapper around console (dev) and Sentry (prod):
  ```ts
  // src/shared/logger.ts
  export const logger = {
    debug: (msg: string, ctx?: object) => {
      if (process.env.NODE_ENV === 'development') console.debug(msg, ctx);
    },
    info: (msg: string, ctx?: object) => console.info(msg, ctx),
    warn: (msg: string, ctx?: object) => console.warn(msg, ctx),
    error: (msg: string, error?: unknown, ctx?: object) => {
      console.error(msg, error, ctx);
      if (process.env.NODE_ENV === 'production') {
        Sentry.captureException(error, { extra: { msg, ...ctx } });
      }
    },
  };
  ```
  - Complexity: Easy
  - File: `src/shared/logger.ts`

- [x] **Replace all `console.*` calls** — search and replace across `src/`:
  ```
  grep -r "console\." src/
  ```
  Replace with `logger.*`. This makes it trivial to add structured context (user ID, request ID) to all logs later.
  - Complexity: Easy (mechanical, but thorough)

- [x] **Add user and request context to Sentry** — after login, set the Sentry user context so errors are associated with the specific user:
  ```ts
  Sentry.setUser({ id: user.id, email: user.email });
  ```
  Clear on logout: `Sentry.setUser(null)`.
  - Complexity: Easy
  - File: `src/features/auth/hooks/useLogin.ts`, `useLogout.ts`
