- nestjs
- monorepo, workspace, node_modules hoisting, legacy-peer-deps
- microservices, service extraction
- swagger docs, @ApiProperty, decorator-based
- prisma, migrate, deploy, prisma generate, schema.prisma
- typescript, strict mode, class-validator, class-transformer

---

- docker, dockerfile, docker-compose, container, image, volume, multi-stage build, alpine linux
- nginx, ssl termination, gzip, upstream.conf, reverse proxy, security headers, blue-green routing
- blue-green deployment, zero-downtime deploy
- graceful shutdown
- health check, terminus, readiness probe, liveness probe
- github actions, CI/CD pipeline, lint → type-check → build → push
- migration safety check (blocks DROP COLUMN, RENAME TABLE in CI)
- automated db backups
- husky, lint-staged, pre-commit hook, prettier

---

- postgresql
- pgbouncer, connection pooling, pgbouncer=true in DATABASE_URL
- schema migration, expand, backfill, deploy, contract, zero-downtime
- product variants schema: normalized, Attribute, AttributeOption, VariantAttributeValue, composite FK
- primary key, composite primary key
- jsonb, jsonb snapshot (order items snapshot, shipping address snapshot)
- full text search, tsvector, tsquery, plainto_tsquery, ts_rank, stemming, lexemes
- b-tree index, composite b-tree, GIN index, partial index
- cursor-based pagination vs offset, keyset pagination, encode/decode cursor token
- pessimistic row locking, SELECT FOR UPDATE, row-level lock, transaction
- pg_stat_statements, slow query analysis, getSlowQueries, getTableStats
- table partitioning, range partitioning, quarterly partitions, RequestMetric
- streaming replication, read replica, WAL, async replication, replication lag, pg_basebackup, standby.signal
- VACUUM, bloat monitoring, dead tuples
- ReadReplicaService, manual read routing (analytics → replica, writes → primary)

---

- idempotency key, X-Idempotency-Key, interceptor, duplicate request prevention
- outbox pattern, dual write problem, FOR UPDATE SKIP LOCKED, atomic event publishing
- saga pattern, compensating transaction, rollback on failure
- circuit breaker, opossum, closed / open / half-open states, error rate threshold
- retry, exponential backoff, jitter
- dead letter queue, DLQ, exhausted retries
- stripe, webhook, signature verification, WebhookEvent deduplication

---

- redis: cache-aside, lazy loading, TTL
- cache invalidation, SCAN, pattern-based (products:\*), no KEYS command
- cache stampede, SET NX PX, mutex lock, double-checked locking, Lua atomic unlock
- noeviction policy (BullMQ jobs must never be evicted)
- rate limiting, sliding window, redis sorted set, Lua script, HTTP 429
- order read model cache (CQRS), pre-built response, 1-hour TTL

---

- domain event vs integration event
- EventEmitter2, @OnEvent decorator, in-process events (loose coupling)
- BullMQ, redis-backed queue, scheduled task (cart recovery), fan-out, concurrency, retry with jitter
- RabbitMQ, exchanges (user.events, order.events, product.events), queues, DLQ, consumer pattern
- outbox → rabbitmq reliable delivery; order.placed published via outbox, not direct emit
- CQRS, read model (ProductRating), write model (ProductReview), materialized aggregate
- order state machine, transition map Record<OrderStatus, OrderStatus[]>, BadRequestException on invalid transition
- optimistic locking, version field, lost update prevention (coupons)

---

- Observability:
  - nestjs-pino, structured JSON logging, stdout
  - promtail (docker socket), loki, log aggregation, searchable by requestId / traceId
  - opentelemetry, auto-instrumentation (nestjs, prisma, redis, bullmq, http), traces, spans, OTLP exporter
  - jaeger, waterfall view, distributed tracing, span context propagation via HTTP headers
  - prometheus, prom-client, pgbouncer-exporter
  - node metrics (cpu, memory, event loop lag), business metrics (orders_total, payment_events, inventory_failures), http metrics (duration histogram per route), p95, p99
  - grafana, RED dashboard (rate/errors/duration), business dashboard, db dashboard, infrastructure dashboard
  - correlation ID, X-Request-ID, AsyncLocalStorage, requestId injected into every log line
  - three pillars: logs → loki (what happened), metrics → prometheus (how often/how much), traces → jaeger (where was time spent)
  - metric label cardinality: group /api/products/:id not /api/products/123 — avoids metric explosion

---

- RS256 JWT, asymmetric signing, private key (auth signs), public key (all services verify)
- OAuth2, authorization code flow, PKCE, passport-google-oauth20, OAuthAccount model
- TOTP 2FA, otplib, QR code, Google Authenticator, time-based 30-second window
- audit log, append-only, PostgreSQL RULE (blocks UPDATE/DELETE at db level)
- RBAC, @Roles decorator, roles guard, UserRole: USER / ADMIN / VENDOR
- access token (15 min), refresh token (7 days), token revocation
- helmet, CORS, class-validator validation pipe, bcrypt password hashing

---

- address snapshot (JSONB on Order, not FK — preserves historical shipping address on receipts)
- coupon system, optimistic locking (race-safe usage count, version check)
- shipping calculation
- tax engine, rules engine, first-match priority evaluation
- product reviews, moderation workflow (PENDING → APPROVED / REJECTED)
- back-in-stock alerts, fan-out queue (one job per subscriber via BullMQ)
- return/refund workflow, state machine (PENDING → APPROVED → REFUNDED, PENDING → REJECTED)
- PDF invoice generation, pdfkit, background job

---

- notification service (RabbitMQ consumer, handlebars email templates, mailpit SMTP)
- search service (OpenSearch, fuzzy multi-match, full-text indexing, RabbitMQ consumer)
- auth service (RS256 JWT, 2FA, OAuth, own redis for sessions)
- api gateway (JWT verify at edge, header injection X-User-Id / X-User-Email, HTTP proxy routing per service)
- OpenSearch, fuzzy multi-match, index vs update vs delete event handling
