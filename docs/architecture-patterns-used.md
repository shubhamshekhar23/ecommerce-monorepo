# Architecture Patterns — Implemented Reference

All patterns from the personal architecture notes (`programmingNotes/Architecture`) have been implemented in this monorepo. This file maps each pattern to its phase doc.

---

## Database Patterns

- **Layered Architecture** (controller → service → Prisma) — all phases
  → [database.md](./references/database/database.md)

- **Repository Pattern** (Prisma service abstraction) — all phases
  → [database.md](./references/database/database.md)

- **Pessimistic Locking** (`SELECT FOR UPDATE`)
  → [database.md](./references/database/database.md)

- **Optimistic Locking** (version field on coupon system)
  → [features.md](./references/api/features.md)

- **Vertical Partitioning** (`ProductDetail` hot/cold column split)
  → [database-advanced.md](./references/database/database-advanced.md)

- **Concurrent Index Creation** (non-blocking `CREATE INDEX CONCURRENTLY`)
  → [database-advanced.md](./references/database/database-advanced.md)

- **Batched Migration** (ID-range cursor pattern, avoids NOT IN degradation)
  → [database-advanced.md](./references/database/database-advanced.md)

- **Soft Delete** (`deletedAt` + Prisma middleware auto-filter + 90-day purge cron)
  → [database-advanced.md](./references/database/database-advanced.md)

- **Audit Log** (append-only via PostgreSQL RULE)
  → [security.md](./references/security/security.md)

- **Range Partitioning** (`RequestMetric` quarterly partitions)
  → [advanced-db.md](./references/database/advanced-db.md)

- **Read Replica** (`ReadReplicaService` routes read queries to replica)
  → [advanced-db.md](./references/database/advanced-db.md)

---

## Reliability & Resilience Patterns

- **Idempotency** (`X-Idempotency-Key` deduplication interceptor)
  → [reliability.md](./references/reliability/reliability.md)

- **Outbox Pattern** (transactional event publishing via `OutboxService`)
  → [reliability.md](./references/reliability/reliability.md)

- **Saga Pattern** (order placement orchestration, `OrderSagaService`)
  → [reliability.md](./references/reliability/reliability.md)

- **Circuit Breaker** (opossum wrapping Stripe and Search)
  → [reliability.md](./references/reliability/reliability.md)

- **Retry + Exponential Backoff + Jitter** (BullMQ job retry config)
  → [reliability.md](./references/reliability/reliability.md)

- **Dead Letter Queue** (failed jobs routed to DLQ for inspection)
  → [reliability.md](./references/reliability/reliability.md)

- **Distributed Lock** (Redis SETNX + Lua atomic release, wraps cron jobs and outbox processor)
  → [resilience-patterns.md](./references/reliability/resilience-patterns.md)

- **Bulkhead** (separate `ioredis` instances per concern + `p-limit` concurrency cap on Stripe)
  → [resilience-patterns.md](./references/reliability/resilience-patterns.md)

- **Token Bucket Rate Limiting** (Redis hash + Lua script, burst-tolerant alternative to sliding window)
  → [resilience-patterns.md](./references/reliability/resilience-patterns.md)

- **Fan-In** (`Promise.allSettled` with timeout in `OrderSagaService` fulfillment step)
  → [resilience-patterns.md](./references/reliability/resilience-patterns.md)

- **Graceful Degradation** (search fallback to Postgres FTS, payment retry queue)
  → [resilience.md](./references/microservices/resilience.md)

---

## Caching Patterns

- **Cache-Aside** (Redis read-through with TTL)
  → [caching.md](./references/caching/caching.md)

- **Cache Stampede Prevention** (SET NX mutex on cache miss)
  → [caching.md](./references/caching/caching.md)

- **Rate Limiting — Sliding Window** (Redis sorted set + Lua atomic script)
  → [caching.md](./references/caching/caching.md)

- **Write-Through Cache** (product mutations update cache immediately after DB write)
  → [caching-advanced.md](./references/caching/caching-advanced.md)

- **Bloom Filter** (non-existent product ID short-circuit before DB hit)
  → [caching-advanced.md](./references/caching/caching-advanced.md)

- **Negative Caching** (null sentinel TTL prevents repeated DB misses)
  → [caching-patterns.md](./references/caching/caching-patterns.md)

- **Request Coalescing** (singleflight — concurrent identical requests share one DB call)
  → [caching-patterns.md](./references/caching/caching-patterns.md)

- **Refresh-Ahead** (proactive cache warming before TTL expiry)
  → [caching-patterns.md](./references/caching/caching-patterns.md)

---

## Event-Driven & Messaging Patterns

- **Domain Events** (EventEmitter2 for in-process events)
  → [events.md](./references/events/events.md)

- **CQRS** (`ProductRating` read model updated asynchronously on review approval)
  → [events.md](./references/events/events.md)

- **State Machine** (validated order + return lifecycle transitions)
  → [events.md](./references/events/events.md)

- **Pub/Sub** (RabbitMQ topic exchange for cross-service events)
  → [reliability.md](./references/reliability/reliability.md)

- **Message Queue / Worker Queue** (BullMQ for background job processing)
  → [reliability.md](./references/reliability/reliability.md)

- **Broker Pattern** (RabbitMQ and Kafka as message broker)
  → [events.md](./references/events/events.md)

