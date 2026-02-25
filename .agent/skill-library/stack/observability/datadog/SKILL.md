---
name: datadog
description: |
  Set up Datadog for APM, log management, metrics, dashboards, and alerting. Use when: configuring Datadog APM and trace collection, setting up log parsing and management, creating custom metrics, building dashboards and monitors, configuring alerting and SLOs, or integrating dd-trace libraries.
version: 1.0.0
---

# Datadog

**Status**: Production Ready
**Last Updated**: 2026-02-24

---

## Description

Datadog is a full-stack observability platform providing APM (distributed tracing), log management, infrastructure monitoring, metrics, dashboards, and alerting. This skill covers agent configuration, dd-trace library integration, log correlation with traces, and best practices for dashboards and SLOs.

## When to Use

- Setting up Datadog APM and trace collection
- Configuring log management and log parsing
- Creating custom metrics and dashboards
- Building monitors and configuring alerting
- Defining SLOs (Service Level Objectives)
- Setting up infrastructure monitoring
- Configuring the Datadog Agent
- Integrating dd-trace libraries (Node.js, Python, Go, Ruby, Java)
- Correlating logs with traces

---

## Key Concepts

### Datadog Agent

The Datadog Agent runs on your hosts or as a sidecar container. It collects metrics, traces, and logs and forwards them to the Datadog backend.

### APM (Application Performance Monitoring)

dd-trace libraries auto-instrument your application to capture distributed traces, including HTTP requests, database queries, cache operations, and message queue interactions.

### Log Management

Datadog ingests, indexes, and archives logs. Logs can be enriched with trace IDs for cross-signal correlation. Pipelines parse unstructured logs into structured fields.

### Metrics

Datadog supports custom metrics (counters, gauges, histograms, distributions) alongside infrastructure metrics. Metrics power dashboards, monitors, and SLOs.

### Monitors and SLOs

Monitors alert on threshold breaches, anomalies, or missing data. SLOs track service reliability over time windows (e.g., 99.9% availability over 30 days).

---

## Best Practices

1. **Use unified tagging** — apply consistent tags (`service`, `env`, `version`) across traces, logs, and metrics
2. **Enable log-trace correlation** — inject `dd.trace_id` and `dd.span_id` into log records
3. **Set appropriate sampling rates** — use Datadog's Ingestion Controls to manage trace volume and costs
4. **Build SLOs from meaningful SLIs** — measure what users experience (latency, error rate), not internal metrics
5. **Use dashboards for context, monitors for alerts** — dashboards for exploration, monitors for automated detection
6. **Tag custom metrics meaningfully** — avoid high-cardinality tags that explode metric volume
7. **Archive logs for compliance** — use Datadog Log Archives to S3/GCS for long-term retention at lower cost
8. **Configure the Agent via environment variables** — `DD_ENV`, `DD_SERVICE`, `DD_VERSION`, `DD_AGENT_HOST`

---

## Common Patterns

### Node.js dd-trace Setup

```typescript
// instrument.ts — import at very top of entry point
import tracer from "dd-trace";

tracer.init({
  service: "my-service",
  env: process.env.DD_ENV || "development",
  version: process.env.DD_VERSION || "1.0.0",
  logInjection: true, // Inject trace IDs into logs
  runtimeMetrics: true,
  profiling: true,
});

export default tracer;
```

### Python dd-trace Setup

```python
from ddtrace import tracer, patch_all

patch_all()  # Auto-instrument all supported libraries
tracer.configure(
    hostname=os.environ.get("DD_AGENT_HOST", "localhost"),
    port=8126,
)
```

### Log-Trace Correlation (Node.js + Pino)

```typescript
import pino from "pino";
import tracer from "dd-trace";

const logger = pino({
  mixin() {
    const span = tracer.scope().active();
    if (!span) return {};
    return {
      dd: {
        trace_id: span.context().toTraceId(),
        span_id: span.context().toSpanId(),
        service: "my-service",
        env: process.env.DD_ENV,
        version: process.env.DD_VERSION,
      },
    };
  },
});
```

### Custom Metrics

```typescript
import { StatsD } from "hot-shots";

const dogstatsd = new StatsD({
  host: process.env.DD_AGENT_HOST || "localhost",
  port: 8125,
  prefix: "myapp.",
  globalTags: { env: process.env.DD_ENV, service: "my-service" },
});

// Usage
dogstatsd.increment("orders.placed", 1, { payment_method: "card" });
dogstatsd.histogram("order.processing_time_ms", 142, { status: "success" });
dogstatsd.gauge("queue.depth", 47);
```

### Datadog Agent (Docker Compose)

```yaml
services:
  datadog-agent:
    image: gcr.io/datadoghq/agent:latest
    environment:
      DD_API_KEY: ${DD_API_KEY}
      DD_SITE: "datadoghq.com"
      DD_APM_ENABLED: "true"
      DD_LOGS_ENABLED: "true"
      DD_APM_NON_LOCAL_TRAFFIC: "true"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /proc/:/host/proc/:ro
      - /sys/fs/cgroup/:/host/sys/fs/cgroup:ro
    ports:
      - "8126:8126"  # APM traces
      - "8125:8125/udp"  # DogStatsD
```

---

## Anti-Patterns

| Anti-Pattern | Why It Hurts | Correct Approach |
|---|---|---|
| No unified tagging | Cannot correlate traces, logs, and metrics | Use `service`, `env`, `version` everywhere |
| High-cardinality custom metric tags | Metric volume explodes, costs skyrocket | Use bounded tag values (status codes, not user IDs) |
| Alerting on every error | Alert fatigue, team ignores alerts | Alert on error rate spikes, anomalies, SLO burns |
| No log-trace correlation | Cannot navigate from logs to traces | Enable `logInjection` and standardize log format |
| Ingesting all traces at 100% | Expensive, unnecessary for most services | Use Ingestion Controls and sampling rules |
| Missing `DD_VERSION` tag | Cannot track regressions across deploys | Set version from CI/CD build number |

---

**Last verified**: 2026-02-24 | **Skill version**: 1.0.0
