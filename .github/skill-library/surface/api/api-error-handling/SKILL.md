---
name: api-error-handling
description: "Design consistent API error responses using RFC 7807 Problem Details, field-level validation errors, error correlation IDs, retry semantics, and circuit breaker patterns. Use when designing error handling for REST APIs or standardizing error response formats."
version: 1.0.0
---

# API Error Handling

Every API must communicate errors clearly, consistently, and securely. Clients should never have to guess what went wrong, and servers should never leak internal details.

## RFC 7807 Problem Details

The standard format for machine-readable error responses. Use `application/problem+json` as the content type.

```typescript
// src/schemas/problem-details.schema.ts
import { z } from 'zod';

export const ProblemDetailsSchema = z.object({
  type: z.string().url().describe('URI reference identifying the problem type'),
  title: z.string().describe('Short human-readable summary'),
  status: z.number().int().min(400).max(599).describe('HTTP status code'),
  detail: z.string().optional().describe('Human-readable explanation specific to this occurrence'),
  instance: z.string().optional().describe('URI reference identifying this specific occurrence'),
  // Extension members
  correlationId: z.string().uuid().optional().describe('Request correlation ID for support'),
  errors: z.array(z.object({
    field: z.string().describe('JSON pointer to the field (e.g., /body/email)'),
    message: z.string().describe('Human-readable error for this field'),
    code: z.string().describe('Machine-readable error code (e.g., required, too_short)'),
  })).optional().describe('Field-level validation errors'),
  retryAfter: z.number().int().optional().describe('Seconds before the client should retry'),
});

export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
```

### Example Responses

**Validation error (422):**
```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Failed",
  "status": 422,
  "detail": "The request body contains 2 validation errors.",
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "errors": [
    {
      "field": "/body/email",
      "message": "Must be a valid email address",
      "code": "invalid_format"
    },
    {
      "field": "/body/name",
      "message": "Must be at least 2 characters",
      "code": "too_short"
    }
  ]
}
```

**Not found (404):**
```json
{
  "type": "https://api.example.com/problems/not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "No model with ID 'gpt-5-turbo' exists.",
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Rate limited (429):**
```json
{
  "type": "https://api.example.com/problems/rate-limited",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "You have exceeded 100 requests per minute.",
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "retryAfter": 42
}
```

---

## Error Code Taxonomy

### 4xx Client Errors

| Status | Code | When to Use |
|--------|------|-------------|
| 400 | `bad_request` | Malformed JSON, missing Content-Type, unparseable body |
| 401 | `unauthorized` | Missing or invalid authentication credentials |
| 403 | `forbidden` | Authenticated but lacks permission |
| 404 | `not_found` | Resource does not exist |
| 405 | `method_not_allowed` | Wrong HTTP method (e.g., GET on a POST-only endpoint) |
| 409 | `conflict` | Resource state conflict (e.g., duplicate email, version mismatch) |
| 410 | `gone` | Resource previously existed but was permanently deleted |
| 413 | `payload_too_large` | Request body exceeds size limit |
| 415 | `unsupported_media_type` | Content-Type not accepted |
| 422 | `validation_error` | Syntactically valid but semantically invalid (Zod validation failures) |
| 429 | `rate_limited` | Too many requests |

### 5xx Server Errors

| Status | Code | When to Use |
|--------|------|-------------|
| 500 | `internal_error` | Unhandled exception (catch-all) |
| 502 | `bad_gateway` | Upstream service returned invalid response |
| 503 | `service_unavailable` | Service temporarily down (maintenance, overloaded) |
| 504 | `gateway_timeout` | Upstream service timed out |

---

## Validation Error Response Shape

Map Zod validation errors to RFC 7807 field errors.

```typescript
import { ZodError } from 'zod';

