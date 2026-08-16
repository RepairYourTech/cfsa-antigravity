---
name: clickhouse
description: "Expert ClickHouse guide covering schema design (ORDER BY planning, column cardinality ordering, LowCardinality, Nullable avoidance, partitioning), query optimization (JOIN algorithms, dictionaries vs denormalization, skipping indices, materialized views), and insert strategy (batch sizing, async inserts, mutation avoidance, ReplacingMergeTree/CollapsingMergeTree). Use when designing analytics tables, optimizing OLAP queries, or building data ingestion pipelines with ClickHouse."
version: 1.0.0
---

# ClickHouse Expert Guide

> Use this skill when designing ClickHouse table schemas, writing analytical queries, optimizing JOINs, configuring materialized views, or building data ingestion pipelines. Based on 28 official ClickHouse best-practice rules (Apache-2.0).

## When to Use This Skill

- Designing `CREATE TABLE` statements for analytics workloads
- Choosing `ORDER BY` / `PRIMARY KEY` columns
- Optimizing slow ClickHouse queries
- Building data ingestion pipelines (batch or streaming)
- Configuring partitioning and TTL strategies
- Working with ReplacingMergeTree, CollapsingMergeTree, or AggregatingMergeTree

## When NOT to Use This Skill

- OLTP workloads with frequent row-level updates → use PostgreSQL
- Full-text search → use Elasticsearch or Meilisearch
- Graph traversals → use Neo4j or SurrealDB
- Document store with flexible queries → use MongoDB
- Real-time subscriptions with push → use SpacetimeDB

---

## 1. Schema Design (CRITICAL)

### ORDER BY / PRIMARY KEY Planning

`ORDER BY` is **immutable** after table creation. Wrong choices require full data migration.

**Rule: Order columns by cardinality, low → high:**

| Position | Cardinality | Examples |
|----------|-------------|----------|
| 1st | Low (few distinct values) | `event_type`, `status`, `country` |
| 2nd | Date (coarse granularity) | `toDate(timestamp)` |
| 3rd+ | Medium-High | `user_id`, `session_id` |
| Last | High (if needed) | `event_id`, `uuid` |

```sql
-- ✅ Low cardinality first enables granule skipping
CREATE TABLE events (
    event_type LowCardinality(String),
    event_date Date,
    user_id UInt64,
    event_id UUID,
    payload String
)
ENGINE = MergeTree()
ORDER BY (event_type, event_date, user_id);

-- ❌ High cardinality first prevents index pruning
-- ORDER BY (event_id, event_type, event_date);
```

> **Tip**: Use `toDate(timestamp)` instead of raw `DateTime` in ORDER BY when day-level filtering suffices — reduces index size from 32-bit to 16-bit.

### Data Types

| Rule | Pattern |
|------|---------|
| Use native types | `DateTime`, `UInt32`, `IPv4` — not `String` for everything |
| Minimize bit-width | `UInt8` for HTTP codes, `UInt16` for years |
| `LowCardinality(String)` | For columns with <10K unique string values |
| `Enum8`/`Enum16` | For finite, validated value sets |
| Avoid `Nullable` | Use `DEFAULT` instead — Nullable adds storage overhead |

```sql
-- ✅ Right-sized types
CREATE TABLE metrics (
    status_code UInt16,           -- HTTP codes fit in UInt16
    age UInt8,                    -- 0-255
    country LowCardinality(String), -- ~200 countries
    event_type Enum8('click' = 1, 'view' = 2, 'purchase' = 3),
    amount Decimal(10,2),
    created_at DateTime DEFAULT now()  -- Not Nullable(DateTime)
)
ENGINE = MergeTree()
ORDER BY (country, event_type, created_at);
```

### Partitioning

Partitioning is for **data lifecycle management**, not query performance.

