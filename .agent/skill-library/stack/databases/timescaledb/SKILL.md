---
name: timescaledb
description: "Expert TimescaleDB guide covering hypertable design, continuous aggregates, compression, retention, hybrid time-series/relational queries, migration from vanilla PostgreSQL, and common anti-patterns. Use when designing time-series data models, building metrics pipelines, or integrating time-ordered data with relational entities."
version: 1.0.0
---

# TimescaleDB Expert Guide

> Use this skill when designing time-series data models, creating hypertables, building continuous aggregates, configuring compression and retention policies, writing hybrid time-series/relational queries, or migrating existing PostgreSQL tables to hypertables. This skill assumes TimescaleDB 2.x (the current major version) unless noted otherwise.

## When to Use This Skill

- Storing time-ordered data: metrics, events, logs, sensor readings, IoT telemetry, financial ticks
- Building dashboards that aggregate data over time windows
- Designing retention and compression policies for cost-effective long-term storage
- Writing queries that join time-series data with relational entities (devices, users, organizations)
- Migrating an existing PostgreSQL table with a time column to a hypertable

## When NOT to Use This Skill

- Non-time-ordered data with no temporal dimension → use the primary relational store
- Graph relationships → use Neo4j
- Semantic search / embeddings → use a vector store (Qdrant, pgvector)
- Simple key-value caching → use Redis

---

## 1. Hypertable Design

### Creating a Hypertable

Every hypertable starts as a regular PostgreSQL table, then is converted:

```sql
-- Step 1: Create a regular table
CREATE TABLE metrics (
  time        TIMESTAMPTZ NOT NULL,
  device_id   TEXT        NOT NULL,
  temperature DOUBLE PRECISION,
  humidity    DOUBLE PRECISION,
  battery_pct SMALLINT
);

-- Step 2: Convert to hypertable
SELECT create_hypertable('metrics', 'time');
```

### Time Column Requirements

**Always use `TIMESTAMPTZ`** — never `TIMESTAMP` without timezone:

```sql
-- GOOD: timezone-aware
time TIMESTAMPTZ NOT NULL

-- BAD: timezone-naive — leads to ambiguity across regions and DST transitions
time TIMESTAMP NOT NULL
```

Why: TimescaleDB uses the time column for chunk partitioning. Timezone-naive timestamps cause incorrect chunk boundaries when the application and database are in different timezones.

### Chunk Time Interval

The `chunk_time_interval` determines how large each chunk is. This is the single most important tuning parameter.

**Rule of thumb:** Chunks should hold approximately 25% of available RAM for hot (recent) data.

| Data Granularity | Typical Interval | Rationale |
|-----------------|-----------------|-----------|
| Sub-second / second-level | `1 day` | High volume — 1 day keeps each chunk manageable |
| Minute-level | `1 week` | Moderate volume — 1 week gives good compression ratios |
| Hourly | `1 month` | Lower volume — 1 month balances chunk count vs size |
| Daily | `3 months` | Very low volume — larger chunks avoid excessive metadata |

```sql
-- Set chunk interval at creation
SELECT create_hypertable('metrics', 'time',
  chunk_time_interval => INTERVAL '1 day'
);

-- Change interval for future chunks (does not affect existing chunks)
SELECT set_chunk_time_interval('metrics', INTERVAL '7 days');
```

### Space Partitioning

For high-cardinality workloads, add a second partitioning dimension:

```sql
-- Partition by time AND device_id (hash-based)
SELECT create_hypertable('metrics', 'time',
  chunk_time_interval => INTERVAL '1 day'
);
SELECT add_dimension('metrics', 'device_id', number_partitions => 4);
```

**When to use space partitioning:**

- You have many distinct devices/tenants writing concurrently
- Queries almost always filter by `device_id` in addition to time
- You need to distribute write load across multiple disks/tablespaces

**When NOT to use space partitioning:**

