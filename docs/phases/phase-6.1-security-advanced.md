# Phase 6.1 — Security Advanced

**Status:** ✅ Done
**Builds on:** [Phase 6 — Security Depth](./phase-6-security.md)
**Concept cluster:** Encryption at rest for sensitive database fields — complementing the existing bcrypt password hashing and RS256 JWT signing with application-layer column encryption for PII that needs to be readable but not exposed in a DB dump.

See [Phase 6.2 — Privacy & Compliance](./phase-6.2-privacy-compliance.md) for GDPR right-to-erasure.

---

## Encryption at Rest for Sensitive Fields

**What:** Encrypt sensitive `User` columns (`phone`, `dateOfBirth`, `taxId`) using AES-256-GCM at the application layer before writing to Postgres. The database stores ciphertext; the application decrypts on read.

**Why:** Full-disk encryption (handled by cloud providers) protects against physical disk theft. Column-level encryption protects against a compromised DB connection, a SQL injection that dumps rows, or a developer with direct DB read access. If the encryption key is stored separately from the DB (e.g., AWS KMS, environment variable), a DB dump without the key is unreadable.

**Trade-offs to understand:**
- Encrypted columns cannot be used in `WHERE` clauses or indexes — queries must fetch and decrypt in application code. Avoid encrypting fields you need to filter on.
- LIKE / full-text search on encrypted fields is impossible. Reserve column encryption for fields that are read but never searched: phone, SSN, tax ID.
- Key rotation requires re-encrypting every row — design for this from the start (store the key version alongside the ciphertext).

**Approach:**
- Create `EncryptionService` wrapping Node's `crypto.createCipheriv` / `createDecipheriv` with AES-256-GCM.
- Store ciphertext as `{version}:{iv}:{authTag}:{data}` in a single TEXT column — the version prefix enables key rotation without a schema change.
- Prisma middleware (`$use`) intercepts `create` / `update` to encrypt on write and `findUnique` / `findFirst` / `findMany` to decrypt on read.

```typescript
// Simplified middleware shape
prisma.$use(async (params, next) => {
  if (params.model === 'User' && ['create','update'].includes(params.action)) {
    if (params.args.data.phone) {
      params.args.data.phone = encryptionService.encrypt(params.args.data.phone);
    }
  }
  const result = await next(params);
  if (params.model === 'User' && result?.phone) {
    result.phone = encryptionService.decrypt(result.phone);
  }
  return result;
});
```

- Encryption key loaded from `process.env.DB_ENCRYPTION_KEY` (32-byte hex) — never commit to git.
- Add `DB_ENCRYPTION_KEY` to `.env.example` and Kubernetes secrets.

**Key files:**
- `apps/backend/src/modules/encryption/encryption.service.ts` — new AES-256-GCM service
- `apps/backend/src/modules/encryption/encryption.module.ts`
- `apps/backend/src/modules/prisma/prisma.service.ts` — add `$use` middleware
- `apps/backend/.env.example` — add `DB_ENCRYPTION_KEY`
- `k8s/base/infra/secrets.yaml` — add key to Kubernetes Secret
