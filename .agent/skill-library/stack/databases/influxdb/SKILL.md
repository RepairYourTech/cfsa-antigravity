---
name: influxdb
description: "Expert InfluxDB guide covering bucket and measurement design, Flux query language, line protocol ingestion, retention policies, downsampling with tasks, continuous queries, driver setup, cross-store coordination, and security hardening. Use when building time-series monitoring, IoT telemetry, or metrics pipelines."
version: 1.0.0
---

# InfluxDB Expert Guide

> Use this skill when designing time-series schemas, writing Flux queries, planning retention and downsampling strategies, setting up InfluxDB clients, or coordinating InfluxDB with primary stores. Targets InfluxDB 3.x / InfluxDB Cloud.

## When to Use This Skill

- Time-series metrics collection (application monitoring, infrastructure metrics)
- IoT sensor data ingestion and querying
- Real-time dashboards with time-windowed aggregations
- Downsampling and retention management for long-term time-series storage
- High-throughput write workloads with time-ordered data

## When NOT to Use This Skill

- Relational data with JOINs → use PostgreSQL
- Graph traversals → use Neo4j
- Vector similarity search → use Qdrant or pgvector
- General-purpose document storage → use MongoDB or SurrealDB
- Time-series co-located with relational data → consider TimescaleDB (PostgreSQL extension)

---

## 1. Data Model

### Buckets (Database Equivalent)

```bash
# Create a bucket with 30-day retention
influx bucket create \
    --name metrics \
    --retention 30d \
    --org my-org
```

### Measurement Design

Measurements are analogous to tables. Each data point has:
- **Measurement name** — the "table"
- **Tags** — indexed key-value pairs (strings only) for filtering
- **Fields** — non-indexed values (any type) for the actual data
- **Timestamp** — nanosecond-precision time

```
// Line protocol format
cpu,host=server01,region=us-east usage_idle=98.5,usage_user=1.2 1640000000000000000
│    │                          │                                │
│    └── tags (indexed)         └── fields (not indexed)         └── timestamp (ns)
└── measurement
```

### Tag vs Field Decision

| Criterion | Tag | Field |
|-----------|-----|-------|
| Used in WHERE/GROUP BY? | ✅ Tag | ❌ Field |
| High cardinality (>100K unique values)? | ❌ Avoid | ✅ Field |
| Numeric/boolean value? | ❌ Strings only | ✅ Any type |
| Needs aggregation (sum, mean)? | ❌ | ✅ Field |

> ⚠️ **High-cardinality tags kill performance.** Never use UUIDs, timestamps, or unbounded strings as tags.

---

## 2. Write Patterns

### Line Protocol (Preferred)

```python
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS

client = InfluxDBClient(
    url=os.environ["INFLUXDB_URL"],
    token=os.environ["INFLUXDB_TOKEN"],
    org=os.environ["INFLUXDB_ORG"],
)
write_api = client.write_api(write_options=SYNCHRONOUS)

# Single point
point = Point("cpu") \
    .tag("host", "server01") \
    .tag("region", "us-east") \
    .field("usage_idle", 98.5) \
    .field("usage_user", 1.2) \
    .time(datetime.utcnow(), WritePrecision.MS)

write_api.write(bucket="metrics", record=point)
```

### Batch Writes

```python
from influxdb_client.client.write_api import WriteOptions

write_api = client.write_api(write_options=WriteOptions(
    batch_size=5000,
    flush_interval=1000,  # ms
    jitter_interval=200,
))

# Write many points — batched automatically
for metric in metrics:
    write_api.write(bucket="metrics", record=metric)
```

---

## 3. Query Patterns (Flux)

### Basic Query

```flux
from(bucket: "metrics")
    |> range(start: -1h)
    |> filter(fn: (r) => r._measurement == "cpu")
    |> filter(fn: (r) => r.host == "server01")
    |> filter(fn: (r) => r._field == "usage_idle")
```

### Aggregation (Windowed)

```flux
from(bucket: "metrics")
    |> range(start: -24h)
    |> filter(fn: (r) => r._measurement == "cpu" and r._field == "usage_idle")
    |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
    |> yield(name: "mean_cpu_idle")
```

### Group By

