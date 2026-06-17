# Phase 9.2 — Microservices: Coordination

**Status:** ✅ Done
**Builds on:** [Phase 9.1 — Microservices: Communication](./phase-9.1-microservices-communication.md)
**Concept cluster:** Two patterns for coordinating work across services without tight coupling — choreography-based sagas where each service reacts to events independently, and the Inbox pattern that makes message consumers idempotent so duplicate deliveries are safe.

---

## Saga Choreography — Review Approval Flow

**What:** Implement the review moderation flow as a choreography saga — each service reacts to domain events with no central orchestrator knowing the sequence.

**Choreography vs Orchestration:**

| | Choreography (this item) | Orchestration |
|---|---|---|
| Who knows the flow | Nobody — it emerges from event subscriptions | Central orchestrator |
| Coupling | Services only know about events | Services know about the orchestrator |
| Failure visibility | Hard — distributed across logs | Easy — orchestrator tracks state |
| Use here | Review approval (low coordination complexity) | Order placement saga (already orchestrated) |

Neither is universally better. Choreography is simpler for flows with 2–3 participants; orchestration is better when you need a single source of truth for saga state.

**Flow:**
```
ReviewService emits → review.approved
  → ProductService:      recalculate avgRating + reviewCount
  → NotificationService: email reviewer "Your review is live"
  → AuditService:        log the approval event
```

**Approach:**
- Define `ReviewApprovedEvent` and `ReviewRejectedEvent` in `@ecommerce/shared-types`.
- `ReviewsService.approve()` publishes to RabbitMQ exchange `review.events`, routing key `review.approved`.
- Each subscriber handles its own concern independently — `ProductsService`, `NotificationService`, and `AuditService` each `@RabbitSubscribe` to `review.events`.
- Each subscriber must be idempotent (see Inbox Pattern below) — RabbitMQ delivers at-least-once, so duplicate events must be safe.

**Key files:**
- `packages/shared-types/src/events/review.events.ts` — new event types
- `apps/backend/src/modules/reviews/reviews.service.ts` — publish on state change
- `apps/backend/src/modules/products/products.service.ts` — subscribe, recalculate rating
- `apps/notification-service/src/` — subscribe, send approval/rejection email

---

## Inbox Pattern — Idempotent Message Consumers

**What:** Track consumed message IDs in an `InboxMessage` table so that redelivered or duplicate RabbitMQ messages are processed exactly once — not at-least-once.

**Why:** RabbitMQ guarantees at-least-once delivery. A network blip between the consumer's `ack` and the handler completing can cause the same message to be delivered twice. Without deduplication, the review-approval choreography above could double-send emails, double-credit ratings, or double-log audit events.

**How it differs from the Outbox pattern:**
- **Outbox** (already implemented): ensures a message is published at-least-once by writing it to a DB table before the queue.
- **Inbox**: ensures a received message is processed at-most-once by recording its ID in a DB table before handling it.
- Together, Outbox + Inbox = exactly-once semantics end-to-end.

**Approach:**
- Add `InboxMessage` model to `schema.prisma`: `{ messageId String @id, processedAt DateTime }`.
- Create `InboxService.isProcessed(messageId): Promise<boolean>` and `markProcessed(messageId): Promise<void>`.
- Wrap every `@RabbitSubscribe` handler:

```typescript
async handleReviewApproved(event: ReviewApprovedEvent): Promise<void> {
  const messageId = event.messageId; // must be set by publisher
  if (await this.inboxService.isProcessed(messageId)) return;

  // Handle the event
  await this.recalculateRating(event.productId);

  await this.inboxService.markProcessed(messageId); // idempotency fence
}
```

- `markProcessed` uses an upsert (or INSERT ON CONFLICT DO NOTHING) so concurrent duplicate deliveries don't race.
- Purge `InboxMessage` rows older than 7 days via a scheduled cleanup job (they're only needed during the redelivery window).

**Key files:**
- `apps/backend/prisma/schema.prisma` — add `InboxMessage` model
- `apps/backend/prisma/migrations/<timestamp>_inbox_message/migration.sql`
- `apps/backend/src/modules/inbox/inbox.service.ts` — new service
- `apps/backend/src/modules/inbox/inbox.module.ts`
- `apps/backend/src/modules/products/products.service.ts` — wrap review handler
- `apps/notification-service/src/` — wrap email handler
