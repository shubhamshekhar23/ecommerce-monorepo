# Redis Usage in This Project

> **Redis is NOT used for Pub/Sub.**
>
> All event messaging (order created, product updated, etc.) is handled by **RabbitMQ**. Redis is used for caching, locking, rate limiting, and BullMQ job queues.

## 1. Caching

Redis stores frequently requested data so the application does not need to query the database every time.

### Product Cache

- `products:list:{page}:{limit}:{text}` → Paginated product list (**TTL: 60 sec**)
- `products:cursor:{limit}:{cursor}` → Cursor pagination (**TTL: 60 sec**)
- `products:search:{term}:{limit}:{cursor}` → Search results (**TTL: 60 sec**)
- `products:detail:id:{id}` → Product by ID (**TTL: 5 min**)
- `products:detail:slug:{slug}` → Product by slug (**TTL: 5 min**)

### Order Read Model Cache (CQRS)

- `read:order:{orderId}` → Pre-built order response (**TTL: 1 hour**)
- Updated whenever:
  - `OrderCreated`
  - `OrderStatusChanged`

- Used by every `GET /orders/:id` request.

---

## 2. Distributed Locking (Prevents Cache Stampede)

If many users request the same uncached data at the same time:

- First request creates:
  - `lock:{cacheKey}` using `SET NX PX 5000` (5-second lock)

- Only that request fetches data from the database and fills the cache.
- Other requests:
  - Wait
  - Check Redis every **50 ms**
  - Retry up to **10 times**
  - Read the newly cached value instead of hitting the database.

- Lock is released atomically using a Lua script so only the lock owner can remove it.

---

## 3. Rate Limiting

Redis limits how many requests a user or IP can make.

### Keys

- `rl:ip:{ip}:{route}` → Per IP + route
- `rl:u:{userId}` → Per authenticated user
- `rl:upr:{userId}:{route}` → Per authenticated user + route

### How it works

For every request:

- Add current timestamp to a Redis Sorted Set
- Remove timestamps older than the configured time window
- Count remaining requests
- If count exceeds the limit → return **HTTP 429 (Too Many Requests)**

Both **backend** and **auth-service** use the same implementation.

---

## 4. BullMQ Job Queues (Redis as Queue Storage)

BullMQ stores job data in Redis.

### invoices queue

- Added when an order is confirmed
- Processor concurrency: **2**
- Generates invoice PDF
- Saves PDF to disk

### stock-alerts queue

- Added when a product is restocked
- Fan-out pattern (one job per subscriber)
- Processor concurrency: **5**
- Sends stock alert emails via `MailService`

### cart-recovery queue

- Registered for admin statistics/monitoring
- **No processor implemented yet**

---

## Redis Connections

### Main Application

- Reads `REDIS_URL`
- Default: `redis://localhost:6379`

### Health Check

- Separate dedicated Redis client
- Used only for `PING → PONG` health checks

### Auth Service

- Has its own `redis.service.ts`
- Uses the same Redis connection setup independently
