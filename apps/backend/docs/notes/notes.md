# Phase 4

- Domain Events with EventEmitter2
  - Event-Driven Communication: `OrderService` emits domain events using `EventEmitter2` (`eventEmitter.emit('order.created', event)`) instead of directly calling other services.
  - Services Subscribe with `@OnEvent()`: Modules like `MailService`, `InventoryService`, `AnalyticsService`, or `VendorService` listen using `@OnEvent('order.created')` and execute their own logic independently.
  - Loose Coupling & Open/Closed Principle: New listeners can be added without modifying `OrderService`, making the system easier to extend and maintain.
  - Domain vs Integration Events: Domain events are in-process (EventEmitter2 + `@OnEvent()` within the same application), while cross-service communication uses Outbox → RabbitMQ integration events.

- CQRS:
  - Separate Write & Read Models (CQRS): `ProductReview` is the normalized write model (one row per review), while `ProductRating` is the denormalized read model (one row per product with precomputed `avgRating` and `reviewCount`).
  - Event-Driven Updates: When a review is approved, the `review.approved` event triggers `updateProductRating()`, which recomputes the aggregate and upserts the `ProductRating` record.
  - Fast Read Performance: Product listing queries simply join `Product` with `ProductRating`, avoiding expensive `GROUP BY`, `AVG()`, and `COUNT()` operations on every request.
  - Eventual Consistency: The write path (review submission/approval) and read path (product display) are independent, so there may be a brief delay before the read model reflects the latest approved review.

- Order state check:
  - State Machine with Transition Map: Order status changes are validated against a predefined `Record<OrderStatus, OrderStatus[]>` map, and any invalid transition throws a `BadRequestException`.
  - Transactional Consistency: The order status update and `OrderStatusChangedEvent` emission occur inside the same transaction, ensuring both the database state and emitted event remain atomic and consistent.

---

# Phase 3 (Caching)

- using redis as a cache storage
- storing key value, and there are different data structures
- caching prodyct detail, product lists as cache, Cache-Aside (Lazy Loading) is used
- cache invalidation using scan instead of keys for performance
- when product is updated all the products:\* is invaluidated
- produyct detail has ttl 300, and product list has 60;
- Measuring hits and misses count per key types; we want almost 70% hits; if it goes below that we need to revisit our invalidation stratgey;
- to prevent cache stampede, we have used locking mechansim using nx-px when miss has happened;
- we always want noeviction for bullmq jobs;

- Rate-Limiter
  - using slidig window timelines; used for many routes like auth
  - uses canActivate from rate-limit guard;andn then uses LUA script to call redis and increment the request count and also get the count of requests in interval of sliding window.

# Phase 2 (reliability)

- Idempotency key :
  - a uuid is sent from client side per single order request; if user clicks place order button multiple times, always the same uuid will be sent
  - this is stored in db table along with userid and the status of the order; and the order details as json in a table column as well
  - when a duplicate request arrives, it checks the idemp key and status of order, and based on that returns the response;
  - It is written as an interceptor which can be injected with order service (in futire payment as well etc.)
  - when 2 requests arrive at the same time, that is also handled, keeping atomicity in place.

- Outbox Pattern
  - can use cron job (from nestjs sceduler lib) or a simple setinterval
  - Solves the dual write problem; one db transaction cant handle publishing message event inside itself
  - saving events in table with status, then outbox processor runs every 5sec to pull, check the status and tries to publish the event again;
  - Works even if server crashes, next start would again start the outbox processor
  - after 5 failures marks `FAILED` in db (dead letter) for further investigation by some developer;
  - Fetches up to 50 `PENDING` events with `FOR UPDATE SKIP LOCKED` (multiple workers can run safely)

- Saga pattern for order placement
  - there are some db updates that need to be done in an atomic manner like stock change, checking cart; acquiring locks;
  - we put them into a transaction that all succceeds or all fails
  - also we create an event in table for sending emails; which is a part of outbox pattern above
  - then we try for stripe payment, if it succeed or fails, based on which we undo all above or let it proceed
  - We use circuit breaker that wraps around calling of stripe payment api, that lets app know whats the success rate; state are closed, half open, open;
  - payment api is usually very fragile and often unreliable thats why we use circuit breaker pattern, to know before hand how the past payemnts behaved.

- BullMq
  - pushing message event using bullmq lib into redis; using bullmq processors that also run in the same node process keep connecting with redis for the new events, and porcess them. e.g invoice processor
  - cart-recovery, invoice generation and stock alerts are being used for publishing events in queue and subscribing.
  - bullmq is also able to send a scheduled task in redis as well, e.g cart-recovery, it should be run after 30min.
  - ordercreated event is emitted and cart-recover listens and discard the cart-recovery job;
  - stock alerts also uses PRODUCT_RESTOCKED_EVENT event and listens and adds job in queue and process them
  - For retries : using jitter in case of email, because email server can be down often; and exponential backoff

- Circuit Breaker pattern
  - this pattern is used in case of stripe payment calls
  - It uses opossum lib to implement above; wraps around stripe payment calls;
  - the styates are closed, open, half open; retries after 30sec

- Stripe
  - Webhook used, to avoid duplication webhookevent table used to store the events
  - post request /webhook called by stripe to our backend api and we do all the subsequent steps
  - Signature verification done by stripe sdk once the request arrives

# Phase 1

