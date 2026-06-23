# 36 — GDPR & Cookie Consent

If the app uses analytics, error tracking, or any cookies that aren't strictly necessary for the service to function, GDPR (EU) and similar regulations (CCPA in California) require explicit user consent before those scripts load.

---

## Cookie Categories

- **Strictly necessary** — session cookies, auth tokens, CSRF tokens. No consent required. Example: the JWT/session cookie the app uses for auth.
- **Analytics** — Google Analytics, Vercel Analytics. Require consent in EU.
- **Error tracking** — Sentry (collects error data, potentially user data). Requires consent in EU.
- **Marketing/advertising** — ad pixels, retargeting. Require consent. (Not currently in scope.)

---

## Items to Implement

### Consent Banner

- [x] **Cookie consent banner component** — shown on first visit to users from regions that require consent. Options:
  - Build a simple one: a bottom banner with "Accept All", "Reject Non-Essential", and "Manage Preferences"
  - Use a library: `react-cookie-consent` (simple), or a consent management platform (CMP) like Cookiebot or OneTrust for full compliance
  - **Recommendation:** build a simple one for the learning project; document that a real production deployment would use a certified CMP.
  - Complexity: Medium
  - File: `src/components/CookieConsent/CookieConsent.tsx`

- [x] **Store consent in `localStorage`** — remember the user's choice so the banner doesn't appear on every visit:
  ```ts
  localStorage.setItem('cookie-consent', JSON.stringify({
    analytics: true,
    errorTracking: false,
    timestamp: Date.now(),
  }));
  ```
  - Complexity: Easy

- [x] **Conditional script loading based on consent** — analytics and Sentry scripts from `13-analytics-monitoring.md` must only load if consent was given:
  ```tsx
  // src/app/providers.tsx
  const consent = useCookieConsent();

  return (
    <>
      {consent.analytics && <GoogleAnalytics />}
      {consent.errorTracking && <SentryInit />}
      {children}
    </>
  );
  ```
  The `<Script>` components for analytics are conditionally rendered — they never load without consent.
  - Complexity: Medium
  - Depends on: `13-analytics-monitoring.md`

- [x] **`useCookieConsent` hook** — reads from `localStorage`, provides consent state and update functions:
  ```ts
  function useCookieConsent(): {
    consent: ConsentState;
    acceptAll: () => void;
    rejectNonEssential: () => void;
    updateConsent: (category: keyof ConsentState, value: boolean) => void;
  }
  ```
  - Complexity: Easy
  - File: `src/shared/cookieConsent/useCookieConsent.ts`

### Privacy

- [x] **Privacy policy page** — link it from the cookie consent banner and the footer. Not a React-specific item, but it's a legal requirement that the banner must link to.
  - Complexity: Easy (static page)
  - File: `src/app/privacy/page.tsx`

- [x] **Do not track (`DNT`) header respect** — if the user's browser sends `DNT: 1`, do not load analytics:
  ```ts
  if (navigator.doNotTrack === '1') {
    // skip analytics
  }
  ```
  - Complexity: Easy

---

## Data Deletion (Right to Erasure)

GDPR Article 17 gives users the right to request deletion of their personal data. The backend implements this via two endpoints.

- [x] **GDPR data deletion request UI** → `DELETE /users/me/data`
  - Create `app/[locale]/account/privacy/page.tsx` — explains what personal data is stored and what deletion means; includes a "Request account data deletion" button
  - On click: show a confirmation dialog ("This will schedule deletion of all your personal data. You have 30 days to cancel before it is processed.")
  - On confirm: call `DELETE /users/me/data`; show a "Deletion scheduled" state with the scheduled date
  - The existing `app/[locale]/privacy/page.tsx` is a static info page — the new account/privacy page is the interactive action page; link between them from the footer
  - Complexity: Easy

- [x] **Cancel deletion request UI** → `DELETE /users/me/data/cancel`
  - If `GET /users/me` returns a non-null `deletionRequestedAt`, show a "Your data deletion is scheduled for [date]" banner on the account/privacy page with a "Cancel deletion" button
  - On confirm: call `DELETE /users/me/data/cancel`; hide the banner and show a success toast
  - Complexity: Easy
