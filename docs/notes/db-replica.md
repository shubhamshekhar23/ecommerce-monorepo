# PostgreSQL Streaming Replication & Read Replica

## Goal

A Read Replica is a second PostgreSQL database that continuously copies data from the Primary database and serves **read-only queries**, reducing load on the primary.

**Architecture:** `Backend → Primary (writes) + Read Replica (reads)`

---

# Why use a Read Replica?

| Without Replica                | With Replica                   |
| ------------------------------ | ------------------------------ |
| Users placing orders → Primary | Users placing orders → Primary |
| Admin reports → Primary        | Admin reports → Replica        |
| Analytics → Primary            | Analytics → Replica            |

Heavy analytics no longer compete with user transactions, keeping the primary fast for critical operations.

---

# How it is implemented

## 1. docker-compose.replica.yml

Adds a second PostgreSQL container.

**Normal startup**

```bash
docker compose up
```

**Starts:** `Backend → Primary`

**Replica startup**

```bash
docker compose -f docker-compose.yml -f docker-compose.replica.yml up -d
```

**Starts:** `Backend → Primary + Replica`

The replica is **opt-in** to avoid extra resource usage during development.

---

## 2. Streaming Replication

**Replica startup flow**

`Wait for Primary → pg_basebackup() → Copy entire database → Create standby.signal → Replay WAL logs continuously`

Primary is already configured with:

```text
wal_level = replica
max_wal_senders = ...
```

so it is always ready for replication.

### How WAL Streaming Works

**Flow:** `Client → Primary commit → WAL streamed immediately → Replica applies changes`

- WAL (Write-Ahead Log) is streamed **continuously**, not batch or scheduled.
- Replica applies changes as soon as they are received.

---

## 3. ReadReplicaService

Instead of:

`PrismaClient → Primary`

there are two clients:

- `PrimaryPrisma → Primary`
- `ReplicaPrisma → Read Replica`

Example:

```js
await primaryPrisma.order.create(...);     // write
await replicaPrisma.order.findMany(...);   // analytics read
```

---

# Current implementation

Implemented:

- ✅ docker-compose.replica.yml
- ✅ postgres-replica container
- ✅ Streaming replication
- ✅ ReadReplicaService (separate PrismaClient)
- ✅ Fallback to primary
- ✅ Replication lag endpoint

Currently using replica:

```text
GET /admin/db/replication/lag
```

Internally:

```sql
SELECT pg_last_xact_replay_timestamp();
```

Other analytics endpoints (slow queries, table stats, partition info) still use the primary.

---

# Fallback behavior

If `READ_REPLICA_DATABASE_URL` is configured:

`ReadReplicaService → Read Replica`

Otherwise:

`ReadReplicaService → DIRECT_DATABASE_URL → Primary`

The application works whether the replica is running or not.

---

# Replication Lag

The project uses **asynchronous replication**.

**Flow:** `Primary commits → Client receives response → WAL streamed → Replica applies changes`

The primary **does not wait** for replica confirmation.

| Environment           | Typical Lag      |
| --------------------- | ---------------- |
| Docker / Same machine | < 5 ms           |
| Same datacenter       | Few milliseconds |
| Cross datacenter      | 50–200 ms        |

Example timeline:

`12:00:00.000 Order inserted → 12:00:00.002 Client response → 12:00:00.004 WAL streamed → 12:00:00.005 Replica applied`

Check current lag:

```bash
docker compose -f docker-compose.yml -f docker-compose.replica.yml exec postgres \
psql -U ecommerce_user -c \
"SELECT client_addr, state, (sent_lsn - replay_lsn) AS lag_bytes FROM pg_stat_replication;"
```

---

# What does this mean in practice?

Example:

`Admin updates Order #101 → Primary updated → Browser refreshes order list → Replica usually already caught up`

In Docker or same-datacenter setups, replica lag is usually **shorter than a single HTTP request**, so stale reads are extremely rare.

Small theoretical window:

`Primary: Order = Shipped | Replica: Order = Processing`

---

# What should use the replica?

## Good candidates

- Dashboard statistics
- Revenue reports
- Monthly sales
- Top selling products
- COUNT(\*)
- GROUP BY
- Aggregations
- Slow query analysis

Example:

```sql
SELECT category, SUM(total)
FROM orders
GROUP BY category;
```

## Never use the replica

- Checkout stock validation
- Payment confirmation
- Inventory updates
- Admin read-after-write flows
- Critical business reads

Example:

```sql
UPDATE products
SET stock = stock - 1;

SELECT stock FROM products;
```

Possible state:

`Primary: stock = 9 | Replica: stock = 10 (lagging)`

---

# Is this how production apps work?

Most production systems use:

`Backend → PrimaryClient → Primary`
`Backend → ReplicaClient → Read Replica`

Example:

```js
await primaryPrisma.payment.create(...);
await replicaPrisma.order.count();
```

---

# Large-scale production

Some companies introduce a database router:

`Backend → DB Router → Primary (INSERT/UPDATE/DELETE) + Read Replicas (SELECT)`

---

# Why manual routing is still preferred

Not every `SELECT` is safe.

Example:

```sql
UPDATE products
SET stock = stock - 1;

SELECT stock FROM products;
```

If the SELECT goes to a replica:

`Primary: stock = 9 | Replica: stock = 10 (lagging)`

Even if lag is only a few milliseconds, future changes like `recovery_min_apply_delay` (deliberately delayed replicas for disaster recovery) can make admin pages show stale data. Therefore, production systems explicitly route **only analytics/reporting queries** to replicas and keep **writes and consistency-critical reads** on the primary.

---

# Summary

| Feature                    | Current Project                               |
| -------------------------- | --------------------------------------------- |
| Streaming replication      | ✅                                            |
| Live WAL streaming         | ✅                                            |
| Read replica               | ✅                                            |
| Separate Prisma client     | ✅                                            |
| Opt-in Docker startup      | ✅                                            |
| Fallback to primary        | ✅                                            |
| Replication lag monitoring | ✅                                            |
| Heavy analytics on replica | Planned (only lag endpoint currently uses it) |
| Async replication          | ✅                                            |

**Key idea:** WAL changes are streamed continuously from the Primary to the Read Replica. Replicas are ideal for heavy analytics and reporting, while all writes and read-after-write critical operations should always use the Primary database.
