---
name: opentelemetry
description: |
  Set up OpenTelemetry for distributed tracing, metrics, and structured logging with trace correlation. Use when: configuring OpenTelemetry SDK for Node.js/Python/Go/Rust, setting up OTLP exporters, integrating with Jaeger or Zipkin, implementing auto or manual instrumentation, context propagation, or choosing sampling strategies.
version: 1.0.0
---

# OpenTelemetry

**Status**: Production Ready
**Last Updated**: 2026-02-24

---

## Description

OpenTelemetry (OTel) is the vendor-neutral observability framework for generating, collecting, and exporting telemetry data — traces, metrics, and logs. It provides a single set of APIs, SDKs, and tooling across languages.

## When to Use

- Setting up distributed tracing with spans and traces
- Collecting application metrics (counters, histograms, gauges)
- Implementing structured logging with trace correlation
- Configuring the OTel SDK for Node.js, Python, Go, or Rust
- Setting up exporters (OTLP, Jaeger, Zipkin)
- Deciding between auto and manual instrumentation
- Implementing context propagation across service boundaries
- Choosing head-based vs tail-based sampling strategies

---

## Key Concepts

### Signals

| Signal | Purpose | Examples |
|--------|---------|----------|
| **Traces** | Request flow across services | HTTP requests, database queries, RPC calls |
| **Metrics** | Quantitative measurements over time | Request count, latency histogram, CPU gauge |
| **Logs** | Discrete event records with trace context | Structured JSON logs correlated to spans |

### Core Components

- **API** — Stable, vendor-neutral interface for instrumentation
- **SDK** — Configurable implementation of the API (sampling, export, processing)
- **Exporters** — Send telemetry to backends (OTLP, Jaeger, Zipkin, Prometheus)
- **Collector** — Vendor-agnostic proxy for receiving, processing, and exporting telemetry
- **Instrumentation Libraries** — Auto-instrument common frameworks and libraries

### Context Propagation

- W3C TraceContext (default, recommended)
- B3 (Zipkin compatibility)
- Baggage for cross-service key-value pairs

### Sampling Strategies

| Strategy | When to Use |
|----------|-------------|
| **AlwaysOn** | Development, low-traffic services |
| **AlwaysOff** | Disable tracing entirely |
| **TraceIdRatioBased** | Production — sample a percentage of traces |
| **ParentBased** | Respect upstream sampling decisions |
| **Tail-based (Collector)** | Sample based on completed trace attributes (errors, latency) |

---

## Best Practices

1. **Start with auto-instrumentation** — instrument frameworks and libraries automatically, add manual spans only where needed
2. **Use OTLP as the export protocol** — it is the native OTel protocol and supports all three signals
3. **Propagate context** — ensure W3C TraceContext headers flow across all service boundaries
4. **Set meaningful span names** — use `HTTP GET /api/users` not `span-1`
5. **Add semantic attributes** — follow OpenTelemetry semantic conventions for consistent metadata
6. **Sample wisely in production** — 5–20% trace sampling is typical; keep error sampling at 100%
7. **Use the Collector** — deploy the OTel Collector as a sidecar or gateway to decouple instrumentation from export
8. **Correlate logs with traces** — inject `trace_id` and `span_id` into structured log records

---

## Common Patterns

### Node.js SDK Setup

```typescript
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";

const sdk = new NodeSDK({
  serviceName: "my-service",
  traceExporter: new OTLPTraceExporter({ url: "http://localhost:4318/v1/traces" }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: "http://localhost:4318/v1/metrics" }),
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

### Custom Span

```typescript
import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("my-service");

async function processOrder(orderId: string) {
  return tracer.startActiveSpan("process-order", async (span) => {
    span.setAttribute("order.id", orderId);
    try {
      const result = await doWork(orderId);
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (error) {
      span.setStatus({ code: 2, message: String(error) }); // ERROR
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### Custom Metrics

```typescript
import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("my-service");

const requestCounter = meter.createCounter("http.requests.total", {
  description: "Total HTTP requests",
});

const latencyHistogram = meter.createHistogram("http.request.duration_ms", {
  description: "HTTP request latency in milliseconds",
});

// Usage
requestCounter.add(1, { method: "GET", route: "/api/users" });
latencyHistogram.record(42, { method: "GET", route: "/api/users" });
```

---

## Anti-Patterns

| Anti-Pattern | Why It Hurts | Correct Approach |
|---|---|---|
| No sampling in production | Enormous data volume, high cost | Use ratio-based or tail-based sampling |
| Ignoring context propagation | Broken traces across services | Ensure W3C headers propagate everywhere |
| Too many custom spans | Noisy traces, performance overhead | Instrument meaningful operations only |
| Hardcoded exporter URLs | Inflexible deployments | Use environment variables (`OTEL_EXPORTER_OTLP_ENDPOINT`) |
| Skipping semantic conventions | Inconsistent attribute names | Follow OTel semantic conventions |
| Not ending spans | Memory leaks, orphan spans | Always call `span.end()` in a `finally` block |

---

**Last verified**: 2026-02-24 | **Skill version**: 1.0.0