function zodToProblemDetails(error: ZodError, correlationId: string): ProblemDetails {
  return {
    type: 'https://api.example.com/problems/validation-error',
    title: 'Validation Failed',
    status: 422,
    detail: `The request contains ${error.issues.length} validation error${error.issues.length > 1 ? 's' : ''}.`,
    correlationId,
    errors: error.issues.map((issue) => ({
      field: `/${issue.path.join('/')}`,
      message: issue.message,
      code: issue.code,
    })),
  };
}
```

**Usage in a request handler:**
```typescript
export async function POST({ request }: APIContext) {
  const correlationId = crypto.randomUUID();

  const body = await request.json().catch(() => null);
  if (body === null) {
    return problemResponse({
      type: 'https://api.example.com/problems/bad-request',
      title: 'Invalid JSON',
      status: 400,
      detail: 'The request body is not valid JSON.',
      correlationId,
    });
  }

  const result = CreateModelSchema.safeParse(body);
  if (!result.success) {
    return problemResponse(zodToProblemDetails(result.error, correlationId));
  }

  // ... handle valid request
}

function problemResponse(problem: ProblemDetails): Response {
  return new Response(JSON.stringify(problem), {
    status: problem.status,
    headers: {
      'Content-Type': 'application/problem+json',
      'X-Correlation-ID': problem.correlationId ?? '',
    },
  });
}
```

---

## Stack Trace Suppression

Never expose stack traces, internal paths, or implementation details in production.

```typescript
// Global error handler
function handleUnexpectedError(error: unknown, correlationId: string): ProblemDetails {
  // Log the full error internally
  logger.error('Unhandled error', {
    correlationId,
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : error,
  });

  // Return sanitized response to client
  return {
    type: 'https://api.example.com/problems/internal-error',
    title: 'Internal Server Error',
    status: 500,
    detail: 'An unexpected error occurred. Please try again later.',
    correlationId,
    // NO stack trace, NO file paths, NO SQL queries
  };
}
```

---

## Error Correlation IDs

Every request gets a unique correlation ID. Include it in the response header and body. This is the only way to link a user-reported error to server logs.

```typescript
// Middleware: assign correlation ID
function correlationMiddleware(handler: Handler): Handler {
  return async (context) => {
    const correlationId = context.request.headers.get('X-Correlation-ID')
      ?? crypto.randomUUID();

    // Attach to context for use in handlers
    context.locals.correlationId = correlationId;

    const response = await handler(context);

    // Always include in response
    response.headers.set('X-Correlation-ID', correlationId);
    return response;
  };
}
```

**Client-side: include in error reports:**
```typescript
try {
  const response = await fetch('/api/models', { method: 'POST', body, headers });
  if (!response.ok) {
    const problem = await response.json();
    // Show to user: "Contact support with reference: a1b2c3d4"
    showError(problem.detail, problem.correlationId);
  }
} catch (error) {
  showError('Network error. Please check your connection.');
}
```

---

## Retry-After Headers

For 429 (rate limited) and 503 (service unavailable), always include `Retry-After`.

```typescript
function rateLimitResponse(retryAfterSeconds: number, correlationId: string): Response {
  const problem: ProblemDetails = {
    type: 'https://api.example.com/problems/rate-limited',
    title: 'Too Many Requests',
    status: 429,
    detail: `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`,
    correlationId,
    retryAfter: retryAfterSeconds,
  };

  return new Response(JSON.stringify(problem), {
    status: 429,
    headers: {
      'Content-Type': 'application/problem+json',
      'Retry-After': String(retryAfterSeconds),
      'X-Correlation-ID': correlationId,
    },
  });
}
```

---

## Partial Success (207 Multi-Status)

When a batch operation partially succeeds, use 207 to report per-item results.

```typescript
interface BatchResult {
  status: number;
  id: string;
  error?: ProblemDetails;
}

