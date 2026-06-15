# Event Streaming & Data Platform

Advanced event-driven architecture beyond the current RabbitMQ setup. RabbitMQ handles task queues and notifications; Kafka handles durable logs, CDC, analytics, and replay.

---

## CDC + Debezium — Postgres-to-Kafka Change Stream ✅ Done (2026-06-15)

**What:** Stream every row-level change in the Postgres primary to a Kafka topic via Debezium so downstream consumers (search, analytics, ML) get a real-time, replayable feed without polling the DB.

**Status:** Implemented. Redpanda (Kafka-compatible, no Zookeeper), Kafka Connect with Debezium 2.7, and a one-shot `connector-init` service are all wired into `docker-compose.yml`. Postgres WAL level changed to `logical` with `max_replication_slots=5`. Debezium connector config is at `infra/debezium/connector.json` — watches `public.Product`, emits to `ecommerce.public.Product`. `search-service` CDC consumer (`CdcConsumer`) replaces the old `ProductConsumer` and uses `kafkajs` to subscribe and index changes into OpenSearch. RabbitMQ dependency removed from search-service entirely.

**Architecture decisions:**
- Redpanda (not Confluent Kafka): Kafka-API-compatible, no Zookeeper, single binary — right for dev
- `value.converter.schemas.enable=false`: Debezium emits plain JSON `{ op, before, after }` envelope — no Avro registry needed for dev
- `snapshot.mode=initial`: on first start, Debezium snapshots all existing `Product` rows before streaming WAL changes — existing products get indexed without a manual backfill
- Price field: `Product` table has no `price` column (it lives on `ProductVariant`). CDC consumer sets `price: 0` in the search index; real prices come from the backend API on product fetch
- RabbitMQ retained for: backend BullMQ queues, notification-service email jobs, auth-service events — push tasks, not log consumption

**Previous state:** `search-service` consumed `product.events` exchange via `@golevelup/nestjs-rabbitmq`. No WAL capture — changes from migrations, bulk updates, or admin DB access would silently fall out of sync.

**Key files:**
- `docker-compose.yml` — redpanda, redpanda-console, kafka-connect, connector-init services; postgres wal_level=logical
- `infra/debezium/connector.json` — Debezium connector config
- `apps/search-service/src/search/consumers/cdc.consumer.ts` — kafkajs consumer, Debezium envelope parser
- `apps/search-service/src/search/search.module.ts` — CdcConsumer registered
- `apps/search-service/src/app.module.ts` — RabbitMQModule removed
- `apps/search-service/package.json` — kafkajs added, @golevelup/nestjs-rabbitmq removed

**To start the full stack:** `docker compose up -d` — connector-init runs once and registers the Debezium connector. Browse topics at http://localhost:8080 (Redpanda Console). Kafka Connect API at http://localhost:8083.

**References:** `apps/search-service/`, `docker-compose.yml`, `infra/debezium/`, Debezium PostgreSQL connector docs

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