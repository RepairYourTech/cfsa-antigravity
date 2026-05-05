---
name: kafka
description: "Expert Apache Kafka guide covering topic design (partitioning, retention, compaction), producer patterns (idempotency, batching, acks), consumer groups (rebalancing, offset management, exactly-once), Kafka Streams, Connect, Schema Registry (Avro/Protobuf), and operational best practices. Use when building event-driven architectures, streaming pipelines, or pub/sub systems with Kafka."
version: 1.0.0
---

# Apache Kafka Expert Guide

> Use this skill when designing event-driven architectures, streaming data pipelines, or pub/sub messaging with Apache Kafka.

## When to Use This Skill

- Building event-driven microservices
- Designing streaming ETL / data pipelines
- Implementing pub/sub messaging between services
- Processing high-throughput real-time events (logs, metrics, clickstreams)
- CQRS / event sourcing architectures

## When NOT to Use This Skill

- Simple task queues → use BullMQ or SQS
- Low-throughput request/reply → use REST or gRPC
- Real-time browser push → use WebSockets / Socket.io
- Small projects with < 1K events/sec → consider simpler alternatives (Redis Streams, NATS)

---

## 1. Topic Design (CRITICAL)

### Naming Convention

```
<domain>.<entity>.<event-type>

# Examples
orders.order.created
users.user.profile-updated
payments.payment.completed
inventory.stock.adjusted
```

### Partitioning Strategy

| Strategy | When | Key |
|----------|------|-----|
| By entity ID | Ordered per-entity processing | `user_id`, `order_id` |
| By tenant | Multi-tenant isolation | `tenant_id` |
| Round-robin | Max parallelism, no ordering needed | `null` key |
| By region | Data locality | `region_code` |

```
# Partition count guidelines
- Start with 2× expected consumer count
- Max ~50 partitions per topic for most use cases
- More partitions = more parallelism but higher overhead
```

### Retention & Compaction

| Policy | Use Case | Config |
|--------|----------|--------|
| Time-based | Event logs, metrics | `retention.ms=604800000` (7 days) |
| Size-based | Bounded storage | `retention.bytes=1073741824` (1GB) |
| Compacted | Latest-state snapshots | `cleanup.policy=compact` |
| Compact + delete | State with TTL | `cleanup.policy=compact,delete` |

```properties
# Compacted topic — keeps latest value per key
cleanup.policy=compact
min.compaction.lag.ms=3600000
delete.retention.ms=86400000
```

---

## 2. Producers (CRITICAL)

### Idempotent Producer

```properties
# ✅ Always enable idempotency
enable.idempotence=true
acks=all
retries=2147483647
max.in.flight.requests.per.connection=5
```

### Batching

```properties
# ✅ Batch for throughput
batch.size=65536          # 64KB per partition batch
linger.ms=10              # Wait up to 10ms to fill batch
compression.type=lz4      # Compress batches
buffer.memory=67108864    # 64MB producer buffer
```

### Error Handling

```
Producer sends → acks=all → all ISR replicas confirm
                → retries on transient errors (automatic with idempotency)
                → DLQ (Dead Letter Queue) for permanent failures

# Key rule: never silently drop messages
# Log failures, send to DLQ, alert on threshold
```

---

## 3. Consumers (CRITICAL)

### Consumer Group Patterns

```
# ✅ One consumer group per logical application
group.id=order-service

# ✅ Consumers in group = partition count for max parallelism
# 6 partitions → 6 consumers in group (max useful)
# Extra consumers sit idle
```

### Offset Management

| Strategy | When | Risk |
|----------|------|------|
| Auto-commit | Simple consumers, at-least-once OK | Duplicates on crash |
| Manual commit after processing | At-least-once guaranteed | Duplicates on crash before commit |
| Transactional (exactly-once) | Financial / critical processing | Higher latency |

```properties
# ✅ Manual commit for reliability
enable.auto.commit=false
auto.offset.reset=earliest

# Process → commit pattern:
# 1. poll()
# 2. process batch
# 3. commitSync()
```

### Rebalancing

```properties
# ✅ Cooperative rebalancing (no stop-the-world)
partition.assignment.strategy=org.apache.kafka.clients.consumer.CooperativeStickyAssignor

# ✅ Heartbeat tuning
session.timeout.ms=30000
heartbeat.interval.ms=10000
max.poll.interval.ms=300000
max.poll.records=500
```

---

## 4. Schema Registry

### Avro Schema Evolution

```json
{
  "type": "record",
  "name": "OrderCreated",
  "namespace": "com.example.orders",
  "fields": [
    {"name": "order_id", "type": "string"},
    {"name": "user_id", "type": "string"},
    {"name": "total_cents", "type": "long"},
    {"name": "currency", "type": "string", "default": "USD"},
    {"name": "created_at", "type": "long", "logicalType": "timestamp-millis"}
  ]
}
```

| Evolution Rule | Allowed |
|---------------|---------|
| Add field with default | ✅ Backward compatible |
| Remove field with default | ✅ Forward compatible |
| Rename field | ❌ Breaking |
| Change field type | ❌ Breaking |

---

## 5. Kafka Streams (Stateful Processing)

```
# Topology pattern
Source Topic → Filter → Map → GroupByKey → Aggregate → Sink Topic

# Use cases:
# - Real-time aggregations (counts, sums, averages)
# - Windowed operations (tumbling, hopping, session windows)
# - Stream-table joins (enrich events with reference data)
# - Exactly-once processing (with Kafka transactions)
```

---

## 6. Kafka Connect

```
# Source connectors: DB → Kafka
- Debezium (CDC from PostgreSQL, MySQL, MongoDB)
- JDBC Source

# Sink connectors: Kafka → external
- Elasticsearch Sink
- S3 Sink (Parquet/JSON)
- JDBC Sink
- BigQuery Sink
```

---

## 7. Common Anti-Patterns

1. **One giant topic for everything** — separate by domain and entity
2. **Too many partitions** — start small (2× consumers), scale up when needed
3. **No schema registry** — schema drift causes silent data corruption
4. **Auto-commit with long processing** — commits before processing completes → data loss
5. **Consuming without consumer groups** — lose offset tracking and rebalancing
6. **Not setting `acks=all`** — risking data loss on broker failure
7. **Synchronous produce in request path** — batch/async, or accept latency
8. **No DLQ** — poison messages block the entire partition

---

## References

- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Confluent Developer](https://developer.confluent.io/)
- [Schema Registry](https://docs.confluent.io/platform/current/schema-registry/)
- [Kafka Streams](https://kafka.apache.org/documentation/streams/)