- Low cardinality (< 100 devices) — chunk pruning by time alone is sufficient
- Queries rarely filter by the space dimension — the extra chunks add overhead without benefit

### Inspecting Chunks

```sql
-- List all chunks with sizes
SELECT
  hypertable_name,
  chunk_name,
  range_start,
  range_end,
  before_compression_total_bytes,
  after_compression_total_bytes
FROM timescaledb_information.chunks
WHERE hypertable_name = 'metrics'
ORDER BY range_start DESC
LIMIT 20;

-- Count total chunks
SELECT count(*)
FROM timescaledb_information.chunks
WHERE hypertable_name = 'metrics';
```

---

## 2. Continuous Aggregates

### What They Are

Continuous aggregates are materialized views that automatically keep pre-computed aggregations in sync with the underlying hypertable. Since TimescaleDB 2.x, they are **real-time by default** — queries combine materialized data with the latest raw data that hasn't been materialized yet.

### Creating a Continuous Aggregate

```sql
-- Pre-compute hourly averages
CREATE MATERIALIZED VIEW metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS bucket,
  device_id,
  avg(temperature) AS avg_temp,
  max(temperature) AS max_temp,
  min(temperature) AS min_temp,
  avg(humidity) AS avg_humidity,
  count(*) AS sample_count
FROM metrics
GROUP BY bucket, device_id
WITH NO DATA;  -- Don't backfill immediately (do it with a policy or manual refresh)
```

### time_bucket Function

```sql
-- Standard buckets
time_bucket('5 minutes', time)
time_bucket('1 hour', time)
time_bucket('1 day', time)
time_bucket('1 week', time)

-- Offset bucket start (e.g., daily buckets starting at 06:00 UTC)
time_bucket('1 day', time, TIMESTAMPTZ '2020-01-01 06:00:00+00')
```

### Refresh Policies

```sql
-- Automatically refresh the aggregate
-- Refreshes data from 3 hours ago to 1 hour ago, every hour
SELECT add_continuous_aggregate_policy('metrics_hourly',
  start_offset    => INTERVAL '3 hours',
  end_offset      => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour'
);
```

**Why `end_offset` is not zero:** In-progress time buckets (the current hour) may receive more data. Setting `end_offset => INTERVAL '1 hour'` ensures only fully complete buckets are materialized. The real-time aggregation feature automatically includes the latest data in query results.

### Manual Refresh

```sql
-- Backfill historical data
CALL refresh_continuous_aggregate('metrics_hourly',
  '2024-01-01',
  '2024-06-01'
);
```

### Real-Time Aggregates

Real-time aggregation is enabled by default in TimescaleDB 2.x. When a query hits a continuous aggregate:

1. Materialized data is read from the aggregate
2. Raw data newer than the last materialization is queried from the hypertable
3. Both are combined and returned as a single result

To disable (e.g., for strict performance guarantees at the cost of freshness):

```sql
ALTER MATERIALIZED VIEW metrics_hourly SET (timescaledb.materialized_only = true);
```

### When to Use Continuous Aggregates

| Scenario | Use Continuous Aggregate? |
|----------|--------------------------|
| Dashboard showing 30-day trends | ✅ Yes — avoids scanning 30 days of raw data on every page load |
| One-off ad-hoc analysis query | ❌ No — just query the raw hypertable directly |
| Real-time alerting on latest values | ❌ No — query raw data for sub-second freshness |
| Multi-resolution drill-down (hourly → daily → monthly) | ✅ Yes — create one aggregate per resolution |

### Hierarchical Continuous Aggregates

You can build aggregates on top of other aggregates:

```sql
-- Daily aggregate built from the hourly aggregate
CREATE MATERIALIZED VIEW metrics_daily
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', bucket) AS bucket,
  device_id,
  avg(avg_temp) AS avg_temp,
  max(max_temp) AS max_temp,
  min(min_temp) AS min_temp,
  sum(sample_count) AS sample_count
FROM metrics_hourly
GROUP BY time_bucket('1 day', bucket), device_id
WITH NO DATA;
```

