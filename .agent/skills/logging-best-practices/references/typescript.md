# TypeScript Logging Patterns

Language-specific patterns for the `logging-best-practices` skill. Read `SKILL.md` first for universal methodology.

---

## Libraries

| Library | Use Case |
|---------|----------|
| **Winston** | Versatile, multi-transport, production-ready |
| **Pino** | High-performance JSON logger |
| **OpenTelemetry SDK** | Distributed tracing |

## Winston Setup

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'user-service',
    environment: process.env.NODE_ENV
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, maxFiles: 5
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, maxFiles: 5
    })
  ]
});

logger.info('User created', { userId: user.id, requestId: req.id });
logger.error('Payment failed', { error: error.message, stack: error.stack, orderId: order.id });
```

## Request Context Middleware

```typescript
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

const asyncLocalStorage = new AsyncLocalStorage();

export function requestLogger(req, res, next) {
  const requestId = req.headers['x-request-id'] || uuidv4();
  const context = {
    requestId, method: req.method, path: req.path,
    ip: req.ip, userId: req.user?.id
  };

  asyncLocalStorage.run(context, () => {
    logger.info('Request started', context);
    res.on('finish', () => {
      logger.info('Request completed', {
        ...context, statusCode: res.statusCode,
        duration: Date.now() - req.startTime
      });
    });
    req.startTime = Date.now();
    next();
  });
}

export function getLogger() {
  const context = asyncLocalStorage.getStore();
  return {
    info: (message: string, meta?: object) =>
      logger.info(message, { ...context, ...meta }),
    error: (message: string, error: Error, meta?: object) =>
      logger.error(message, { ...context, error, ...meta }),
    warn: (message: string, meta?: object) =>
      logger.warn(message, { ...context, ...meta }),
    debug: (message: string, meta?: object) =>
      logger.debug(message, { ...context, ...meta })
  };
}
```

## PII Sanitization

```typescript
const SENSITIVE_FIELDS = ['password', 'token', 'apiKey', 'ssn', 'creditCard', 'email', 'phone'];

function sanitize(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}
```

## Performance Logger

```typescript
class PerformanceLogger {
  private timers = new Map<string, number>();

  start(op: string) { this.timers.set(op, Date.now()); }

  end(op: string, meta?: object) {
    const start = this.timers.get(op);
    if (!start) return;
    const duration = Date.now() - start;
    this.timers.delete(op);
    logger.info(`Performance: ${op}`, { operation: op, durationMs: duration, ...meta });
    if (duration > 1000) {
      logger.warn(`Slow operation: ${op}`, { operation: op, durationMs: duration, threshold: 1000, ...meta });
    }
  }

  async measure<T>(op: string, fn: () => Promise<T>, meta?: object): Promise<T> {
    this.start(op);
    try { return await fn(); } finally { this.end(op, meta); }
  }
}
```

## Distributed Tracing (OpenTelemetry)

```typescript
import opentelemetry from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/node';
import { SimpleSpanProcessor } from '@opentelemetry/tracing';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const provider = new NodeTracerProvider();
provider.addSpanProcessor(
  new SimpleSpanProcessor(new JaegerExporter({
    serviceName: 'user-service',
    endpoint: 'http://jaeger:14268/api/traces'
  }))
);
provider.register();

const tracer = opentelemetry.trace.getTracer('user-service');

app.get('/api/users/:id', async (req, res) => {
  const span = tracer.startSpan('get-user', {
    attributes: { 'http.method': req.method, 'http.url': req.url }
  });
  try {
    const user = await fetchUser(req.params.id);
    span.setStatus({ code: opentelemetry.SpanStatusCode.OK });
    res.json(user);
  } catch (error) {
    span.setStatus({ code: opentelemetry.SpanStatusCode.ERROR, message: error.message });
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    span.end();
  }
});
```

## Centralized Logging (ELK + Winston)

```typescript
import 'winston-logstash';

const elkLogger = winston.createLogger({
  transports: [
    new winston.transports.Logstash({
      port: 5000, host: 'logstash',
      node_name: 'user-service', max_connect_retries: -1
    })
  ]
});
```

## Log Sampling

```typescript
class SamplingLogger {
  constructor(private logger: Logger, private sampleRate = 0.1) {}

  info(message: string, meta?: object) {
    if (Math.random() < this.sampleRate) this.logger.info(message, meta);
  }

  warn(message: string, meta?: object) { this.logger.warn(message, meta); }
  error(message: string, error: Error, meta?: object) { this.logger.error(message, error, meta); }
}
```
