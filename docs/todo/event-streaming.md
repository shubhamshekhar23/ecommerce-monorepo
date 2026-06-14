# Event Streaming & Data Platform

Advanced event-driven architecture beyond the current RabbitMQ setup. RabbitMQ handles task queues and notifications; Kafka handles durable logs, CDC, analytics, and replay.

---

## CDC + Debezium — Postgres-to-Kafka Change Stream

**What:** Stream every row-level change in the Postgres primary to a Kafka topic via Debezium so downstream consumers (search, analytics, ML) get a real-time, replayable feed without polling the DB.

**Current state:** Search indexing and product sync are done via direct DB calls or RabbitMQ events from the application layer. There is no WAL-based change capture — if a row changes outside the app (migration, manual fix, bulk update), downstream systems fall out of sync silently.

**Why Kafka, not RabbitMQ:** Kafka is a durable log. Consumers track their own offset and can replay from any point. RabbitMQ is push-based: messages are gone once consumed. CDC requires replay (re-indexing, backfill) — only a log store supports that.

**Why Debezium, not outbox events:** Debezium reads the Postgres WAL directly so every change is captured regardless of where it came from. The outbox pattern captures only app-initiated changes.

**Implementation plan:**

- Deploy Kafka (Confluent or Redpanda) and Kafka Connect alongside the existing stack
- Deploy Debezium PostgreSQL connector pointed at the primary; configure WAL level to `logical`
- Debezium emits to topics: `ecommerce.public.products`, `ecommerce.public.orders`, `ecommerce.public.inventory`, etc.
- `search-service` consumes `ecommerce.public.products` with offset tracking — replaces current polling or RabbitMQ event
- Retain RabbitMQ for: email/notification jobs, BullMQ-style task queues, payment webhook processing — these are push tasks, not log consumption
- Add Kafka UI (Redpanda Console or Akhq) to the local Docker Compose for development visibility

**References:** `apps/search-service/`, `apps/notification-service/`, `docker-compose.yml`, Debezium PostgreSQL connector docs

---

## Analytics Service & Recommendations Engine

**What:** Build a dedicated analytics consumer that reads from Kafka topics and powers a recommendations engine (collaborative filtering or item-based similarity).

**Current state:** No analytics pipeline exists beyond the Prometheus business metrics in `BusinessMetricsService`. Order and product interaction data is stored in Postgres but never used for recommendations.

**Why it belongs here:** Once CDC is in place, the Kafka topics are the natural input to an analytics consumer. The analytics service reads from those topics, writes to a columnar store (ClickHouse or TimescaleDB), and exposes recommendation endpoints to the backend.

**Implementation plan:**

- Stand up ClickHouse or TimescaleDB as the analytics store
- Build `apps/analytics-service` (NestJS or Python) that consumes Kafka topics for order events, product views, and cart interactions
- Implement item-based collaborative filtering: products frequently bought together by the same users
- Expose a `GET /recommendations?userId=&productId=` endpoint consumed by the products module
- Wire recommendations into product detail responses in `apps/backend`
- Add A/B testing hook: record which recommendation variant was shown and track conversion

**References:** `apps/backend/src/modules/products/`, `apps/backend/src/modules/orders/`, Kafka consumer group docs