---

## 3. Compression Policy

### Enabling Compression

```sql
-- Configure compression settings
ALTER TABLE metrics SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'device_id',
  timescaledb.compress_orderby = 'time DESC'
);
```

**`compress_segmentby`** — columns that queries filter by. Data is grouped by segment before compression, so queries that filter by `device_id` only decompress the relevant segments.

**`compress_orderby`** — the sort order within each segment. Use `time DESC` for queries that read recent data first.

### Adding a Compression Policy

```sql
-- Compress chunks older than 7 days
SELECT add_compression_policy('metrics', INTERVAL '7 days');
```

### Compression Ratios

Typical compression ratios for time-series data:

| Data Type | Expected Ratio |
|-----------|---------------|
| Numeric metrics (temperature, counts) | 10–20× |
| Mixed numeric + text | 5–15× |
| High-cardinality string columns | 3–8× |
| Already-compressed or random data | 1–3× |

### Checking Compression Status

```sql
-- Compression stats per hypertable
SELECT
  hypertable_name,
  sum(before_compression_total_bytes) AS total_uncompressed,
  sum(after_compression_total_bytes) AS total_compressed,
  round(
    sum(before_compression_total_bytes)::numeric /
    NULLIF(sum(after_compression_total_bytes), 0)::numeric,
    1
  ) AS compression_ratio
FROM timescaledb_information.chunks
WHERE is_compressed = true
GROUP BY hypertable_name;
```

### Decompressing for Schema Changes

Compressed chunks are read-only. To alter the schema or backfill data:

```sql
-- Decompress a specific chunk
SELECT decompress_chunk('_timescaledb_internal._hyper_1_42_chunk');

-- Decompress all chunks in a time range
SELECT decompress_chunk(c.chunk_name)
FROM timescaledb_information.chunks c
WHERE c.hypertable_name = 'metrics'
  AND c.is_compressed = true
  AND c.range_start >= '2024-01-01'
  AND c.range_end <= '2024-02-01';
```

After making changes, re-compress:

```sql
SELECT compress_chunk(c.chunk_name)
FROM timescaledb_information.chunks c
WHERE c.hypertable_name = 'metrics'
  AND c.is_compressed = false
  AND c.range_end < NOW() - INTERVAL '7 days';
```

---

## 4. Retention Policy

### Automated Data Expiry

```sql
-- Drop chunks older than 90 days
SELECT add_retention_policy('metrics', INTERVAL '90 days');
```

This physically deletes entire chunks (not individual rows), making it extremely fast.

### Tiered Storage

TimescaleDB supports moving cold chunks to object storage (e.g., S3) instead of deleting them:

```sql
-- Move chunks older than 30 days to the tiered storage (TimescaleDB Cloud with tiering)
SELECT add_tiering_policy('metrics', INTERVAL '30 days');
```

Tiered chunks remain queryable (slower reads) but do not consume local disk space.

### Continuous Aggregates Outlive Raw Data

A continuous aggregate can retain summarized data even after the raw data is dropped:

```
Raw data:          [-----retained-----][---dropped---]
                   |<--- 90 days ----->|
Hourly aggregate:  [--retained for 1 year--]
Daily aggregate:   [--retained for 5 years--]
```

Set separate retention policies per aggregate:

```sql
-- Raw data: 90 days
SELECT add_retention_policy('metrics', INTERVAL '90 days');

-- Hourly aggregate: 1 year
SELECT add_retention_policy('metrics_hourly', INTERVAL '365 days');

-- Daily aggregate: 5 years
SELECT add_retention_policy('metrics_daily', INTERVAL '1825 days');
```

### Cost vs Debuggability Tradeoff

