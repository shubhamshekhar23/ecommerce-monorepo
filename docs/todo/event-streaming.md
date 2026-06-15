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

## Analytics Service & Recommendations Engine ✅ Done (2026-06-15)

**What:** Dedicated analytics consumer that reads from Kafka and powers an item-based co-purchase recommendation engine.

**Status:** Implemented. `apps/analytics-service` is a new NestJS service with four layers:

- `OrderConsumer` — kafkajs consumer on `order.placed` topic; parses `AnalyticsOrderEvent` and inserts rows into ClickHouse
- `ClickhouseService` — creates `order_items` table on boot; exposes `insertOrderItems` and `getCoPurchasePairs` (co-purchase aggregate query)
- `CoPurchaseJob` — `@Cron` every 5 minutes: queries ClickHouse for product-pair co-occurrence counts → bulk-writes to Redis sorted sets (`ZADD recs:product:{id} score partnerId`)
- `RecommendationsController` — `GET /api/recommendations/products/:id` → `ZREVRANGE` top-5 from Redis

Backend publishes `AnalyticsOrderEvent` to Kafka topic `order.placed` via `KafkaProducerService` + `OrderAnalyticsHandler` (listens to existing `order.created` EventEmitter event). This keeps the orders service unaware of Kafka — the handler is a side-effect listener.

ClickHouse (single-node, `24.3-alpine`) and `analytics-service` added to docker-compose. Gateway proxies `/api/recommendations/**` → analytics-service.

**Why ClickHouse:** Orders table is OLTP (row-store). The co-purchase aggregation (`GROUP BY product pair, count orders`) is a full-scan aggregate — exactly the workload columnar stores are built for. Running it on Postgres would lock tables or require a read replica.

**Why Redis for serving:** Recommendations are pre-computed; serving is a point lookup (`ZREVRANGE`). Redis sorted sets are the right structure: `O(log N + K)` for top-K, naturally ordered by score.

**Algorithm:** Simple item-based co-purchase (products bought together in the same order). No ML needed — the SQL `JOIN order_items ON order_id` is the entire model. Scores are raw co-occurrence counts; can be normalized later.

**Key files:**
- `apps/analytics-service/` — new NestJS service
- `packages/shared-types/src/events/analytics.events.ts` — `AnalyticsOrderEvent`
- `apps/backend/src/modules/kafka/` — `KafkaProducerModule` + `KafkaProducerService`
- `apps/backend/src/modules/orders/handlers/order-analytics.handler.ts`
- `docker-compose.yml` — ClickHouse + analytics-service; backend + gateway updated

**Endpoint:** `GET /api/recommendations/products/:id` → `[{ productId, score }]` (top 5 co-purchased products)

**References:** `apps/analytics-service/`, `apps/backend/src/modules/kafka/`, `apps/backend/src/modules/orders/handlers/order-analytics.handler.ts`