# Architecture Patterns — Implemented Reference

All patterns from the personal architecture notes (`programmingNotes/Architecture`) have been implemented in this monorepo. This file maps each pattern to its phase doc.

---

## Database Patterns

- **Layered Architecture** (controller → service → Prisma) — all phases
  → [phase-1-database.md](./phases/database/phase-1-database.md)

- **Repository Pattern** (Prisma service abstraction) — all phases
  → [phase-1-database.md](./phases/database/phase-1-database.md)

- **Pessimistic Locking** (`SELECT FOR UPDATE`)
  → [phase-1-database.md](./phases/database/phase-1-database.md)

- **Optimistic Locking** (version field on coupon system)
  → [phase-7-features.md](./phases/api/phase-7-features.md)

- **Vertical Partitioning** (`ProductDetail` hot/cold column split)
  → [phase-1.1-database-advanced.md](./phases/database/phase-1.1-database-advanced.md)

- **Concurrent Index Creation** (non-blocking `CREATE INDEX CONCURRENTLY`)
  → [phase-1.1-database-advanced.md](./phases/database/phase-1.1-database-advanced.md)

- **Batched Migration** (ID-range cursor pattern, avoids NOT IN degradation)
  → [phase-1.1-database-advanced.md](./phases/database/phase-1.1-database-advanced.md)

- **Soft Delete** (`deletedAt` + Prisma middleware auto-filter + 90-day purge cron)
  → [phase-1.1-database-advanced.md](./phases/database/phase-1.1-database-advanced.md)

- **Audit Log** (append-only via PostgreSQL RULE)
  → [phase-6-security.md](./phases/security/phase-6-security.md)

- **Range Partitioning** (`RequestMetric` quarterly partitions)
  → [phase-10-advanced-db.md](./phases/database/phase-10-advanced-db.md)

- **Read Replica** (`ReadReplicaService` routes read queries to replica)
  → [phase-10-advanced-db.md](./phases/database/phase-10-advanced-db.md)

---

## Reliability & Resilience Patterns

- **Idempotency** (`X-Idempotency-Key` deduplication interceptor)
  → [phase-2-reliability.md](./phases/reliability/phase-2-reliability.md)

- **Outbox Pattern** (transactional event publishing via `OutboxService`)
  → [phase-2-reliability.md](./phases/reliability/phase-2-reliability.md)

- **Saga Pattern** (order placement orchestration, `OrderSagaService`)
  → [phase-2-reliability.md](./phases/reliability/phase-2-reliability.md)

- **Circuit Breaker** (opossum wrapping Stripe and Search)
  → [phase-2-reliability.md](./phases/reliability/phase-2-reliability.md)

- **Retry + Exponential Backoff + Jitter** (BullMQ job retry config)
  → [phase-2-reliability.md](./phases/reliability/phase-2-reliability.md)

- **Dead Letter Queue** (failed jobs routed to DLQ for inspection)
  → [phase-2-reliability.md](./phases/reliability/phase-2-reliability.md)

- **Distributed Lock** (Redis SETNX + Lua atomic release, wraps cron jobs and outbox processor)
  → [phase-2.1-resilience-patterns.md](./phases/reliability/phase-2.1-resilience-patterns.md)

- **Bulkhead** (separate `ioredis` instances per concern + `p-limit` concurrency cap on Stripe)
  → [phase-2.1-resilience-patterns.md](./phases/reliability/phase-2.1-resilience-patterns.md)

- **Token Bucket Rate Limiting** (Redis hash + Lua script, burst-tolerant alternative to sliding window)
  → [phase-2.1-resilience-patterns.md](./phases/reliability/phase-2.1-resilience-patterns.md)

- **Fan-In** (`Promise.allSettled` with timeout in `OrderSagaService` fulfillment step)
  → [phase-2.1-resilience-patterns.md](./phases/reliability/phase-2.1-resilience-patterns.md)

- **Graceful Degradation** (search fallback to Postgres FTS, payment retry queue)
  → [phase-9.3-microservices-resilience.md](./phases/microservices/phase-9.3-microservices-resilience.md)

---

## Caching Patterns

- **Cache-Aside** (Redis read-through with TTL)
  → [phase-3-caching.md](./phases/caching/phase-3-caching.md)

- **Cache Stampede Prevention** (SET NX mutex on cache miss)
  → [phase-3-caching.md](./phases/caching/phase-3-caching.md)

- **Rate Limiting — Sliding Window** (Redis sorted set + Lua atomic script)
  → [phase-3-caching.md](./phases/caching/phase-3-caching.md)