| Approach | Cost | Debuggability |
|----------|------|---------------|
| Keep all raw data | High storage cost | Full replay and drill-down capability |
| 90-day raw + 1-year hourly | Moderate | Can investigate recent issues in detail; older issues only at hourly resolution |
| 30-day raw + 1-year daily | Low | Recent debugging OK; older issues require daily-level clues |
| Aggregate-only (no raw retention) | Minimal | Cannot investigate individual events |

**Recommendation:** Start with 90-day raw + 1-year hourly aggregate. Adjust based on actual storage costs and debugging needs after the first month of production data.

---

## 5. Hybrid Queries

### TimescaleDB IS PostgreSQL

TimescaleDB is a PostgreSQL extension — all Postgres features work:

- Common Table Expressions (CTEs)
- Window functions
- Lateral joins
- Row-Level Security (RLS)
- JSONB columns and operators
- Foreign keys to regular tables
- Triggers and functions

### Joining Hypertables with Regular Tables

The most common pattern: join a `metrics` hypertable with a `devices` regular table to enrich time-series rows with device metadata.

```sql
-- Regular table: device metadata
CREATE TABLE devices (
  device_id    TEXT PRIMARY KEY,
  device_name  TEXT NOT NULL,
  location     TEXT NOT NULL,
  owner_id     UUID REFERENCES users(id),
  installed_at TIMESTAMPTZ NOT NULL
);

-- Hypertable: device metrics
CREATE TABLE metrics (
  time        TIMESTAMPTZ NOT NULL,
  device_id   TEXT        NOT NULL REFERENCES devices(device_id),
  temperature DOUBLE PRECISION,
  humidity    DOUBLE PRECISION
);
SELECT create_hypertable('metrics', 'time');
```

### Query: Latest reading per device with metadata

```sql
SELECT DISTINCT ON (d.device_id)
  d.device_id,
  d.device_name,
  d.location,
  m.time AS last_reading_at,
  m.temperature,
  m.humidity
FROM devices d
JOIN metrics m ON m.device_id = d.device_id
WHERE m.time >= NOW() - INTERVAL '1 hour'
ORDER BY d.device_id, m.time DESC;
```

### Query: Hourly averages for a specific location

```sql
SELECT
  time_bucket('1 hour', m.time) AS hour,
  d.location,
  avg(m.temperature) AS avg_temp,
  avg(m.humidity) AS avg_humidity,
  count(*) AS readings
FROM metrics m
JOIN devices d ON d.device_id = m.device_id
WHERE d.location = 'Building A - Floor 3'
  AND m.time >= NOW() - INTERVAL '24 hours'
GROUP BY hour, d.location
ORDER BY hour DESC;
```

### Query: Window function — detect temperature spikes

```sql
WITH readings AS (
  SELECT
    time,
    device_id,
    temperature,
    lag(temperature) OVER (
      PARTITION BY device_id ORDER BY time
    ) AS prev_temp
  FROM metrics
  WHERE time >= NOW() - INTERVAL '1 hour'
)
SELECT
  time,
  device_id,
  temperature,
  prev_temp,
  temperature - prev_temp AS delta
FROM readings
WHERE abs(temperature - prev_temp) > 5.0
ORDER BY abs(temperature - prev_temp) DESC;
```

### Query: Lateral join — top 3 recent readings per device

```sql
SELECT d.device_id, d.device_name, latest.*
FROM devices d,
LATERAL (
  SELECT time, temperature, humidity
  FROM metrics m
  WHERE m.device_id = d.device_id
  ORDER BY m.time DESC
  LIMIT 3
) AS latest
ORDER BY d.device_id, latest.time DESC;
```

---

## 6. Migration from Vanilla PostgreSQL

### Converting an Existing Table

If the table already has data, use `migrate_data`:

```sql
-- Table already exists with data
SELECT create_hypertable('existing_metrics', 'time',
  migrate_data => true
);
```

> ⚠️ **This locks the table during migration.** For large tables, schedule during a maintenance window.

### Backfilling Data in Batches

For very large backfills, avoid a single massive `INSERT` — it creates one huge chunk:

