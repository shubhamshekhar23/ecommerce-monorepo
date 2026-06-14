# Table Partitioning — RequestMetric

- **Table partitioning** splits one large table into smaller tables (partitions) based on a key, while the application still queries it as a single table.

### Why use it?

- Faster queries (only relevant partitions are scanned)
- Smaller indexes
- Easier maintenance and cleanup

**Example**

Instead of:

```
RequestMetric (100M rows)
```

Use:

```
RequestMetric
├── request_metric_2026_q1
├── request_metric_2026_q2
├── request_metric_2026_q3
└── request_metric_2026_q4
```

### Why create a new partitioned table?

Converting an existing table like `Order` is risky because:

- Must rename the old table
- Create a new partitioned table
- Migrate all data
- Recreate all foreign keys (`OrderItem`, `ReturnRequest`, etc.)

`RequestMetric` has **no incoming foreign keys**, so it is safe to design as partitioned from the beginning.

### Why is the Primary Key `(id, timestamp)`?

PostgreSQL requires the **partition key** to be part of every unique constraint.

```sql
PRIMARY KEY (id, timestamp)   -- ✅ Valid
PRIMARY KEY (id)              -- ❌ Invalid
```

Prisma:

```prisma
@@id([id, timestamp])
```

### Partitions

Pre-created:

- 2026 Q1
- 2026 Q2
- 2026 Q3
- 2026 Q4
- 2027 Q1

Create the next quarter automatically:

```sql
SELECT create_next_quarter_partition();
```

### Middleware

- Records **10% of HTTP requests** (sampled, fire-and-forget) into `RequestMetric`.
- Sampling reduces database writes while still providing enough analytics.

**Example**

```
1000 requests/sec
↓
10% sampling
↓
100 metric inserts/sec
```

### Partition Pruning

Query:

```sql
SELECT *
FROM "RequestMetric"
WHERE timestamp >= '2026-04-01'
  AND timestamp < '2026-07-01';
```

PostgreSQL scans only:

```
request_metric_2026_q2
```

instead of:

```
Q1 ❌
Q2 ✅
Q3 ❌
Q4 ❌
```

making the query much faster.

### Management

**Shell**

```bash
bash scripts/create-partition.sh        # Create next quarter
bash scripts/create-partition.sh list   # List partitions and sizes
```

**API**

```
POST /api/admin/db/partitions/create-next
```

Allows admins to create new partitions without logging into the server.
