---
name: distributed-tracing
description: |
  Implement distributed tracing across microservices with Jaeger, Zipkin, and W3C TraceContext. Use when: setting up trace propagation, configuring Jaeger or Zipkin, understanding span relationships, choosing sampling strategies, or correlating traces with logs and metrics.
version: 1.0.0
---

# Distributed Tracing

**Status**: Production Ready
**Last Updated**: 2026-02-24

---

## Description

Distributed tracing tracks requests as they flow through multiple services, providing end-to-end visibility into latency, errors, and dependencies. It is essential for debugging and performance optimization in microservice architectures.

## When to Use

- Setting up trace propagation (W3C TraceContext, B3)
- Configuring Jaeger for trace collection and visualization
- Configuring Zipkin for trace collection and visualization
- Understanding span relationships (parent/child, follows-from)
- Choosing between head-based and tail-based sampling
- Planning trace storage and retention policies
- Correlating traces with logs and metrics

---

## Key Concepts

### Trace Propagation Formats

| Format | Standard | Use Case |
|--------|----------|----------|
| **W3C TraceContext** | W3C Recommendation | Default for OpenTelemetry, broadly supported |
| **B3** | Zipkin | Legacy Zipkin ecosystems, broad language support |
| **Jaeger** | Jaeger-specific | Jaeger-native environments (being deprecated in favor of W3C) |

### Span Relationships

| Relationship | Meaning |
|---|---|
| **ChildOf** | The parent span depends on the child span's result |
| **FollowsFrom** | The parent span does not depend on the child (fire-and-forget) |

### Sampling Strategies

| Strategy | Description | Trade-off |
|----------|-------------|-----------|
| **Head-based** | Decision made at trace start | Simple, but may miss interesting traces |
| **Tail-based** | Decision made after trace completes | Captures errors/slow traces, but requires buffering |
| **Adaptive** | Adjusts rate based on traffic volume | Balances cost and coverage |

---

## Best Practices

1. **Use W3C TraceContext** — it is the industry standard and supported by all major tracing backends
2. **Propagate context through all transport layers** — HTTP headers, message queue metadata, gRPC metadata
3. **Set span names to describe the operation** — `POST /api/orders` not `handler`
4. **Record errors on spans** — set span status to ERROR and call `recordException`
5. **Use tail-based sampling for production** — capture all error and high-latency traces while sampling normal traffic
6. **Correlate traces with logs** — inject `trace_id` and `span_id` into log records for cross-signal navigation
7. **Set retention policies** — keep error traces longer than normal traces to support incident investigation
8. **Monitor trace pipeline health** — alert on dropped spans, exporter failures, and collector queue depth

---

## Common Patterns

### Jaeger Setup (Docker Compose)

```yaml
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"   # Jaeger UI
      - "4317:4317"     # OTLP gRPC
      - "4318:4318"     # OTLP HTTP
    environment:
      COLLECTOR_OTLP_ENABLED: "true"
```

### Zipkin Setup (Docker Compose)

```yaml
services:
  zipkin:
    image: openzipkin/zipkin:latest
    ports:
      - "9411:9411"     # Zipkin UI + API
```

### W3C TraceContext Header

```
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
```

Format: `version-traceId-spanId-traceFlags`

### Correlating Traces with Logs

```typescript
import { trace, context } from "@opentelemetry/api";

function getTraceContext() {
  const span = trace.getActiveSpan();
  if (!span) return {};
  const ctx = span.spanContext();
  return {
    trace_id: ctx.traceId,
    span_id: ctx.spanId,
    trace_flags: ctx.traceFlags,
  };
}

// Inject into structured logs
logger.info({ ...getTraceContext(), message: "Order processed", orderId });
```

---

## Anti-Patterns

| Anti-Pattern | Why It Hurts | Correct Approach |
|---|---|---|
| Not propagating context across async boundaries | Broken traces, orphan spans | Use context-aware async utilities |
| Sampling at 100% in production | Storage costs explode, performance impact | Use 5–20% head-based or tail-based sampling |
| Generic span names | Cannot filter or search effectively | Use descriptive, route-based span names |
| Ignoring span status on errors | Errors invisible in trace UI | Always set ERROR status and record exception |
| No trace-log correlation | Cannot jump from trace to logs | Inject trace_id into all structured logs |
| Unbounded trace retention | Storage grows without limit | Set retention policies (7–30 days typical) |

---

**Last verified**: 2026-02-24 | **Skill version**: 1.0.0