```sql
-- BAD: Single bulk insert
INSERT INTO metrics_hypertable
SELECT * FROM metrics_old;

-- GOOD: Batch by time range
DO $$
DECLARE
  batch_start TIMESTAMPTZ := '2023-01-01';
  batch_end   TIMESTAMPTZ;
BEGIN
  WHILE batch_start < '2024-01-01' LOOP
    batch_end := batch_start + INTERVAL '1 day';

    INSERT INTO metrics_hypertable
    SELECT * FROM metrics_old
    WHERE time >= batch_start AND time < batch_end;

    COMMIT;
    batch_start := batch_end;
  END LOOP;
END $$;
```

### Index Considerations Post-Conversion

When a regular table is converted to a hypertable:

- Existing indexes are preserved
- New chunk-level indexes are created automatically for each chunk
- The global index is replaced by per-chunk indexes (this is transparent to queries)

Review indexes after conversion:

```sql
-- List indexes on the hypertable
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'metrics';

-- Check that frequently filtered columns are indexed
-- TimescaleDB automatically creates a time index, but device_id may need one
CREATE INDEX idx_metrics_device_id ON metrics (device_id, time DESC);
```

### Pre-Migration Checklist

| Step | Action |
|------|--------|
| 1 | Verify the time column is `TIMESTAMPTZ` (not `TIMESTAMP`) |
| 2 | Choose `chunk_time_interval` based on data volume |
| 3 | Identify columns for `compress_segmentby` |
| 4 | Plan a maintenance window for `migrate_data` if the table is large |
| 5 | Test on a staging copy first |

---

## 7. Driver Setup

### No Special Client Needed

TimescaleDB uses the standard PostgreSQL wire protocol. Any PostgreSQL client library connects normally:

| Language | Library | Connection |
|----------|---------|-----------|
| JavaScript/TypeScript | `postgres` (postgres.js), `pg` | Standard Postgres DSN |
| Python | `psycopg2`, `asyncpg`, `sqlalchemy` | Standard Postgres DSN |
| Go | `pgx`, `database/sql` + `lib/pq` | Standard Postgres DSN |
| Rust | `tokio-postgres`, `sqlx` | Standard Postgres DSN |
| Java | JDBC (`org.postgresql.Driver`) | Standard Postgres JDBC URL |

### Connection String

```
postgresql://user:password@host:5432/dbname?sslmode=require
```

No TimescaleDB-specific parameters in the connection string.

### TimescaleDB-Specific Settings

```sql
-- Disable telemetry for privacy-sensitive deployments
ALTER SYSTEM SET timescaledb.telemetry_level = 'off';
SELECT pg_reload_conf();

-- Verify TimescaleDB is loaded
SHOW timescaledb.version;
```

### ORM Compatibility

TimescaleDB works with any PostgreSQL-compatible ORM:

- **Drizzle ORM** — hypertables are regular tables; use raw SQL for `create_hypertable()` and policies
- **Prisma** — same; use `$executeRawUnsafe` for TimescaleDB-specific DDL
- **SQLAlchemy** — the `sqlalchemy-timescaledb` dialect adds hypertable support

**Rule:** Use the ORM for standard CRUD on regular tables. Use raw SQL for TimescaleDB-specific operations (hypertable creation, policies, continuous aggregates).

---

## 8. Common Anti-Patterns

### 1. Wrong Chunk Interval

**Problem:** Chunk interval too small → too many chunks → slow metadata queries and planning overhead.

```sql
-- BAD: 1-minute chunks on a table with millions of rows per day
SELECT create_hypertable('metrics', 'time',
  chunk_time_interval => INTERVAL '1 minute'
);
-- Results in 1,440 chunks per day, 43,800 per month — metadata queries become slow
```

**Problem:** Chunk interval too large → chunks cannot be pruned for range queries.

