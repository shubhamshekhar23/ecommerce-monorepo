# Phase 5

- CorrelationIds
  - Purpose of Request/Correlation ID: A unique `requestId` is assigned to every HTTP request, allowing all logs generated during that request to be correlated for easier debugging and distributed tracing.
  - Request ID Propagation: `CorrelationIdMiddleware` reads the `X-Request-ID` header or generates a UUID, while `AsyncLocalStorage` propagates the `requestId` across the entire async call chain without parameter passing.
  - Automatic Structured Logging: `nestjs-pino` uses `genReqId` and `customProps` to automatically attach `requestId` to every log line, requiring no manual work in services.
  - End-to-End Observability: Searching for a specific `requestId` in the log aggregator retrieves all related HTTP, service, and database logs, making request tracing and issue diagnosis straightforward.

- Opentelemtry
  - Automatic tracing: OpenTelemetry automatically creates spans for NestJS requests, Prisma queries, Redis operations, BullMQ jobs, and outgoing HTTP calls without manual instrumentation.
  - End-to-end visibility: All spans are linked together, allowing an entire request flow across different components to be tracked as a single trace.
  - Rich trace metadata: Each span records details such as service name, operation name, duration, HTTP status code, database query text, and parent span ID.
  - Centralized monitoring: Traces are exported via OTLP to Jaeger (`http://jaeger:4318/v1/traces`) for visualization, debugging, and performance analysis.

- Jaeger
  - Jaeger provides end-to-end request tracing, showing every operation performed for a request and how long each one takes.
  - Example trace: `POST /orders (450ms) → OrdersService.create (400ms) → SELECT FOR UPDATE (80ms) → INSERT order (30ms) → INSERT outbox_event (5ms) → StripeService.createPaymentIntent (250ms)`.
  - The waterfall view highlights bottlenecks, making it clear that `StripeService.createPaymentIntent (250ms)` is the main reason the request is slow.
  - Senior developers use Jaeger to debug and optimize production performance, identifying the exact slow operation instead of guessing.

- http metrics (prometheus)
  - Every API request is timed and recorded. For example, `POST /api/orders` returning `201` in 312 ms is saved as a metric.
  - These metrics show how healthy the API is, such as how many requests are coming in, how fast they are, and how many are failing.
  - Instead of saving every product ID separately, it groups similar requests together: `/api/products/:id` instead of `/api/products/123` or `/api/products/456`.
  - This saves a huge amount of memory. Otherwise, a store with 50,000 products would create 50,000 separate metrics, making Prometheus slow or even crash.

- Databse metrics
  - PgBouncer exporter collects connection pool statistics from PgBouncer's internal admin database and exposes them as Prometheus metrics.
  - Key metrics: `client_active` = running queries, `client_waiting` = queued requests, `server_idle` = unused connections, `total_requests` = cumulative requests processed.
  - Most important alert: `pgbouncer_pools_client_waiting > 0` indicates the connection pool is saturated, causing API requests to queue and increasing response times.
  - `STATS_USERS` must be configured so the exporter can access PgBouncer's admin interface and read pool statistics.

- prometheu metrics
  - Default metrics (CPU, memory, GC, event loop lag)
  - Business metrics: ordersTotal → "How many orders are happening?"; paymentEvents → "Are payments succeeding or failing?"
    ; inventoryFailures → "How often are customers unable to buy because stock is unavailable?";httpDuration → "How fast is each API endpoint responding?", Histogram — P50/P95/P99 request latency per route; cacheOperationsTotal → "Is the cache serving requests effectively, or are we hitting the database too often?"
  - Prometheus Client: sits in nestjs app, Collects and exposes metrics at /api/metrics.
  - Prometheus Server: Periodically pings /api/metrics and stores the metrics in its db.

