### 4. VACUUM & Table Bloat Monitoring

#### Why?

PostgreSQL uses **MVCC**:

- `INSERT` → new row
- `UPDATE` → creates a **new row version**, old row becomes **dead**
- `DELETE` → marks row as **dead**

Dead rows occupy space until **VACUUM** cleans them.

**Example**

```sql
UPDATE orders
SET status = 'SHIPPED'
WHERE id = 1;
```

Internally:

| Row | Status         |
| --- | -------------- |
| Old | PENDING (dead) |
| New | SHIPPED (live) |

---

### Why is bloat bad?

More dead rows = larger table = slower scans.

**Example**

```
orders

Live rows : 1,000,000
Dead rows :   300,000

Query scans 1.3M rows instead of 1M rows.
```

---

### Important Metrics (`pg_stat_user_tables`)

| Metric            | Meaning                      | Example                  |
| ----------------- | ---------------------------- | ------------------------ |
| `n_live_tup`      | Live rows                    | `1,000,000`              |
| `n_dead_tup`      | Dead rows waiting for VACUUM | `300,000`                |
| `dead_pct`        | Dead row ratio               | `300000 / 1300000 = 23%` |
| `last_autovacuum` | Last automatic VACUUM time   | `2026-06-14 11:30`       |

Formula:

```
dead_pct =
n_dead_tup /
(n_live_tup + n_dead_tup)
```

---

### Rule of Thumb

```
dead_pct > 20%
```

on high-write tables (`Order`, `AuditLog`, `OutboxEvent`) means **Autovacuum is falling behind**.

Example:

```
Order

Live : 8,000,000
Dead : 2,500,000

dead_pct = 24%
→ Needs attention
```

---

### Fixes

#### 1. VACUUM ✅ (Recommended)

```sql
VACUUM orders;
```

- Reclaims dead rows
- No exclusive lock
- Application keeps running

**Use for routine maintenance.**

---

#### 2. Tune Autovacuum

Default:

```
autovacuum_vacuum_scale_factor = 0.20 (20%)
```

Example:

```
10M rows
↓

20% = 2M dead rows
↓

Autovacuum waits until 2M dead rows exist
```

Better for high-write tables:

```
autovacuum_vacuum_scale_factor = 0.05 (5%)

10M rows
↓

500k dead rows
↓

VACUUM runs earlier
```

---

#### 3. VACUUM FULL ⚠️

```sql
VACUUM FULL orders;
```

- Rewrites entire table
- Removes almost all bloat
- **Exclusive table lock**
- Blocks reads/writes

**Avoid on live production systems. Prefer `pg_repack`.**

---

### Monitoring

**View bloat report**

```bash
bash scripts/check-table-bloat.sh
```

Example output:

| Table     | Live      | Dead    | Dead % |
| --------- | --------- | ------- | ------ |
| orders    | 1,000,000 | 50,000  | 4.7%   |
| audit_log | 500,000   | 150,000 | 23%    |

---

**Show report + VACUUM tables with >20% dead rows**

```bash
bash scripts/check-table-bloat.sh vacuum
```

Runs:

```sql
VACUUM audit_log;
VACUUM outbox_event;
```

---

### Interview / Real-world Summary

- PostgreSQL never updates rows in place (**MVCC**).
- Updates & deletes create **dead tuples**.
- **VACUUM** reclaims dead space without locking the table.
- Monitor `n_dead_tup`, `dead_pct`, and `last_autovacuum`.
- If `dead_pct > 20%` on busy tables, tune Autovacuum or run `VACUUM`.
- **Never use `VACUUM FULL` on a busy production database unless absolutely necessary.**
