---
name: prometheus-grafana
description: |
  Set up Prometheus for metrics collection and Grafana for visualization. Use when: defining Prometheus metric types (counter, gauge, histogram, summary), writing PromQL queries, configuring scrape targets, setting up alerting rules and Alertmanager, creating Grafana dashboards, configuring data sources, or implementing recording rules and federation.
version: 1.0.0
---

# Prometheus & Grafana

**Status**: Production Ready
**Last Updated**: 2026-02-24

---

## Description

Prometheus is a pull-based metrics collection and alerting system. Grafana is a visualization platform that queries Prometheus (and other data sources) to build dashboards. Together they form the most widely deployed open-source monitoring stack.

## When to Use

- Defining Prometheus metric types (counter, gauge, histogram, summary)
- Writing PromQL queries for dashboards and alerts
- Configuring Prometheus scrape targets
- Setting up alerting rules and Alertmanager
- Creating Grafana dashboards and panels
- Configuring Grafana data sources
- Implementing visualization best practices
- Creating recording rules for query performance
- Setting up Prometheus federation or remote write

---

## Key Concepts

### Prometheus Metric Types

| Type | Purpose | Example |
|------|---------|---------|
| **Counter** | Monotonically increasing value | Total HTTP requests, errors |
| **Gauge** | Value that can go up or down | Current temperature, queue depth |
| **Histogram** | Distribution of values in configurable buckets | Request latency, response size |
| **Summary** | Distribution with pre-calculated quantiles | Request latency at p50, p90, p99 |

### PromQL

PromQL is Prometheus's query language for selecting, aggregating, and transforming time-series data.

### Scrape Model

Prometheus **pulls** metrics from targets at configured intervals. Targets expose metrics at an HTTP endpoint (typically `/metrics`) in Prometheus text format.

### Alertmanager

Alertmanager receives alerts from Prometheus, deduplicates, groups, routes, and delivers notifications via email, Slack, PagerDuty, etc.

---

## Best Practices

1. **Use histograms over summaries** — histograms are aggregatable across instances, summaries are not
2. **Choose meaningful bucket boundaries** — align with SLO thresholds (e.g., 50ms, 100ms, 250ms, 500ms, 1s, 5s)
3. **Use recording rules for expensive queries** — pre-compute frequently used aggregations
4. **Label carefully** — avoid high-cardinality labels (user IDs, request IDs)
5. **Set up alerting on symptoms, not causes** — alert on error rate and latency, investigate causes in dashboards
6. **Use Grafana variables** — make dashboards reusable across services and environments
7. **Set scrape intervals appropriately** — 15s default; lower for critical services, higher for batch jobs
8. **Use federation or remote write for multi-cluster** — avoid single-Prometheus bottlenecks

---

## Common Patterns

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets: ["alertmanager:9093"]

scrape_configs:
  - job_name: "my-service"
    static_configs:
      - targets: ["app:3000"]
    metrics_path: /metrics
    scrape_interval: 10s
```

### Alerting Rules

```yaml
# rules/alerts.yml
groups:
  - name: my-service
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate on {{ $labels.instance }}"
          description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes."

      - alert: HighLatency
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 1.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P99 latency above 1s on {{ $labels.instance }}"
```

### Recording Rules

```yaml
# rules/recording.yml
groups:
  - name: my-service-recording
    rules:
      - record: job:http_requests:rate5m
        expr: rate(http_requests_total[5m])

      - record: job:http_request_duration:p99_5m
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

### Node.js Prometheus Client

```typescript
import { Registry, Counter, Histogram, collectDefaultMetrics } from "prom-client";

const register = new Registry();
collectDefaultMetrics({ register });

const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// Expose /metrics endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});
```

### PromQL Query Examples

```promql
# Request rate per second
rate(http_requests_total[5m])

# Error rate percentage
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100

# P99 latency
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Aggregate across instances
sum by (route) (rate(http_requests_total[5m]))

# Top 5 endpoints by request rate
topk(5, sum by (route) (rate(http_requests_total[5m])))
```

### Grafana Dashboard JSON (Panel)

```json
{
  "title": "Request Rate",
  "type": "timeseries",
  "targets": [
    {
      "expr": "sum by (route) (rate(http_requests_total{env=\"$env\"}[5m]))",
      "legendFormat": "{{ route }}"
    }
  ]
}
```

### Docker Compose Setup

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./rules:/etc/prometheus/rules
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    environment:
      GF_SECURITY_ADMIN_PASSWORD: "admin"
    ports:
      - "3001:3000"
    volumes:
      - grafana-data:/var/lib/grafana

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"

volumes:
  grafana-data:
```

---

## Anti-Patterns

| Anti-Pattern | Why It Hurts | Correct Approach |
|---|---|---|
| High-cardinality labels | Metric cardinality explosion, OOM on Prometheus | Use bounded label values (HTTP status, service name) |
| Using summaries when aggregation is needed | Cannot aggregate quantiles across instances | Use histograms — they are aggregatable |
| No recording rules for dashboard queries | Slow dashboard loads, high Prometheus CPU | Pre-compute common aggregations with recording rules |
| Alerting on single data points | Flapping alerts, false positives | Use `for` duration (e.g., `for: 5m`) |
| Unbounded scrape targets | Prometheus overloaded | Use service discovery with relabeling to filter targets |
| No retention policy | Disk fills up | Set `--storage.tsdb.retention.time` (15d–90d typical) |
| Grafana dashboards without variables | One dashboard per environment/service | Use template variables for `env`, `service`, `instance` |

---

**Last verified**: 2026-02-24 | **Skill version**: 1.0.0
