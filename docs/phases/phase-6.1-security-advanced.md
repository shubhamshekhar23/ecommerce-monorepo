# Phase 6.1 — Security Advanced

**Status:** 🔲 Pending
**Builds on:** [Phase 6 — Security Depth](./phase-6-security.md)
**Concept cluster:** The soft-delete added in Phase 1 backfill deactivates accounts but leaves all PII in the database indefinitely. GDPR Article 17 requires the ability to erase it on request.

---

## GDPR Right-to-Erasure Endpoint

**What:** Add `DELETE /users/me/data` that anonymizes the requesting user's PII (name, email, phone, addresses) while preserving order history intact for accounting and audit requirements.

**Why:** Under GDPR Article 17, EU users have the legal right to demand erasure of their personal data. The correct implementation is NOT to delete the `User` row (which would orphan all orders with broken foreign keys), but to anonymize PII fields — replace them with non-identifiable values. The order records themselves are retained because financial records have their own legal retention requirement that overrides the erasure right.

**Approach:**

```typescript
async eraseUserData(userId: string): Promise<void> {
  await this.prisma.$transaction([
    this.prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted+${userId}@erased.invalid`,
        firstName: '[Deleted]',
        lastName: '[Deleted]',
        phone: null,
        deletedAt: new Date(),
        isActive: false,
      },
    }),
    this.prisma.address.deleteMany({ where: { userId } }),
    this.prisma.refreshToken.deleteMany({ where: { userId } }),
  ]);
  await this.auditService.log(userId, 'USER_DATA_ERASED', {});
}
```

- Require current password confirmation in the request body to prevent CSRF-triggered erasure.
- The audit log entry is the GDPR compliance proof that the erasure was performed and when.
- `Order` rows are retained — the `userId` FK now points to an anonymized user row (name `[Deleted]`, email `deleted+{id}@erased.invalid`).

**Key files:**
- `apps/backend/src/modules/users/users.service.ts` — add `eraseUserData()`
- `apps/backend/src/modules/users/users.controller.ts` — `DELETE /users/me/data` with `@UseGuards(JwtAuthGuard)`
- `apps/backend/src/modules/users/dto/confirm-erasure.dto.ts` — body with `password: string`
- `apps/backend/src/modules/audit/audit.service.ts` — log the erasure event