```sql
-- BAD: 1-year chunks
SELECT create_hypertable('metrics', 'time',
  chunk_time_interval => INTERVAL '1 year'
);
-- A query for "last 1 hour" still scans a 1-year chunk
```

**Fix:** Use the rule-of-thumb table in Section 1. Start with `1 day` for high-frequency data, `1 week` for moderate, `1 month` for low-frequency. Monitor chunk sizes with `timescaledb_information.chunks` and adjust.

### 2. Missing Indexes on Non-Time Columns

**Problem:** Hypertable chunk pruning only works on the time column. Queries filtering by `device_id` without an index on that column scan the entire chunk.

```sql
-- Chunk pruning eliminates old chunks, but within the matching chunks,
-- every row is scanned because device_id has no index
SELECT * FROM metrics
WHERE time >= NOW() - INTERVAL '1 hour'
  AND device_id = 'sensor-42';
```

**Fix:** Create a composite index on frequently filtered columns:

```sql
CREATE INDEX idx_metrics_device_time
ON metrics (device_id, time DESC);
```

### 3. Not Using Continuous Aggregates for Expensive Recurring Queries

**Problem:** A dashboard computes 30-day aggregates on every page load by scanning raw data.

```sql
-- Every page load runs this — scanning 30 days of raw data
SELECT
  time_bucket('1 day', time) AS day,
  avg(temperature)
FROM metrics
WHERE time >= NOW() - INTERVAL '30 days'
GROUP BY day
ORDER BY day;
```

**Fix:** Create a continuous aggregate and query it instead:

```sql
-- One-time setup
CREATE MATERIALIZED VIEW metrics_daily ...;
SELECT add_continuous_aggregate_policy(...);

-- Dashboard query — reads pre-computed data
SELECT bucket, avg_temp FROM metrics_daily
WHERE bucket >= NOW() - INTERVAL '30 days'
ORDER BY bucket;
```

### 4. Querying Without a Time Filter

**Problem:** Omitting `WHERE time >= ...` prevents chunk exclusion — the query scans ALL chunks.

```sql
-- BAD: No time filter — scans every chunk in the hypertable
SELECT avg(temperature) FROM metrics WHERE device_id = 'sensor-42';
```

**Fix:** Always include a time filter, even if generous:

```sql
-- GOOD: Chunk exclusion kicks in
SELECT avg(temperature) FROM metrics
WHERE device_id = 'sensor-42'
  AND time >= NOW() - INTERVAL '365 days';
```

### 5. Storing Non-Time-Series Data in Hypertables

**Problem:** Converting tables without a meaningful time dimension to hypertables.

```sql
-- BAD: Device metadata has no time-series nature
CREATE TABLE devices (id TEXT, name TEXT, location TEXT, updated_at TIMESTAMPTZ);
SELECT create_hypertable('devices', 'updated_at');
-- updated_at is not a time-series dimension — it's a last-modified timestamp
```

**Fix:** Only convert tables where the time column represents continuous, append-only time-series data. Device metadata belongs in a regular PostgreSQL table.

### 6. Single Large INSERT for Backfill

**Problem:** Inserting millions of rows in a single statement creates pressure on WAL, locks, and memory.

```sql
-- BAD: 100M rows in one statement
INSERT INTO metrics SELECT * FROM old_metrics;
```

**Fix:** Batch by time range as shown in Section 6 (Migration from Vanilla PostgreSQL).

### 7. Not Verifying TimescaleDB Extension is Loaded

**Problem:** Running TimescaleDB-specific SQL on a vanilla PostgreSQL instance.

```sql
-- Fails silently or with cryptic errors if the extension isn't loaded
SELECT create_hypertable('metrics', 'time');
-- ERROR: function create_hypertable(unknown, unknown) does not exist
```

**Fix:** Always verify on application startup:

```sql
SELECT installed_version FROM pg_available_extensions WHERE name = 'timescaledb';
-- Should return a version like '2.14.2'
-- If NULL, the extension is not installed
```