- Grafana Dashboards
  - RED Dashboard – Shows request count, errors, and response time to quickly check if the API is healthy.
  - Business Dashboard – Shows orders, revenue, payment success, and conversions to track business performance.
  - Database Dashboard – Shows query speed, connection usage, and slow queries to find database problems.
  - Infrastructure Dashboard – Shows CPU, memory, and disk usage to monitor server/container resources.

- Loki log aggregation
  - Loki stores application logs so they are searchable and don't disappear after container restarts.
  - Promtail continuously reads (tails) container stdout logs and sends them to Loki with labels like `service`, `pod`, and `container`.
  - Grafana lets you search and filter logs (e.g., errors, payment failures, or a specific correlation ID) in the same UI as metrics.
  - No application code changes are needed—Pino still writes JSON logs to stdout, and Promtail automatically collects and ships them to Loki.

- The three Pillars
  - Logs: NestJS uses Pino (lib) to write logs → Promtail (server) collects them → Loki (server + DB) stores and indexes them → tells what happened and in what order.
  - Metrics: NestJS uses prom-client (lib) to expose `/api/metrics` → Prometheus (server + DB) scrapes and stores them → tells how much, how often, and how fast.
  - Traces: NestJS uses OpenTelemetry SDK (lib) to create spans → Jaeger (server) receives them → Jaeger storage (DB: in-memory/Badger) stores them → tells how long each step took.
  - Grafana: Connects to Loki, Prometheus, and Jaeger to visualize logs, metrics, and traces in one UI.
  - Prometheus and Loki combine the server and database into one component, while Jaeger has a separate server and storage layer.
  - Logs answer: _What happened?_
  - Metrics answer: _How much/how often did it happen?_
  - Traces answer: _Where was the time spent?_

- The Observability Flow
  - When an issue occurs (e.g., slow API response), start with the RED dashboard in Grafana to check request count, error rate, and latency of routes.
  - If a specific route is slow or has errors, check the Jaeger trace for that route to see which operation is taking the most time or causing errors (e.g., Stripe API call).
  - If the trace shows a bottleneck (e.g., Stripe call taking 250ms), check the logs in Loki for that specific request (using trace ID) to see if there are any error messages or warnings that explain why it's slow (e.g., network timeout, retry attempts).
  - Also try to check the infrastructure dashboard to see if there are any resource spikes (CPU, memory) that correlate with the time of the issue, which could indicate a capacity problem.
  - Whta can cause individual issues in infrastructure dashboard.
    - CPU spike: infinite loop, heavy computation, DDoS attack, memory leak causing GC thrashing
    - Memory spike: memory leak, large data processing, unoptimized caching, high traffic volume
    - Disk I/O spike: heavy logging, large file uploads/downloads, database backups,

- Same trace_id across services
  - Every service should have OpenTelemetry (OTEL) enabled.
  - OTEL keeps the same `trace_id` as a request travels across multiple services.
  - Example: `Frontend → Backend → Auth Service → Notification Service` all share `trace_id = abc123`.
  - Searching `trace_id = abc123` in Grafana/Loki shows logs from every service in one timeline.
  - OTEL automatically propagates trace context via HTTP headers, gRPC metadata, or message queue headers.
  - Without OTEL in one service, that service becomes a blind spot and its logs won't be linked to the rest of the request.

- In production, if the Node.js app crashes, Docker/Kubernetes automatically detects the failure and starts a new instance, so the application recovers automatically.
- If a request throws an error (e.g., user.name when user is null), NestJS catches the exception, returns an HTTP 500 response for that request, logs the error, and keeps the backend running so other requests continue to succeed.
- Slow database queries hold connections longer, causing other requests to wait or timeout. Example: pg_sleep(2) keeps the only connection busy for 2s, so incoming requests queue up and eventually fail with a connection pool timeout.

- question
  - what to add in logs compared to traces?
  - check scenarios when cpu, ram etc. in infrastructre dashboard would spike and crash.
  - Find all different sceneraios in this app, that we can use obeervability flow to solve issue and do rca.
  -

---

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