- **Write-Through Cache** (product mutations update cache immediately after DB write)
  → [phase-3.1-caching-advanced.md](./phases/caching/phase-3.1-caching-advanced.md)

- **Bloom Filter** (non-existent product ID short-circuit before DB hit)
  → [phase-3.1-caching-advanced.md](./phases/caching/phase-3.1-caching-advanced.md)

- **Negative Caching** (null sentinel TTL prevents repeated DB misses)
  → [phase-3.2-caching-patterns.md](./phases/caching/phase-3.2-caching-patterns.md)

- **Request Coalescing** (singleflight — concurrent identical requests share one DB call)
  → [phase-3.2-caching-patterns.md](./phases/caching/phase-3.2-caching-patterns.md)

- **Refresh-Ahead** (proactive cache warming before TTL expiry)
  → [phase-3.2-caching-patterns.md](./phases/caching/phase-3.2-caching-patterns.md)

---

## Event-Driven & Messaging Patterns

- **Domain Events** (EventEmitter2 for in-process events)
  → [phase-4-events.md](./phases/events/phase-4-events.md)

- **CQRS** (`ProductRating` read model updated asynchronously on review approval)
  → [phase-4-events.md](./phases/events/phase-4-events.md)

- **State Machine** (validated order + return lifecycle transitions)
  → [phase-4-events.md](./phases/events/phase-4-events.md)

- **Pub/Sub** (RabbitMQ topic exchange for cross-service events)
  → [phase-2-reliability.md](./phases/reliability/phase-2-reliability.md)

- **Message Queue / Worker Queue** (BullMQ for background job processing)
  → [phase-2-reliability.md](./phases/reliability/phase-2-reliability.md)

- **Broker Pattern** (RabbitMQ and Kafka as message broker)
  → [phase-4-events.md](./phases/events/phase-4-events.md)

- **Choreography Saga** (review approval flow — no central orchestrator, event-driven)
  → [phase-9.2-microservices-coordination.md](./phases/microservices/phase-9.2-microservices-coordination.md)

- **Inbox / Idempotent Consumer** (exactly-once message processing via `InboxMessage` dedup table)
  → [phase-9.2-microservices-coordination.md](./phases/microservices/phase-9.2-microservices-coordination.md)

- **Order Event Log** (append-only `OrderEvent` table with `GET /orders/:id/events` replay)
  → [phase-9.4-event-architecture.md](./phases/microservices/phase-9.4-event-architecture.md)

- **Event Sourcing** (`OrderProjectionService` folds events to derive state, `OrderSnapshot` for fast reads)
  → [phase-9.5-architectural-patterns.md](./phases/microservices/phase-9.5-architectural-patterns.md)

---

## API & Real-Time Patterns

- **ETag / Conditional Requests** (`304 Not Modified` via `EtagInterceptor`)
  → [phase-7.1-api-advanced.md](./phases/api/phase-7.1-api-advanced.md)

- **Dynamic Sorting + Field Selection** (`?sort=price:asc` and `?fields=id,name`)
  → [phase-7.1-api-advanced.md](./phases/api/phase-7.1-api-advanced.md)

- **SSE Order Status Stream** (`@Sse` + `OrderStatusRegistry` with Redis Pub/Sub for multi-replica)
  → [phase-7.2-realtime.md](./phases/api/phase-7.2-realtime.md)

- **WebSocket Admin Feed** (Socket.IO namespace `/admin/orders`, RS256 auth, Redis adapter)
  → [phase-7.2-realtime.md](./phases/api/phase-7.2-realtime.md)

- **GraphQL** (code-first, additive alongside REST, depth + complexity limits)
  → [phase-7.3-graphql.md](./phases/api/phase-7.3-graphql.md)

- **DataLoader** (N+1 prevention — batches review lookups per GraphQL operation)
  → [phase-7.3-graphql.md](./phases/api/phase-7.3-graphql.md)

- **Automatic Persisted Queries** (APQ — SHA-256 hash replaces full query string, cached in Redis)
  → [phase-7.3-graphql.md](./phases/api/phase-7.3-graphql.md)

- **BFF Aggregation** (`Promise.allSettled` fan-out across 3 backend endpoints in one gateway call)
  → [phase-9.1-microservices-communication.md](./phases/microservices/phase-9.1-microservices-communication.md)

- **gRPC Inter-Service RPC** (proto contract, binary wire format, 2-second hard deadline)
  → [phase-9.1-microservices-communication.md](./phases/microservices/phase-9.1-microservices-communication.md)

