---
name: logging-best-practices
description: Implement structured logging with JSON formats, log levels (DEBUG, INFO, WARN, ERROR), contextual logging, PII handling, and centralized logging. Use for logging, observability, log levels, structured logs, or debugging.
---

# Logging Best Practices

## Overview

Comprehensive guide to implementing structured, secure, and performant logging across applications. Covers log levels, structured logging formats, contextual information, PII protection, and centralized logging systems.

## When to Use

- Setting up application logging infrastructure
- Implementing structured logging
- Configuring log levels for different environments
- Managing sensitive data in logs
- Setting up centralized logging
- Implementing distributed tracing
- Debugging production issues
- Compliance with logging regulations

## Stack-Specific References

After reading the methodology below, read the reference matching your surface's Languages column:

| Language | Reference |
|----------|-----------|
| TypeScript / JavaScript | `references/typescript.md` |
| Python | `references/python.md` |
| Go | `references/go.md` |

---

## 1. Log Levels

| Level | When to Use | Production Default |
|-------|------------|-------------------|
| **DEBUG** | Detailed info for debugging — request payloads, intermediate values | OFF |
| **INFO** | General operational events — user actions, transactions, startup | ON |
| **WARN** | Potentially harmful — rate limits approaching, retry, deprecations | ON |
| **ERROR** | Failures the app can recover from — failed request, DB timeout | ON |
| **FATAL** | Critical failures — the app must stop | ON (triggers alerts) |

**Environment rules:**
- Development: DEBUG and above
- Staging: INFO and above
- Production: INFO and above (DEBUG only via feature flag for specific modules)

---

## 2. Structured Logging (JSON)

All production logs MUST be structured (JSON format), not free-text. Structured logs enable:
- Machine-parseable log aggregation
- Field-based search and filtering
- Dashboards and alerting

**Every log entry must include:**
- `timestamp` — ISO 8601 format
- `level` — log level string
- `message` — human-readable description
- `service` — service name
- `environment` — deployment environment

**Example output (any language):**
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "INFO",
  "message": "User created",
  "service": "user-service",
  "environment": "production",
  "userId": "abc-123",
  "requestId": "req-456"
}
```

---

## 3. Contextual Logging

### Request Context
Attach request metadata to every log within a request lifecycle:
- **Request ID** — unique identifier for correlating logs from one request
- **Correlation ID** — propagated across service boundaries in distributed systems
- **User ID** — authenticated user (if available)
- **HTTP method/path** — what was requested

### Correlation IDs
In distributed systems, propagate a correlation ID via headers (`X-Correlation-Id`) so that logs from multiple services can be traced together.

---

## 4. PII and Sensitive Data Handling

**CRITICAL:** PII must NEVER appear in plaintext in logs.

### Sensitive Fields (always redact or mask)
- Passwords, tokens, API keys
- SSN, credit card numbers
- Email addresses (depending on regulation)
- Phone numbers (depending on regulation)

### Strategies
| Strategy | When to Use |
|----------|-------------|
| **Redaction** — replace with `[REDACTED]` | Passwords, API keys, tokens |
| **Masking** — partial reveal (`u***r@example.com`) | Email, phone, credit card |
| **Hashing** — one-way hash | When you need to correlate without revealing |
| **Omission** — don't log the field at all | When the field serves no diagnostic purpose |

---

## 5. Performance Logging

Track operation timing for performance monitoring:
- **Start timer** before operation
- **End timer** after operation
- **Log duration** with context
- **Alert on threshold** if operation exceeds expected time

Key operations to time:
- Database queries
- External API calls
- File I/O operations
- Complex computations

---

## 6. Centralized Logging

For distributed systems, aggregate logs to a central system:

| Tool | Type |
|------|------|
| **ELK Stack** | Elasticsearch + Logstash + Kibana (self-hosted) |
| **Grafana + Loki** | Lightweight log aggregation (self-hosted) |
| **Datadog** | Cloud monitoring and logging |
| **AWS CloudWatch** | AWS-native log management |
| **Splunk** | Enterprise log management |

---

## 7. Distributed Tracing

For microservice architectures, use OpenTelemetry (or similar) to trace requests across services:
- Create spans for each operation
- Propagate trace context via headers
- Export to Jaeger, Zipkin, or Datadog

---

## 8. Log Sampling (High-Volume Services)

For high-volume services, sample INFO/DEBUG logs to reduce volume:
- **Random sampling** — log N% of requests
- **Consistent sampling** — hash user ID so same user always gets logged (or not)
- **Always log** WARN and ERROR — never sample these

---

## Best Practices

### ✅ DO
- Use structured logging (JSON) in production
- Include correlation/request IDs in all logs
- Log at appropriate levels (don't overuse DEBUG)
- Redact sensitive data (PII, passwords, tokens)
- Include context (userId, requestId, etc.)
- Log errors with full stack traces
- Use centralized logging in distributed systems
- Set up log rotation to manage disk space
- Monitor log volume and costs
- Use async logging for performance
- Include timestamps in ISO 8601 format
- Log business events (user actions, transactions)
- Set up alerts for error patterns

### ❌ DON'T
- Log passwords, tokens, or sensitive data
- Use print/console.log in production
- Log at DEBUG level in production by default
- Log inside tight loops (use sampling)
- Include PII without anonymization
- Ignore log rotation (disk will fill up)
- Use synchronous logging in hot paths
- Log to multiple transports without need
- Forget to include error stack traces
- Log binary data or large objects
- Use string concatenation (use structured fields)
- Log every single request in high-volume APIs
