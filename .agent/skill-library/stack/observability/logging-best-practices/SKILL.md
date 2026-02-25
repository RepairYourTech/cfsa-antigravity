---
name: logging-best-practices
description: |
  Implement structured logging with JSON output, log levels, correlation IDs, and log aggregation. Use when: setting up Pino or Winston, configuring log levels (trace/debug/info/warn/error/fatal), adding request tracing, implementing sensitive data redaction, or integrating with ELK or Loki.
version: 1.0.0
---

# Logging Best Practices

**Status**: Production Ready
**Last Updated**: 2026-02-24

---

## Description

Production-grade logging requires structured output, consistent log levels, request correlation, and PII redaction. This skill covers best practices for Node.js logging with Pino and Winston, log aggregation with ELK and Loki, and performance-conscious logging patterns.

## When to Use

- Setting up JSON structured logging
- Choosing and configuring log levels (trace/debug/info/warn/error/fatal)
- Adding correlation IDs and request tracing
- Configuring Pino for high-performance logging
- Configuring Winston for flexible logging
- Integrating with log aggregation (ELK stack, Grafana Loki)
- Implementing sensitive data redaction
- Optimizing async logging and log sampling for performance

---

## Key Concepts

### Log Levels

| Level | When to Use |
|-------|-------------|
| **trace** | Extremely detailed diagnostic info (function entry/exit) |
| **debug** | Diagnostic info useful during development |
| **info** | Normal operational events (request completed, job finished) |
| **warn** | Unexpected but recoverable situations (deprecation, retry) |
| **error** | Failures that need attention (unhandled exception, external service down) |
| **fatal** | Process cannot continue (missing critical config, OOM) |

### Structured Logging

Always log as structured JSON objects, never string-interpolated messages:

```typescript
// Good — structured, searchable, parseable
logger.info({ orderId, userId, total: 49.99 }, "Order placed");

// Bad — string interpolation, not searchable
logger.info(`Order ${orderId} placed by user ${userId} for $49.99`);
```

### Correlation IDs

Every request should carry a unique correlation ID (often called `requestId` or `traceId`) that appears in all log entries for that request. This enables tracing a single request across all log lines.

---

## Best Practices

1. **Use structured JSON output** — every log entry is a JSON object with consistent fields
2. **Set log level via environment variable** — `LOG_LEVEL=info` in production, `LOG_LEVEL=debug` in development
3. **Include correlation IDs** — generate a UUID per request and inject it into every log entry
4. **Redact sensitive data** — never log passwords, tokens, PII, or full credit card numbers
5. **Log at the right level** — `info` for business events, `error` for failures, `debug` for diagnostics
6. **Use child loggers** — create child loggers with request-scoped context to avoid passing IDs everywhere
7. **Avoid logging in hot loops** — log sampling or rate-limiting prevents performance degradation
8. **Set up log rotation** — prevent disk exhaustion with size or time-based rotation

---

## Common Patterns

### Pino Setup

```typescript
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "body.password"],
    censor: "[REDACTED]",
  },
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});

export default logger;
```

### Winston Setup

```typescript
import winston from "winston";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "my-service" },
  transports: [new winston.transports.Console()],
});

export default logger;
```

### Request Correlation Middleware

```typescript
import { randomUUID } from "node:crypto";

function correlationMiddleware(req, res, next) {
  const requestId = req.headers["x-request-id"] || randomUUID();
  req.log = logger.child({ requestId });
  res.setHeader("x-request-id", requestId);
  next();
}
```

### Sensitive Data Redaction

```typescript
const redactPaths = [
  "password",
  "token",
  "authorization",
  "cookie",
  "ssn",
  "creditCard",
  "*.password",
  "*.token",
];

const logger = pino({ redact: { paths: redactPaths, censor: "[REDACTED]" } });
```

---

## Anti-Patterns

| Anti-Pattern | Why It Hurts | Correct Approach |
|---|---|---|
| `console.log` in production | No structure, no levels, no redaction | Use a structured logger (Pino, Winston) |
| Logging full request/response bodies | PII leaks, huge log volume | Log only essential fields, redact sensitive data |
| String-interpolated messages | Not searchable, not parseable | Use structured key-value pairs |
| No correlation IDs | Cannot trace a request across log lines | Generate and propagate requestId |
| `debug` level in production | Enormous log volume, cost explosion | Use `info` in production, configure via env var |
| Synchronous file writes | Blocks event loop, degrades performance | Use async transports or stdout piping |
| No log rotation | Disk fills up, service crashes | Use logrotate or size-based rotation |

---

**Last verified**: 2026-02-24 | **Skill version**: 1.0.0
