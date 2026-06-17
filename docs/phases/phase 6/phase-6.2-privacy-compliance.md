# Phase 6.2 — Privacy & Compliance

**Status:** ✅ Done
**Builds on:** [Phase 6.1 — Security Advanced](./phase-6.1-security-advanced.md)
**Concept cluster:** GDPR right-to-erasure — the soft-delete added in Phase 1 backfill deactivates accounts but leaves all PII in the database indefinitely. Article 17 requires the ability to erase it on request, with a grace period before the irreversible step.

---

## GDPR Right-to-Erasure Endpoint

**What:** Add `DELETE /users/me/data` that anonymizes the requesting user's PII (name, email, phone, addresses) while preserving order history for accounting. Includes a grace period — anonymization is scheduled, not immediate, giving the user a window to cancel.

**Why:** Under GDPR Article 17, EU users have the legal right to demand erasure of personal data. The correct implementation is NOT to delete the `User` row (which would orphan orders), but to anonymize PII fields. Financial records (orders) have their own legal retention requirement that overrides the erasure right, so they are kept with the now-anonymized user reference.

**Two-phase approach (grace period):**

Phase 1 — Schedule (`DELETE /users/me/data` with password confirmation):
- Create a `DataErasureRequest` record: `{ userId, requestedAt, scheduledAt: now + 7 days, status: PENDING }`.
- Send a confirmation email: "Your data will be erased on {date}. Cancel at DELETE /users/me/data/cancel".
- Return `202 Accepted`.

Phase 2 — Execute (background job runs at `scheduledAt`):
- If `status` is still `PENDING` (not cancelled), run the anonymization:

```typescript
await this.prisma.$transaction([
  this.prisma.user.update({
    where: { id: userId },
    data: {
      email: `erased.${createHash('sha256').update(userId).digest('hex').slice(0, 12)}@deleted.invalid`,
      firstName: '[Deleted]',
      lastName: '[Deleted]',
      phone: null,
      deletedAt: new Date(),
      isActive: false,
    },
  }),
  this.prisma.address.deleteMany({ where: { userId } }),
  this.prisma.refreshToken.deleteMany({ where: { userId } }),
  this.prisma.dataErasureRequest.update({
    where: { userId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  }),
]);
await this.auditService.log(userId, 'USER_DATA_ERASED', { scheduledAt });
```

**Why hash instead of exposing userId:**
- `erased.{sha256(userId).slice(12)}@deleted.invalid` — the email is unique and deterministic but does not leak the user's ID to anyone who reads the DB row.
- Storing `deleted+{userId}@erased.invalid` exposes the user's internal ID in a column that may appear in logs or exports.

**Key files:**
- `apps/backend/prisma/schema.prisma` — add `DataErasureRequest` model
- `apps/backend/prisma/migrations/<timestamp>_data_erasure_request/migration.sql`
- `apps/backend/src/modules/users/users.service.ts` — `scheduleErasure()` and `cancelErasure()`
- `apps/backend/src/modules/users/users.controller.ts` — `DELETE /users/me/data`, `DELETE /users/me/data/cancel`
- `apps/backend/src/modules/users/users.module.ts` — register BullMQ queue for erasure job
- `apps/backend/src/modules/users/erasure.processor.ts` — new BullMQ processor
- `apps/backend/src/modules/users/dto/confirm-erasure.dto.ts` — body with `password: string`
- `apps/backend/src/modules/audit/audit.service.ts` — log the erasure event
