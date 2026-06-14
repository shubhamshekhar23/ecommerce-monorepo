## `pg_stat_statements`

- PostgreSQL extension that **tracks execution statistics for every SQL query**.
- Helps identify **which queries consume the most database time**.

### Why?

Without it:

- ❌ You only know _"the app is slow."_

With it:

- ✅ You know **which query is slow, how often it runs, and its overall impact**.

### Example

| Query                          | Avg Time   | Calls         | Total Time    | Priority   |
| ------------------------------ | ---------- | ------------- | ------------- | ---------- |
| `SELECT product WHERE id=?`    | **1 ms**   | **5,000,000** | **5,000 sec** | 🔴 Highest |
| `SELECT order WHERE user_id=?` | 5 ms       | 500,000       | 2,500 sec     | 🟠 High    |
| `UPDATE inventory SET stock=?` | 20 ms      | 50,000        | 1,000 sec     | 🟡 Medium  |
| Monthly sales report           | **500 ms** | **10**        | **5 sec**     | 🟢 Low     |

> **Rule:** Optimize by **`total_exec_time`**, not by `mean_exec_time`.
> A 1 ms query executed millions of times is often a much bigger bottleneck than a 500 ms query executed only a few times.

### Setup

```yaml
shared_preload_libraries=pg_stat_statements
```

- Loads the extension when Postgres starts.

```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

- Registers the extension and exposes the `pg_stat_statements` view.

### Flow

```text
NestJS/Prisma
      ↓
Postgres executes query
      ↓
pg_stat_statements updates statistics
      ↓
Admin calls:
GET /api/admin/db/slow-queries?limit=10
      ↓
Returns top queries sorted by total_exec_time
```

### Important Metrics

- **calls** → Number of executions
- **mean_exec_time** → Average execution time per call
- **total_exec_time** → `calls × mean_exec_time` (**most important metric**)
- **stddev_exec_time** → Variation in execution time (helps identify locking/caching issues)

### Reset Statistics

```text
Admin
  ↓
POST /api/admin/db/reset-stats
  ↓
pg_stat_statements_reset()
  ↓
All counters reset to 0
```

**Why reset?**

| Before Optimization | Total Time |
| ------------------- | ---------- |
| Product lookup      | 5,000 sec  |

Add an index and run the same load test:

| After Optimization | Total Time |
| ------------------ | ---------- |
| Product lookup     | 500 sec    |

If you **don't reset**, you'll see:

```text
5000 + 500 = 5500 sec
```

which hides the improvement.

### Typical Workflow

```text
1. POST /api/admin/db/reset-stats
2. Run load test / real traffic
3. GET /api/admin/db/slow-queries
4. Optimize highest total_exec_time query
5. Reset stats
6. Run the same load test
7. Compare results
```

**Goal:** Continuously reduce the queries with the **highest total execution time**, as they provide the biggest performance gains for the entire application.