| Rule | Detail |
|------|--------|
| Keep partition cardinality 100–1,000 | Monthly partitions: 12/year, bounded |
| Use for TTL/DROP PARTITION cleanup | Instant bulk deletion |
| **Consider starting without partitioning** | Add later when you understand access patterns |
| Never partition by high-cardinality columns | `user_id` = millions of partitions = crash |

```sql
-- ✅ Monthly partitions, bounded cardinality
CREATE TABLE events (...)
ENGINE = MergeTree()
PARTITION BY toStartOfMonth(timestamp)
ORDER BY (event_type, timestamp);

-- ✅ TTL with partition-based cleanup
ALTER TABLE events DROP PARTITION '202301'; -- Instant

-- ❌ Never: PARTITION BY user_id
```

**Validation query:**

```sql
SELECT partition, count() as parts, sum(rows) as rows,
       formatReadableSize(sum(bytes_on_disk)) as size
FROM system.parts
WHERE table = 'events' AND active
GROUP BY partition ORDER BY partition;
```

### JSON Type

Use `JSON` type only for truly dynamic/semi-structured data. Use typed columns for known fields:

```sql
-- ✅ Known fields as typed columns + dynamic remainder as JSON
CREATE TABLE events (
    event_type LowCardinality(String),
    timestamp DateTime,
    user_id UInt64,
    metadata JSON  -- Only for dynamic/unknown fields
)
ENGINE = MergeTree()
ORDER BY (event_type, timestamp);
```

---

## 2. Query Optimization (CRITICAL)

### JOIN Algorithms

ClickHouse defaults to loading the RIGHT table into memory. Choose the right algorithm:

| Algorithm | Best For | Trade-off |
|-----------|----------|-----------|
| `parallel_hash` | Small-to-medium in-memory (default 24.11+) | Fast, concurrent |
| `direct` | Dictionary lookups (INNER/LEFT only) | Fastest — no hash build |
| `full_sorting_merge` | Tables already sorted on join key | Low memory |
| `partial_merge` | Large tables, memory-constrained | Slowest, lowest memory |
| `grace_hash` | Large datasets, tunable memory | Disk-spilling |
| `auto` | Adaptive | Tries hash, falls back on pressure |

```sql
-- For large-to-large joins
SET join_algorithm = 'partial_merge';
SELECT * FROM large_a JOIN large_b ON large_b.id = large_a.id;

-- For sorted join keys
SET join_algorithm = 'full_sorting_merge';
SELECT * FROM table_a a JOIN table_b b ON b.pk_col = a.pk_col;
```

### Alternatives to JOINs

**Dictionaries** — for frequent lookups to small dimension tables:

```sql
CREATE DICTIONARY customer_dict (
    id UInt64, name String, email String
)
PRIMARY KEY id
SOURCE(CLICKHOUSE(TABLE 'customers'))
LAYOUT(HASHED())
LIFETIME(MIN 300 MAX 360);

-- Use dictGet instead of JOIN
SELECT order_id,
       dictGet('customer_dict', 'name', customer_id) as name
FROM orders WHERE created_at > '2024-01-01';
```

| Approach | When | Performance |
|----------|------|-------------|
| Dictionary | Frequent lookups, small dimension | Fastest (in-memory) |
| Denormalization (MV) | Analytics always need enriched data | Fast (no join at query) |
| IN subquery | Existence filtering | Often faster than JOIN |
| JOIN | Infrequent or complex joins | Acceptable |

### Data Skipping Indices

For filters on columns **not** in `ORDER BY`:

```sql
CREATE TABLE logs (
    timestamp DateTime,
    service LowCardinality(String),
    error_code UInt32,
    message String,
    INDEX idx_error_code error_code TYPE minmax GRANULARITY 4,
    INDEX idx_message message TYPE tokenbf_v1(10240, 3, 0) GRANULARITY 1
)
ENGINE = MergeTree()
ORDER BY (service, timestamp);
```

### Materialized Views

**Incremental MVs** — real-time pre-aggregation:

