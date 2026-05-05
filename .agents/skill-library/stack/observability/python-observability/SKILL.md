---
name: python-observability
description: |
  Set up observability for Python applications with structlog, OpenTelemetry Python SDK, and Prometheus client. Use when: configuring structlog for structured logging, auto-instrumenting Flask/FastAPI/Django, creating custom spans and metrics in Python, or managing correlation IDs in async contexts.
version: 1.0.0
---

# Python Observability

**Status**: Production Ready
**Last Updated**: 2026-02-24

---

## Description

Python observability covers structured logging with structlog, distributed tracing and metrics with the OpenTelemetry Python SDK, and metrics exposition with the Prometheus client. This skill addresses auto-instrumentation for popular frameworks and best practices for async context management.

## When to Use

- Setting up structlog for structured JSON logging
- Configuring the OpenTelemetry Python SDK
- Auto-instrumenting Flask, FastAPI, or Django
- Creating custom spans and metrics in Python
- Integrating the Prometheus client for Python
- Configuring Python logging best practices
- Managing correlation IDs in async (asyncio) contexts

---

## Key Concepts

### structlog

structlog provides structured, composable logging for Python. It wraps the standard library `logging` module and outputs JSON by default in production.

### OpenTelemetry Python SDK

The `opentelemetry-sdk` package provides tracing, metrics, and logging for Python applications. Auto-instrumentation packages exist for Flask, FastAPI, Django, SQLAlchemy, requests, and more.

### Prometheus Client

The `prometheus_client` library exposes metrics in Prometheus format via an HTTP endpoint. It supports counters, gauges, histograms, and summaries.

### Async Context

Python's `contextvars` module provides context propagation across async boundaries, which OpenTelemetry uses to maintain trace context in asyncio-based applications.

---

## Best Practices

1. **Use structlog for all logging** — structured JSON output, composable processors, stdlib integration
2. **Auto-instrument before manual instrumentation** — install the relevant `opentelemetry-instrumentation-*` packages first
3. **Configure via environment variables** — use `OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_ENDPOINT`, etc.
4. **Use `contextvars` for correlation IDs** — thread-safe and asyncio-compatible
5. **Expose Prometheus metrics at `/metrics`** — use the built-in HTTP server or framework integration
6. **Redact PII in log processors** — add a structlog processor that strips sensitive fields
7. **Set appropriate log levels** — `INFO` in production, `DEBUG` in development
8. **Use batch span processors** — batch export reduces overhead in production

---

## Common Patterns

### structlog Setup

```python
import structlog

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()
logger.info("order_placed", order_id="abc-123", total=49.99)
```

### OpenTelemetry Auto-Instrumentation (FastAPI)

```bash
pip install opentelemetry-sdk opentelemetry-exporter-otlp \
    opentelemetry-instrumentation-fastapi \
    opentelemetry-instrumentation-httpx
```

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(provider)

app = FastAPI()
FastAPIInstrumentor.instrument_app(app)
```

### Custom Span

```python
from opentelemetry import trace

tracer = trace.get_tracer("my-service")

async def process_order(order_id: str):
    with tracer.start_as_current_span("process-order") as span:
        span.set_attribute("order.id", order_id)
        result = await do_work(order_id)
        return result
```

### Prometheus Metrics

```python
from prometheus_client import Counter, Histogram, start_http_server

REQUEST_COUNT = Counter("http_requests_total", "Total HTTP requests", ["method", "endpoint"])
REQUEST_LATENCY = Histogram("http_request_duration_seconds", "HTTP request latency", ["method", "endpoint"])

start_http_server(9090)  # Expose /metrics on port 9090

# Usage
REQUEST_COUNT.labels(method="GET", endpoint="/api/users").inc()
with REQUEST_LATENCY.labels(method="GET", endpoint="/api/users").time():
    handle_request()
```

---

## Anti-Patterns

| Anti-Pattern | Why It Hurts | Correct Approach |
|---|---|---|
| Using `print()` for logging | No structure, no levels, no redaction | Use structlog or standard logging |
| Manual instrumentation before auto | Duplicated effort, inconsistent coverage | Install auto-instrumentation packages first |
| Hardcoded OTLP endpoints | Inflexible across environments | Use `OTEL_EXPORTER_OTLP_ENDPOINT` env var |
| Ignoring `contextvars` in async code | Lost trace context across await boundaries | Use `contextvars`-aware context propagation |
| No batch processing for spans | High overhead per-span export | Use `BatchSpanProcessor` |
| Logging full request bodies | PII exposure, excessive volume | Log only essential fields |

---

**Last verified**: 2026-02-24 | **Skill version**: 1.0.0