```flux
from(bucket: "metrics")
    |> range(start: -1h)
    |> filter(fn: (r) => r._measurement == "cpu")
    |> group(columns: ["host", "region"])
    |> mean()
```

### Join

```flux
cpu = from(bucket: "metrics")
    |> range(start: -1h)
    |> filter(fn: (r) => r._measurement == "cpu")

mem = from(bucket: "metrics")
    |> range(start: -1h)
    |> filter(fn: (r) => r._measurement == "mem")

join(tables: {cpu: cpu, mem: mem}, on: ["_time", "host"])
```

> **InfluxDB 3.x** also supports SQL queries via the Flight SQL interface, reducing the need for Flux in many cases.

---

## 4. Retention & Downsampling

### Bucket Retention

```bash
# Set retention to 90 days
influx bucket update --id <bucket-id> --retention 90d
```

### Downsampling Tasks

```flux
option task = {name: "downsample_cpu_1h", every: 1h}

from(bucket: "metrics")
    |> range(start: -task.every)
    |> filter(fn: (r) => r._measurement == "cpu")
    |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
    |> to(bucket: "metrics_downsampled", org: "my-org")
```

### Multi-Tier Retention Strategy

| Tier | Bucket | Retention | Resolution |
|------|--------|-----------|------------|
| Hot | `metrics` | 7 days | Raw (1s) |
| Warm | `metrics_5m` | 90 days | 5-minute aggregates |
| Cold | `metrics_1h` | 2 years | 1-hour aggregates |

---

## 5. Driver Setup

### Python

```python
from influxdb_client import InfluxDBClient

client = InfluxDBClient(
    url=os.environ["INFLUXDB_URL"],
    token=os.environ["INFLUXDB_TOKEN"],
    org=os.environ["INFLUXDB_ORG"],
)

query_api = client.query_api()
write_api = client.write_api()

# Always close
client.close()
```

### JavaScript/TypeScript

```typescript
import { InfluxDB } from '@influxdata/influxdb-client';

const influx = new InfluxDB({
    url: process.env.INFLUXDB_URL!,
    token: process.env.INFLUXDB_TOKEN!,
});

const queryApi = influx.getQueryApi(process.env.INFLUXDB_ORG!);
const writeApi = influx.getWriteApi(process.env.INFLUXDB_ORG!, 'metrics');
```

### Go

```go
import influxdb2 "github.com/influxdata/influxdb-client-go/v2"

client := influxdb2.NewClient(
    os.Getenv("INFLUXDB_URL"),
    os.Getenv("INFLUXDB_TOKEN"),
)
defer client.Close()

writeAPI := client.WriteAPIBlocking(os.Getenv("INFLUXDB_ORG"), "metrics")
queryAPI := client.QueryAPI(os.Getenv("INFLUXDB_ORG"))
```

---

## 6. Cross-Store Coordination

### Canonical ID Rule

InfluxDB is a **secondary store** — it stores time-series projections, not source-of-truth entities. Use the primary store's identifier as a tag value:

```
cpu,host=server01,entity_id=primary-uuid usage_idle=98.5 1640000000000000000
```

### Sync Pattern

- Time-series data flows **one-way** into InfluxDB (write-only from the application's perspective)
- Entities are **not** created in InfluxDB — only their metrics are recorded
- Deletion of an entity in the primary store does not require deleting historical metrics

---

## 7. Security

- **Token-based auth** — use scoped tokens with least-privilege (read-only for dashboards, write-only for ingestion)
- **Network isolation** — keep InfluxDB behind VPC; never expose port 8086 publicly
- **TLS** — always enable HTTPS in production
- **Bucket-level access** — scope tokens to specific buckets

---

## 8. Common Anti-Patterns

1. **High-cardinality tags** — using UUIDs or unbounded strings as tags creates series explosion
2. **Missing retention policies** — unbounded data grows storage costs indefinitely
3. **No downsampling** — querying raw data over long time ranges is slow; downsample for dashboards
4. **Using InfluxDB as primary store** — it's a time-series database, not a general-purpose store
5. **Single-point writes** — always batch writes for throughput
6. **Querying without time range** — every Flux query must have `range()` to avoid scanning all data