- Db migration for products; Normalized design for tables; Expand - Deploy - Backfill - Contract
  - Add nullable column/table
  - Deploy application that reads/writes both old and new schema
  - Backfill existing data
  - Switch reads to new schema
  - Make column `NOT NULL`
  - Remove old column/table
  - Zero-downtime migration strategy

- Product Variants
  - Normalized schema instead of storing size/color directly on product
  - `Product`, `ProductVariant`, `Attribute`, `AttributeOption`, `VariantAttributeValue`
  - Composite primary key (`variantId`, `optionId`)
  - Variant owns stock and price
  - Product owns shared information (name, description, brand, etc.)
  - JSONB snapshot for order items to preserve historical purchase data

- Cursor based pagination vs Offset
  - Offset: `LIMIT 20 OFFSET 50000`
  - Database must scan/discard previous rows
  - Cursor: `WHERE id > cursor`
  - Uses index efficiently
  - Stable under inserts/deletes
  - Encode/decode cursor token
  - Keyset pagination

- PostgreSQL Full Text Search (FTS)
  - PostgreSQL built-in search engine
  - Often sufficient before introducing Elasticsearch
  - `tsvector`, `tsquery`, `plainto_tsquery`
  - SearchVector generated stored column
  - Read-only/generated automatically by Postgres
  - Generated whenever row is inserted/updated
  - GIN index on search vector
  - Search weights (A, B, C, D)
  - Ranking via `ts_rank`
  - Stemming
    - running → run
    - shoes → shoe

  - Query normalization
    - "nike running shoes"
    - becomes roughly: nike, run, shoe

  - `to_tsvector()` converts text into searchable lexemes
  - `plainto_tsquery()` converts user search text into search query
  - Lexemes = stripped important words
  - `$queryRaw` for advanced FTS queries
  - Full-text index ≠ normal B-tree index

- Inventory Reservation / Stock Management
  - Race condition during concurrent checkout
  - Pessimistic locking
  - `SELECT ... FOR UPDATE`
  - Row-level lock
  - Lock acquired inside transaction
  - Other transactions block until lock released
  - Prevents overselling inventory
  - Conditional update: `stock >= qty`
  - Prevents negative inventory
  - Prisma interactive transaction: `await prisma.$transaction(async (tx) => {});`
  - Prisma internally handles:
    - `BEGIN`
    - `COMMIT`
    - `ROLLBACK`
  - Lock lives until commit/rollback
  - Atomic stock reservation workflow
  - Transaction, Commit, Rollback, Row Lock, Blocking, Atomicity, Race Condition

- Indexing
  - B-tree, Composite B-tree, Partial index, Gin index
  - createdAt, productId, isActive, emailId, status
  -

# Phase 0

- Monorepo, root package.json and workspace
- Hoisting and node_modules
- package/shared-types and package.json
- Multi-stage-build docker; backend app compiled code; dist folder; (deps, build, run)
- Copying node_modules first and then app code instaed of copying everything at once in docker
- Lightweight Linux system - Alpine
- Schema migration and prisma; Commiting migration files; prisgma migrate and prisma deploy
- pgbouncer connection pooling
- for runtime or for migration, which db url to choose, that is configured in schema.prisma.
- nginx :
  - SSL Termination, HTTP → HTTPS, HTTP/2 , Rate Limiting , Security Headers ,Request Logging ,Gzip Compression , Static Files ,Health Checks ,Metrics Endpoint ,Request Tracing ,Blue-Green Routing ,Reverse Proxy
  - Uses upstream.conf for defining where to redirect to the backend
  - We currently have only one instances of blue app running and that is being used by nginx to send traffic to.
- docker-compose.prod.yml file is only for production; It has blue green apps container that will be switched using nginx;
- Graceful shotdown handling in nestjsapp;
- Checking health of the app; endpoint to ping in app for readiness and healthiness; check health.controller.ts
  - pinged by docker, nginx, kubernetes
- main.ts: Create Nest App, Stripe Webhook Support, Helmet Security, Compression, CORS, Validation Pipes, Swagger Docs, Static Files, Graceful Shutdown, Shutdown Hooks, Start HTTP Server
- Metrics and Logs:
  `All running containers` : Creates log messages; e.g nestjs app using this.logger.log();
  `nestjs-pino`: converts that into props json and stdout; whioch docker constiner stores internally
  `promtail` reads logs from every running container using docker socket and batches them in memory buffer before making http post request to `Loki` and clears the memory;
  `Loki`: Receives request from promtail and Stores logs;
  `OpenTelemetry`: Uses otel sdk and tracing.ts that patches around the libs like redis, stripe etc.; Creates traces with spans in them, and periodically makes http request to Jaeger;
  `Jaeger`: Stores traces in memory (with current setup, although when restarted container all traces would be gone; so we can use elastic search/ opensearch along with it to persist data); It has its own UI
  `promclient`: stores all the metrics related info in process memory of nestjs app;
  `pgbouncer exporter`: queries the pg bouncer and stores the metrics again in ram
  `Prometheus`: makes http request to nestjs app and pgbouncer exporter and gets the metrics data and stores it; tracking runtime metrics(cpu, memory, event loop); http metrics(request duration); db metrics(query duration), buisness metrics (orders_total, payment_success_rate_percent)
  `Grafana` : Gets info from prometheus and Loki and Displays (it doesnt connect with jaeger as later has its own ui)
