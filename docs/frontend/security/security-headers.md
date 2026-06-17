# 09 — Security

Frontend security hardening. Most items here are one-time setup changes with high impact.
Source: `security.md`, `index/security.md`

---

## Core Concepts from Notes

- **XSS (Cross-Site Scripting):** attacker injects malicious scripts via user input rendered as HTML. Prevent by never using `dangerouslySetInnerHTML` on untrusted content and sanitizing anything that must be rendered as HTML.
- **CSRF (Cross-Site Request Forgery):** tricks authenticated users into making unintended requests. JWTs in Authorization headers (not cookies) largely avoid this, but `SameSite=Strict` on any cookies adds another layer.
- **Clickjacking:** embeds the app in an invisible iframe and tricks users into clicking. Prevented by the `X-Frame-Options` header.
- **Security Headers:** HTTP response headers that instruct browsers to enforce security policies. Set once in `next.config.js`, applies to every response.

---

## Items to Implement

### HTTP Security Headers (`next.config.js`)

All headers below are set in the `headers()` function in `next.config.js`. One file, applies globally.

- [x] **`X-Frame-Options: DENY`** — prevents the app from being embedded in any iframe (blocks Clickjacking). The notes explicitly demonstrate the clickjacking attack with a transparent iframe.
  - Complexity: Easy

- [x] **`X-Content-Type-Options: nosniff`** — prevents browsers from MIME-sniffing a response away from the declared content type. Blocks a class of attacks where a plain text file is executed as JS.
  - Complexity: Easy

- [x] **`Referrer-Policy: strict-origin-when-cross-origin`** — controls what URL is sent in the `Referer` header. The notes show how Referer checking is used as CSRF mitigation on the server side. This policy gives the server enough info while not leaking full URLs cross-origin.
  - Complexity: Easy

- [x] **`Strict-Transport-Security` (HSTS)** — forces browsers to always use HTTPS for subsequent visits, even if the user types `http://`. Value: `max-age=31536000; includeSubDomains`.
  - Complexity: Easy
  - Note: only enable once the app is confirmed to be HTTPS-only in production.

- [x] **`Permissions-Policy`** — disables browser features the app doesn't use (camera, microphone, geolocation, payment if not using browser's Payment API). Reduces the attack surface.
  - Complexity: Easy

- [x] **Content Security Policy (CSP)** — the most powerful header. Defines exactly which origins are allowed to load scripts, styles, images, and fonts. Prevents XSS by blocking inline scripts and untrusted sources.
  - Complexity: Complex (needs careful tuning — too strict breaks things like Stripe, Google Fonts)
  - Approach: start in report-only mode (`Content-Security-Policy-Report-Only`), collect violations, then enforce.
  - Do this last among the headers.

---

### External Links

- [x] **`rel="noopener noreferrer"` on all `target="_blank"` links** — the notes call this out specifically. An opened tab can access `window.opener` and redirect the parent page (tab-napping). Add to every `<a target="_blank">` in `Footer.tsx`, product descriptions, or any external URL rendered in the app.
  - Complexity: Easy
  - Audit: `grep -r 'target="_blank"'` across `src/` to find all occurrences
  - Result: zero occurrences found — audit passes

---

### Auth & Input

- [ ] **`SameSite=Strict; Secure` on auth cookies** — if any cookies are set (refresh tokens, session identifiers), ensure the backend sets `SameSite=Strict` and `Secure` flags. The frontend needs to verify this is the case by checking the Set-Cookie header in browser dev tools.
  - Complexity: Easy (backend config, verify from frontend)

- [x] **Sanitization audit for user-generated content** — search for any place where user-supplied text is rendered as HTML (product descriptions from admin, order notes, review text). Ensure none use `dangerouslySetInnerHTML` without first passing through a sanitization library like `DOMPurify`.
  - Complexity: Easy (audit) + Medium (fix if `dangerouslySetInnerHTML` is found)
  - Audit: `grep -r 'dangerouslySetInnerHTML'` across `src/`
  - Result: zero occurrences found — audit passes