function batchResponse(results: BatchResult[]): Response {
  const allSucceeded = results.every((r) => r.status >= 200 && r.status < 300);

  return new Response(JSON.stringify({ results }), {
    status: allSucceeded ? 200 : 207,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Example response:
// {
//   "results": [
//     { "status": 201, "id": "item-1" },
//     { "status": 422, "id": "item-2", "error": { "title": "Validation Failed", ... } },
//     { "status": 201, "id": "item-3" }
//   ]
// }
```

---

## Idempotency-Aware Error Handling

When a client retries a request with an `Idempotency-Key`, return the same response as the original request.

```typescript
async function handleIdempotentRequest(
  idempotencyKey: string,
  handler: () => Promise<Response>
): Promise<Response> {
  // Check if this key was already processed
  const cached = await idempotencyStore.get(idempotencyKey);
  if (cached) {
    return new Response(cached.body, {
      status: cached.status,
      headers: { ...cached.headers, 'X-Idempotency-Replayed': 'true' },
    });
  }

  const response = await handler();

  // Cache the response for this key (only for non-server-errors)
  if (response.status < 500) {
    await idempotencyStore.set(idempotencyKey, {
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: await response.clone().text(),
    }, { ttl: 24 * 60 * 60 }); // 24 hours
  }

  return response;
}
```

---

## Error Logging vs Error Response

| What to Log (Server) | What to Return (Client) |
|----------------------|------------------------|
| Full stack trace | Generic message |
| Database query that failed | "An internal error occurred" |
| User ID, IP, request body | Correlation ID only |
| Upstream service error details | "Service temporarily unavailable" |
| File paths, line numbers | Nothing |

```typescript
// WRONG: leaking internals
return new Response(JSON.stringify({
  error: 'SQLITE_CONSTRAINT: UNIQUE constraint failed: users.email',
  stack: 'Error at /app/src/db/users.ts:42...'
}), { status: 500 });

// CORRECT: safe response + internal log
logger.error('Database constraint violation', {
  correlationId,
  table: 'users',
  constraint: 'unique_email',
  userId: context.locals.userId,
});

return problemResponse({
  type: 'https://api.example.com/problems/conflict',
  title: 'Conflict',
  status: 409,
  detail: 'An account with this email already exists.',
  correlationId,
});
```

---

## Circuit Breaker Pattern

When an upstream service is failing, stop sending requests to avoid cascade failures.

```typescript
enum CircuitState { CLOSED, OPEN, HALF_OPEN }

class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;

  constructor(
    private readonly threshold: number = 5,
    private readonly resetTimeout: number = 30_000,
  ) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new CircuitOpenError('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = CircuitState.OPEN;
    }
  }
}

class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}
```

**Usage:**
```typescript
const aiServiceBreaker = new CircuitBreaker(5, 30_000);

try {
  const result = await aiServiceBreaker.call(() => callAIService(prompt));
  return new Response(JSON.stringify(result), { status: 200 });
} catch (error) {
  if (error instanceof CircuitOpenError) {
    return problemResponse({
      type: 'https://api.example.com/problems/service-unavailable',
      title: 'Service Unavailable',
      status: 503,
      detail: 'The AI service is temporarily unavailable. Please try again shortly.',
      correlationId,
      retryAfter: 30,
    });
  }
  throw error;
}
```

---

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|------------------|
| Return 200 with `{ error: true }` in body | Use proper HTTP status codes |
| Return 500 for all errors | Distinguish client (4xx) from server (5xx) errors |
| Return stack traces in production | Log internally, return generic message + correlation ID |
| Different error formats per endpoint | Use RFC 7807 everywhere |
| Swallow errors silently | Log every error with correlation ID |
| Return `{ message: "Error" }` | Include type, title, status, detail, and correlation ID |
| Expose database error messages | Map to user-friendly messages |
| Return 404 for unauthorized resources | Return 403 or 404 depending on security model (prefer 404 to avoid resource enumeration) |

## References

- [RFC 7807: Problem Details for HTTP APIs](https://tools.ietf.org/html/rfc7807)
- [RFC 9457: Problem Details (updated)](https://www.rfc-editor.org/rfc/rfc9457.html)
- [HTTP Status Codes (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [Microsoft API Guidelines: Error Handling](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md)
