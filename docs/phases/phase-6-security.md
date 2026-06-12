# Phase 6 — Security Depth

**Status:** ✅ Done
**Concept cluster:** Security is not features bolted on — it is knowledge of what breaks and why.

Migration: `prisma/migrations/20260528000002_phase6_security/migration.sql`

---

## What Was Built

### RS256 JWT (Asymmetric Signing)

`apps/auth-service/src/`

The monolith originally used HS256 with a shared secret. Any service holding the secret could forge tokens. RS256 fixes this:

- **Private key** — held only by the Auth Service; used to sign tokens
- **Public key** — distributed to all services (backend, gateway); used only to verify tokens

A service that can only verify tokens cannot create new ones, even if it is compromised.

Key setup:
- `JWT_PRIVATE_KEY` in `apps/auth-service/.env` only — no other service holds it
- `JWT_PUBLIC_KEY` in `apps/backend/.env` and `apps/gateway/.env` (verify only, cannot sign)
- Gateway verifies the token once on every request and injects `X-User-Id` / `X-User-Email` headers — downstream services trust the headers, never re-verify the JWT

A `GET /.well-known/jwks.json` endpoint on the auth-service (`apps/auth-service/src/auth/jwks.controller.ts`) publishes the public key in JWK Set format so any service can autodiscover it.

### Google OAuth2 (Authorization Code Flow)

`apps/auth-service/src/` (Passport Google strategy)

Standard OAuth2 Authorization Code flow via `passport-google-oauth20`:

1. App is registered in Google Cloud Console (APIs & Services → Credentials), which issues a `clientID` and `clientSecret` stored in `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` env vars
2. Browser is redirected to Google with a `state` nonce (CSRF protection)
3. User authenticates; Google redirects back with `authorization_code`
4. Passport exchanges the code + `clientSecret` for tokens **server-side**
5. `GoogleStrategy.validate()` is called with the profile
6. `authService.handleOAuthLogin()` finds or creates the user

Because the `clientSecret` never leaves the server, an intercepted `authorization_code` alone is useless — this is a confidential client flow and PKCE is not needed.

Social login links to the `OAuthAccount` model (provider + providerUserId), which references the `User`. One user can have multiple OAuth providers linked.

### TOTP 2FA

`apps/auth-service/src/` (otplib library)

Two-Factor Authentication using the TOTP algorithm (RFC 6238 — the same algorithm as Google Authenticator):

```typescript
// The core algorithm (what otplib does underneath):
const counter = Math.floor(Date.now() / 1000 / 30); // 30-second window
const hmac = createHmac('sha1', base32Decode(secret)).update(toBuffer(counter)).digest();
const offset = hmac[19] & 0xf;
const otp = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
```

Flow:
- `POST /api/auth/2fa/setup` — generates a TOTP secret, stores in `User.totpSecret`, returns QR code image (base64 PNG) for the authenticator app
- `POST /api/auth/2fa/verify` — verifies the 6-digit code and sets `User.totpEnabled = true`
- On login: if `totpEnabled`, the login response returns a `requires2fa: true` flag; client must then call `POST /api/auth/2fa/verify` with the code to get the final JWT

### Audit Log

`src/modules/audit/audit.service.ts` + `prisma/migrations/20260528000002_phase6_security/migration.sql`

Every sensitive mutation creates an `AuditLog` entry:

```typescript
// Written on: order status change, user role change, product delete, payment events
{
  userId, userEmail, userRole,
  action: 'ORDER_STATUS_CHANGED',
  entity: 'Order', entityId: order.id,
  before: { status: 'PROCESSING' },
  after:  { status: 'SHIPPED' },
  ipAddress, userAgent
}
```

The table is **append-only** — protected at the PostgreSQL level with a RULE that blocks any `UPDATE` or `DELETE`:

```sql
CREATE RULE audit_log_no_update AS ON UPDATE TO "AuditLog" DO INSTEAD NOTHING;
CREATE RULE audit_log_no_delete AS ON DELETE TO "AuditLog" DO INSTEAD NOTHING;
```

Even if application code has a bug that tries to `DELETE FROM audit_log`, Postgres silently ignores it. This is your defence in fraud disputes.

### RBAC — Role-Based Access Control

`src/common/guards/roles.guard.ts` + `src/common/decorators/roles.decorator.ts`

Three roles in `UserRole` enum: `USER`, `ADMIN`, `VENDOR`.

Usage:
```typescript
@Roles(UserRole.ADMIN)
@Delete('/:id')
deleteProduct(@Param('id') id: string) {}
```

The `RolesGuard` is applied globally after `JwtAuthGuard`. It checks the role from the JWT payload (populated by the `@CurrentUser()` decorator) against the required role for the route.

The `VENDOR` role prepares the schema for marketplace features: a vendor can manage their own products but not others. ABAC (attribute-based) checks like `product.vendorId === user.id` are layered on top of RBAC in the relevant service methods.

### Password Reset with Secure Token

Secure single-use token pattern:
- Token is an HMAC-signed string (userId + timestamp + secret)
- Stored in the DB with a TTL
- Single-use: marked `used` after the first successful reset
- Short expiry (15 minutes)

---

## Key Files

- `apps/auth-service/src/` (entire service)
- `src/modules/audit/audit.service.ts`
- `src/common/guards/roles.guard.ts`
- `src/common/decorators/roles.decorator.ts`
- `prisma/migrations/20260528000002_phase6_security/migration.sql`
- `prisma/schema.prisma` (User: totpSecret, totpEnabled, OAuthAccount model, AuditLog model)

---

## JWT Revocation Trade-Off

JWTs are stateless — there is no server-side session to invalidate. If you ban a user, their JWT remains valid until expiry.

This project uses short access token expiry (15 minutes) + refresh token rotation as the practical solution:
- When a user is banned, their refresh token is revoked in the DB
- Their access token will expire in at most 15 minutes
- Next refresh call fails → they are effectively logged out

The alternative (token revocation list in Redis keyed by `jti` claim) adds a Redis lookup on every request — a trade-off you'd make only if 15-minute windows are unacceptable for your threat model.