```sql
CREATE MATERIALIZED VIEW hourly_stats_mv TO hourly_stats AS
SELECT
    toStartOfHour(timestamp) as hour,
    service,
    count() as event_count,
    avg(duration) as avg_duration
FROM events GROUP BY hour, service;
```

**Refreshable MVs** — for complex joins / batch workflows:

```sql
CREATE MATERIALIZED VIEW enriched_orders
REFRESH EVERY 1 HOUR TO enriched_orders_target AS
SELECT o.*, c.name as customer_name
FROM orders o JOIN customers c ON c.id = o.customer_id;
```

---

## 3. Insert Strategy (CRITICAL)

### Batching

**Batch 10K–100K rows per INSERT.** Never insert row-by-row.

```sql
-- ✅ Batch insert
INSERT INTO events FORMAT JSONEachRow
{"event_type": "click", "timestamp": "2024-01-01 00:00:00", ...}
{"event_type": "view", "timestamp": "2024-01-01 00:00:01", ...}
-- ... 50K more rows
```

### Async Inserts

For high-frequency small batches where client batching is impractical:

```sql
SET async_insert = 1;
SET wait_for_async_insert = 1;  -- Wait for flush confirmation
-- ClickHouse batches small inserts server-side
```

### Native Format

Use `Native` format for best insert performance (eliminates parsing overhead).

### Avoiding Mutations

**Never use `ALTER TABLE UPDATE/DELETE` for regular operations.** Use specialized engines:

| Operation | ❌ Avoid | ✅ Use Instead |
|-----------|---------|---------------|
| Updates | `ALTER TABLE UPDATE` | `ReplacingMergeTree` + insert new version |
| Soft deletes | `ALTER TABLE DELETE` | `CollapsingMergeTree` (sign = -1) |
| Occasional deletes | `ALTER TABLE DELETE` | Lightweight `DELETE FROM` (23.3+) |
| Bulk time-based cleanup | `ALTER TABLE DELETE WHERE date < X` | `DROP PARTITION '202301'` |
| Background merging | `OPTIMIZE TABLE FINAL` | Let background merges work |

```sql
-- ✅ ReplacingMergeTree for updates
CREATE TABLE users (
    user_id UInt64,
    name String,
    status LowCardinality(String),
    updated_at DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY user_id;

-- "Update" by inserting new version
INSERT INTO users (user_id, name, status) VALUES (123, 'John', 'inactive');
-- Query with FINAL for latest version
SELECT * FROM users FINAL WHERE user_id = 123;
```

---

## 4. Common Anti-Patterns

1. **Random ORDER BY** — placing high-cardinality UUIDs first destroys index pruning
2. **`String` for everything** — use `DateTime`, `UInt32`, `IPv4`, `Enum` for known types
3. **Per-row inserts** — batch 10K–100K rows; row-by-row creates excessive parts
4. **`Nullable` by default** — adds storage cost and complexity; use `DEFAULT` values
5. **`ALTER TABLE UPDATE`** — rewrites entire parts; use `ReplacingMergeTree` instead
6. **High-cardinality partitions** — `PARTITION BY user_id` → millions of parts → crash
7. **`OPTIMIZE TABLE FINAL`** — forces synchronous merge; let background merges work
8. **JOINing large dimension tables on every query** — use dictionaries or denormalization

---

## References

- [ClickHouse Best Practices (Official)](https://clickhouse.com/docs/best-practices)
- [Choosing a Primary Key](https://clickhouse.com/docs/best-practices/choosing-a-primary-key)
- [Choosing a Partitioning Key](https://clickhouse.com/docs/best-practices/choosing-a-partitioning-key)
- [Avoiding Mutations](https://clickhouse.com/docs/best-practices/avoid-mutations)
- [Minimizing JOINs](https://clickhouse.com/docs/best-practices/minimize-optimize-joins)
- Source patterns from [ClickHouse/agent-skills](https://github.com/ClickHouse/agent-skills) (Apache-2.0)
