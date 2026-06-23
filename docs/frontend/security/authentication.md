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

- [x] **Optimistic auth state on page load** — currently, there may be a flash where the page renders in an unauthenticated state before the auth store hydrates. Prevent this by reading the auth state from the cookie/token synchronously on the server side via Next.js middleware or Server Components.
  - Complexity: Medium
  - File: `src/features/auth/hooks/useAuthHydration.ts`, `middleware.ts`

---

## Password Recovery

- [ ] **Forgot password page** → `POST /auth/forgot-password`
  - Create `app/[locale]/(auth)/forgot-password/page.tsx` — single email field form; on submit calls `POST /auth/forgot-password`
  - Always show a success message regardless of whether the email exists — never reveal account existence to a potential attacker
  - Add "Forgot password?" link to `LoginForm.tsx` pointing to this page
  - Create `features/auth/hooks/useForgotPassword.ts` — mutation; endpoint is `@Public()`, no auth header needed
  - Complexity: Easy

- [ ] **Reset password page** → `POST /auth/reset-password`
  - Create `app/[locale]/(auth)/reset-password/page.tsx` — reads `?token=` from the URL query string; shows new-password + confirm-password fields; submits `{ token, newPassword }` to `POST /auth/reset-password`; on success redirects to `/login`
  - Validate client-side: passwords must match, minimum length 8 characters; show inline field errors via `ErrorMessage`, not just a toast
  - Create `features/auth/hooks/useResetPassword.ts` — mutation; `@Public()` endpoint
  - Complexity: Easy

---

## Two-Factor Authentication (2FA)

- [ ] **2FA setup and enable** → `POST /auth/2fa/setup`, `POST /auth/2fa/enable`
  - Add a "Security" tab to the account section (`app/[locale]/account/security/page.tsx`) showing current 2FA status
  - "Enable 2FA" button calls `POST /auth/2fa/setup` which returns a TOTP `otpauth://` URI and a QR code data URL
  - Display the QR code for the user to scan with an authenticator app; also show the plain-text secret for manual entry
  - "Verify and activate" form: 6-digit code field; calls `POST /auth/2fa/enable`; on success display backup codes and mark 2FA as active
  - Complexity: Medium

- [ ] **2FA verify step during login** → `POST /auth/2fa/verify`
  - After `POST /auth/login` succeeds, check whether the response contains `requires2fa: true`
  - If so, show an interstitial screen with a 6-digit TOTP code field instead of completing login
  - Submitting the code to `POST /auth/2fa/verify` returns the real access/refresh tokens to complete the auth flow
  - Modify `LoginForm.tsx` and `useLogin.ts` to handle this two-step state
  - Create `features/auth/hooks/use2faVerify.ts`
  - Complexity: Medium

- [ ] **2FA disable** → `POST /auth/2fa/disable`
  - "Disable 2FA" button on the security page shows a confirmation dialog with a current TOTP code field
  - On confirm, calls `POST /auth/2fa/disable` and updates the security page status
  - Create `features/auth/hooks/use2faDisable.ts`
  - Complexity: Easy

---

## OAuth

- [ ] **Google OAuth login** → `GET /auth/oauth/google`
  - Add a "Continue with Google" button to both `LoginForm.tsx` and `RegisterForm.tsx`
  - On click: redirect the browser to `${API_URL}/auth/oauth/google`; the auth-service handles the full OAuth dance and redirects back to the frontend with tokens
  - Create `app/[locale]/(auth)/oauth/callback/page.tsx` — reads tokens from URL params on mount, stores them in the auth store (same path as a normal login), clears the URL params, redirects to the originally intended page
  - Create `features/auth/hooks/useOAuthCallback.ts` — called from the callback page on mount
  - Complexity: Medium