---

## Security & Compliance Patterns

- **RS256 JWT + OAuth2 + TOTP 2FA** (auth service handles all auth, backend verifies only)
  → [phase-6-security.md](./phases/security/phase-6-security.md)

- **RBAC** (USER / ADMIN / VENDOR roles via `@Roles()` decorator + `RolesGuard`)
  → [phase-6-security.md](./phases/security/phase-6-security.md)

- **Encryption at Rest** (AES-256-GCM via Prisma middleware, key versioning prefix)
  → [phase-6.1-security-advanced.md](./phases/security/phase-6.1-security-advanced.md)

- **GDPR Right-to-Erasure** (7-day grace period → background anonymization → hash-based pseudonymization)
  → [phase-6.2-privacy-compliance.md](./phases/security/phase-6.2-privacy-compliance.md)

---

## Microservices & Distributed Systems Patterns

- **Strangler Fig** (notification, search, auth extracted from monolith incrementally)
  → [phase-9-microservices.md](./phases/microservices/phase-9-microservices.md)

- **Database per Service** (each microservice owns its own schema/DB)
  → [phase-9-microservices.md](./phases/microservices/phase-9-microservices.md)

- **API Gateway** (JWT verify + header injection + HTTP proxy routing)
  → [phase-9-microservices.md](./phases/microservices/phase-9-microservices.md)

- **Sidecar** (Istio injects Envoy proxy sidecars for mTLS + observability)
  → [phase-11-kubernetes.md](./phases/kubernetes/phase-11-kubernetes.md)

- **Leader Election** (long-lived Redis lease — only one pod runs `@Cron()` across replicas)
  → [phase-8.1-deployment-advanced.md](./phases/cicd/phase-8.1-deployment-advanced.md)

---

## Infrastructure & Operational Patterns

- **Feature Flags** (Postgres table + Redis cache + per-user rollout % bucketing)
  → [phase-2.1-resilience-patterns.md](./phases/reliability/phase-2.1-resilience-patterns.md)

- **Blue-Green Deployment** (GitHub Actions, zero-downtime traffic switch)
  → [phase-8-cicd.md](./phases/cicd/phase-8-cicd.md)

- **Canary Deployment** (Argo Rollouts + Istio weighted traffic + Prometheus `CanaryAnalysis`)
  → [phase-8.1-deployment-advanced.md](./phases/cicd/phase-8.1-deployment-advanced.md)

- **Health Checks** (NestJS Terminus — DB, Redis, RabbitMQ liveness)
  → [phase-0-infra.md](./phases/infrastructure/phase-0-infra.md)

- **Graceful Shutdown** (SIGTERM handler drains in-flight requests before closing)
  → [phase-0-infra.md](./phases/infrastructure/phase-0-infra.md)

- **Connection Pooling** (PgBouncer in transaction mode)
  → [phase-0-infra.md](./phases/infrastructure/phase-0-infra.md)

- **Distributed Tracing** (OpenTelemetry auto-instrumentation + Jaeger)
  → [phase-5-observability.md](./phases/observability/phase-5-observability.md)

---

## Architectural Patterns

- **Rule-Based Architecture** (DB-driven `PromotionRule` table evaluated by `RulesEngineService` at runtime)
  → [phase-7.4-business-rules.md](./phases/api/phase-7.4-business-rules.md)

- **Interpreter / DSL** (Lexer → Parser → AST → Interpreter for human-readable discount rules)
  → [phase-7.4-business-rules.md](./phases/api/phase-7.4-business-rules.md)

- **Microkernel** (`IPaymentProvider` interface + `PaymentPluginRegistry` — swap providers without touching saga)
  → [phase-9.5-architectural-patterns.md](./phases/microservices/phase-9.5-architectural-patterns.md)

- **Pipe and Filter** (11-step `IOrderFilter` pipeline replacing monolithic `OrderSagaService`)
  → [phase-9.5-architectural-patterns.md](./phases/microservices/phase-9.5-architectural-patterns.md)

---

## Patterns from Notes That Don't Apply Here

Not relevant for a web e-commerce monorepo:

- **Sensor-Controller-Actuator** — hardware/IoT domain
- **Peer-to-Peer** — decentralized network topology
- **Blackboard** — AI/expert system problem-solving
- **Space-Based Architecture** — tuple-space concurrency model, overkill
- **Master-Slave (MapReduce style)** — large-scale data pipeline use case
- **Database-Centric** — already moved past this style
- **Reflection** — used internally by NestJS/TypeScript, no standalone impl needed