- **Choreography Saga** (review approval flow — no central orchestrator, event-driven)
  → [coordination.md](./references/microservices/coordination.md)

- **Inbox / Idempotent Consumer** (exactly-once message processing via `InboxMessage` dedup table)
  → [coordination.md](./references/microservices/coordination.md)

- **Order Event Log** (append-only `OrderEvent` table with `GET /orders/:id/events` replay)
  → [event-architecture.md](./references/microservices/event-architecture.md)

- **Event Sourcing** (`OrderProjectionService` folds events to derive state, `OrderSnapshot` for fast reads)
  → [architectural-patterns.md](./references/microservices/architectural-patterns.md)

---

## API & Real-Time Patterns

- **ETag / Conditional Requests** (`304 Not Modified` via `EtagInterceptor`)
  → [api-advanced.md](./references/api/api-advanced.md)

- **Dynamic Sorting + Field Selection** (`?sort=price:asc` and `?fields=id,name`)
  → [api-advanced.md](./references/api/api-advanced.md)

- **SSE Order Status Stream** (`@Sse` + `OrderStatusRegistry` with Redis Pub/Sub for multi-replica)
  → [realtime.md](./references/api/realtime.md)

- **WebSocket Admin Feed** (Socket.IO namespace `/admin/orders`, RS256 auth, Redis adapter)
  → [realtime.md](./references/api/realtime.md)

- **GraphQL** (code-first, additive alongside REST, depth + complexity limits)
  → [graphql.md](./references/api/graphql.md)

- **DataLoader** (N+1 prevention — batches review lookups per GraphQL operation)
  → [graphql.md](./references/api/graphql.md)

- **Automatic Persisted Queries** (APQ — SHA-256 hash replaces full query string, cached in Redis)
  → [graphql.md](./references/api/graphql.md)

- **BFF Aggregation** (`Promise.allSettled` fan-out across 3 backend endpoints in one gateway call)
  → [communication.md](./references/microservices/communication.md)

- **gRPC Inter-Service RPC** (proto contract, binary wire format, 2-second hard deadline)
  → [communication.md](./references/microservices/communication.md)

---

## Security & Compliance Patterns

- **RS256 JWT + OAuth2 + TOTP 2FA** (auth service handles all auth, backend verifies only)
  → [security.md](./references/security/security.md)

- **RBAC** (USER / ADMIN / VENDOR roles via `@Roles()` decorator + `RolesGuard`)
  → [security.md](./references/security/security.md)

- **Encryption at Rest** (AES-256-GCM via Prisma middleware, key versioning prefix)
  → [security-advanced.md](./references/security/security-advanced.md)

- **GDPR Right-to-Erasure** (7-day grace period → background anonymization → hash-based pseudonymization)
  → [privacy-compliance.md](./references/security/privacy-compliance.md)

---

## Microservices & Distributed Systems Patterns

- **Strangler Fig** (notification, search, auth extracted from monolith incrementally)
  → [microservices.md](./references/microservices/microservices.md)

- **Database per Service** (each microservice owns its own schema/DB)
  → [microservices.md](./references/microservices/microservices.md)

- **API Gateway** (JWT verify + header injection + HTTP proxy routing)
  → [microservices.md](./references/microservices/microservices.md)

- **Sidecar** (Istio injects Envoy proxy sidecars for mTLS + observability)
  → [kubernetes.md](./references/kubernetes/kubernetes.md)

- **Leader Election** (long-lived Redis lease — only one pod runs `@Cron()` across replicas)
  → [deployment-advanced.md](./references/cicd/deployment-advanced.md)

---

## Infrastructure & Operational Patterns

- **Feature Flags** (Postgres table + Redis cache + per-user rollout % bucketing)
  → [resilience-patterns.md](./references/reliability/resilience-patterns.md)

- **Blue-Green Deployment** (GitHub Actions, zero-downtime traffic switch)
  → [cicd.md](./references/cicd/cicd.md)

- **Canary Deployment** (Argo Rollouts + Istio weighted traffic + Prometheus `CanaryAnalysis`)
  → [deployment-advanced.md](./references/cicd/deployment-advanced.md)

- **Health Checks** (NestJS Terminus — DB, Redis, RabbitMQ liveness)
  → [infra.md](./references/infrastructure/infra.md)

- **Graceful Shutdown** (SIGTERM handler drains in-flight requests before closing)
  → [infra.md](./references/infrastructure/infra.md)

- **Connection Pooling** (PgBouncer in transaction mode)
  → [infra.md](./references/infrastructure/infra.md)

- **Distributed Tracing** (OpenTelemetry auto-instrumentation + Jaeger)
  → [observability.md](./references/observability/observability.md)

---

## Architectural Patterns

- **Rule-Based Architecture** (DB-driven `PromotionRule` table evaluated by `RulesEngineService` at runtime)
  → [business-rules.md](./references/api/business-rules.md)

- **Interpreter / DSL** (Lexer → Parser → AST → Interpreter for human-readable discount rules)
  → [business-rules.md](./references/api/business-rules.md)

- **Microkernel** (`IPaymentProvider` interface + `PaymentPluginRegistry` — swap providers without touching saga)
  → [architectural-patterns.md](./references/microservices/architectural-patterns.md)

- **Pipe and Filter** (11-step `IOrderFilter` pipeline replacing monolithic `OrderSagaService`)
  → [architectural-patterns.md](./references/microservices/architectural-patterns.md)

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
