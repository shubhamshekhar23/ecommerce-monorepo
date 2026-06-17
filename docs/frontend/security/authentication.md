# 18 — Authentication Strategy

The current auth implementation handles login/logout and stores a token. This file documents the patterns needed to make auth robust in production: token lifecycle, silent refresh, and edge cases.

---

## Current State

- `auth.store.ts` — Zustand store holding auth status and user
- `useLogin`, `useLogout`, `useRegister` hooks exist
- `middleware.ts` — likely protects routes
- JWT-based auth against the backend

---

## Items to Implement

### Token Lifecycle

- [x] **Refresh token rotation** — the backend issues a short-lived access token (e.g. 15 min) and a long-lived refresh token (e.g. 7 days). When the access token expires, the frontend silently requests a new one using the refresh token — without making the user log in again.
  
  Flow:
  1. API call fails with 401
  2. `apiClient.ts` interceptor catches the 401
  3. Interceptor calls `POST /auth/refresh` with the refresh token (stored in an `HttpOnly` cookie — never in localStorage)
  4. On success: retry the original request with the new access token
  5. On failure (refresh token expired): clear auth state, redirect to `/login`
  
  - Complexity: Medium
  - File: `src/shared/apiClient.ts` (add axios/fetch interceptor)

- [x] **Silent refresh before expiry** — proactively refresh the access token before it expires (e.g. at 80% of its lifetime). Prevents the user hitting a 401 mid-flow (e.g. during checkout):
  ```ts
  const tokenExpiresAt = decodeJwt(token).exp * 1000;
  const refreshAt = tokenExpiresAt - 3 * 60 * 1000; // 3 min before expiry
  setTimeout(() => silentRefresh(), refreshAt - Date.now());
  ```
  - Complexity: Medium
  - File: `src/features/auth/hooks/useAuthHydration.ts`

- [x] **Session expiry handling** — if the refresh token has also expired (user was inactive for 7+ days), the app must:
  1. Clear all auth state in the Zustand store
  2. Show a "Your session has expired. Please log in again." message (not a silent redirect)
  3. Preserve the current URL so after login the user is returned to where they were
  - Complexity: Medium
  - File: `src/shared/apiClient.ts`, toast system from `08-user-experience.md`

### Multi-Tab

- [x] **Multi-tab logout sync** — if the user logs out in one tab, all other open tabs should also log out. Use the `storage` event to listen for auth state changes:
  ```ts
  window.addEventListener('storage', (event) => {
    if (event.key === 'auth-logout') {
      clearAuthState();
      router.push('/login');
    }
  });
  ```
  On logout: `localStorage.setItem('auth-logout', Date.now().toString())` (then remove it — the event fires in other tabs).
  - Complexity: Easy
  - File: `src/features/auth/hooks/useAuthHydration.ts`

- [x] **Multi-tab login sync** — conversely, if the user logs in on one tab, other tabs should pick up the session without requiring a page reload.
  - Same pattern: listen for `auth-login` storage event, re-hydrate auth state.
  - Complexity: Easy

### Route Protection

- [x] **Middleware auth guard audit** — `src/middleware.ts` likely protects `/admin/*`, `/cart`, `/orders`, `/checkout`. Verify:
  - Unauthenticated users trying to access protected routes are redirected to `/login?redirect=<original-url>`
  - After login, the user is redirected back to their original destination (not always to `/`)
  - Admin routes additionally check the user's role, not just auth status
  - Complexity: Easy (audit + fix)

- [ ] **Optimistic auth state on page load** — currently, there may be a flash where the page renders in an unauthenticated state before the auth store hydrates. Prevent this by reading the auth state from the cookie/token synchronously on the server side via Next.js middleware or Server Components.
  - Complexity: Medium
  - File: `src/features/auth/hooks/useAuthHydration.ts`, `middleware.ts`
