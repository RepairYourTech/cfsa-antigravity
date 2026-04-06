---
name: error-handling-patterns
description: Master error handling patterns across languages including exceptions, Result types, error propagation, and graceful degradation to build resilient applications. Use when implementing error handling, designing APIs, or improving application reliability.
---

# Error Handling Patterns

Build resilient applications with robust error handling strategies that gracefully handle failures and provide excellent debugging experiences.

## When to Use This Skill

- Implementing error handling in new features
- Designing error-resilient APIs
- Debugging production issues
- Improving application reliability
- Creating better error messages for users and developers
- Implementing retry and circuit breaker patterns
- Handling async/concurrent errors
- Building fault-tolerant distributed systems

## Stack-Specific References

After reading the methodology below, read the reference matching your surface's Languages column in the surface stack map (`.agent/instructions/tech-stack.md`):

| Language | Reference |
|----------|-----------|
| TypeScript / JavaScript | `references/typescript.md` |
| Python | `references/python.md` |
| Go | `references/go.md` |
| Rust | `references/rust.md` |

## Core Concepts

### 1. Error Handling Philosophies

Every language takes a different approach to error handling. Know which philosophy your language uses and follow its idioms:

| Philosophy | Description | Languages |
|-----------|-------------|-----------|
| **Exceptions** | Traditional try-catch, disrupts control flow | Python, TypeScript/JS, Java, C# |
| **Result Types** | Explicit success/failure, functional approach | Rust, Haskell, modern TypeScript |
| **Error Returns** | Explicit error as return value, requires discipline | Go |
| **Option/Maybe Types** | For nullable values without exceptions | Rust, Haskell, Swift |
| **Panics/Crashes** | Unrecoverable errors, programming bugs | Rust (panic), Go (panic), Python (SystemExit) |

**When to Use Each:**

- Exceptions: Unexpected errors, exceptional conditions
- Result Types: Expected errors, validation failures
- Panics/Crashes: Unrecoverable errors, programming bugs

### 2. Error Categories

**Recoverable Errors** — the application can handle and continue:

- Network timeouts
- Missing files
- Invalid user input
- API rate limits

**Unrecoverable Errors** — the application should crash and restart:

- Out of memory
- Stack overflow
- Programming bugs (null pointer, etc.)

## Universal Patterns

### Pattern 1: Circuit Breaker

Prevent cascading failures in distributed systems. When a downstream service fails repeatedly, stop calling it temporarily to let it recover.

**State machine:**

```
CLOSED  →  (failures ≥ threshold)  →  OPEN
OPEN    →  (timeout elapsed)       →  HALF_OPEN
HALF_OPEN → (success ≥ threshold)  →  CLOSED
HALF_OPEN → (any failure)          →  OPEN
```

**Parameters:**
- `failure_threshold` — how many failures before opening the circuit (e.g., 5)
- `timeout` — how long to stay open before trying again (e.g., 60s)
- `success_threshold` — how many successes in HALF_OPEN before closing (e.g., 2)

See language-specific references for implementation examples.

### Pattern 2: Error Aggregation

Collect multiple errors instead of failing on first error. Essential for form validation, batch processing, and multi-field input.

**The pattern:**
1. Create an error collector
2. Validate each field/item independently, adding errors to the collector
3. After all validations, check if errors exist
4. If yes, throw/return all errors at once

See language-specific references for implementation examples.

### Pattern 3: Graceful Degradation

Provide fallback functionality when errors occur. The system continues operating with reduced capability rather than failing completely.

**Strategies:**
- **Primary/fallback chain** — try cache, fall back to database, fall back to default
- **Multiple provider fallback** — try provider A, then B, then C
- **Feature degradation** — disable non-essential features when dependencies fail
- **Default values** — return safe defaults when data is temporarily unavailable

See language-specific references for implementation examples.

### Pattern 4: Retry with Exponential Backoff

Automatically retry failed operations with increasing delays between attempts.

**Parameters:**
- `max_attempts` — maximum retry count (e.g., 3)
- `backoff_factor` — multiplier for delay between attempts (e.g., 2.0)
- `retryable_exceptions` — which errors are worth retrying (network, timeout — NOT validation)

**Delay formula:** `delay = backoff_factor ^ attempt` (1s, 2s, 4s, 8s, ...)

See language-specific references for implementation examples.

## Best Practices

1. **Fail Fast**: Validate input early, fail quickly
2. **Preserve Context**: Include stack traces, metadata, timestamps
3. **Meaningful Messages**: Explain what happened and how to fix it
4. **Log Appropriately**: Error = log, expected failure = don't spam logs
5. **Handle at Right Level**: Catch where you can meaningfully handle
6. **Clean Up Resources**: Use try-finally, context managers, defer, RAII
7. **Don't Swallow Errors**: Log or re-throw, don't silently ignore
8. **Type-Safe Errors**: Use typed errors when possible

## Common Pitfalls

- **Catching Too Broadly**: `except Exception` / `catch (e)` hides bugs
- **Empty Catch Blocks**: Silently swallowing errors
- **Logging and Re-throwing**: Creates duplicate log entries
- **Not Cleaning Up**: Forgetting to close files, connections
- **Poor Error Messages**: "Error occurred" is not helpful
- **Ignoring Async Errors**: Unhandled promise rejections, goroutine panics

---

## Error Architecture Interview

This interview is mandatory for every project. All 5 decisions below must be confirmed before proceeding to Data Strategy. Do not skip or defer any decision — this is a hard gate.

### Decision 1 — Global Error Envelope

Every error response from any surface must conform to this canonical 4-field structure:

| Field | Description |
|-------|-------------|
| `code` | Machine-readable error code (e.g., `VALIDATION_FAILED`, `NOT_FOUND`). Clients switch on this field. |
| `message` | Human-readable explanation of what went wrong. Safe to display to end users. |
| `requestId` | Unique identifier for the request that caused the error. Used for support and debugging. |
| `details` | `object \| null`. Structured additional context (e.g., field-level validation errors) or `null` when no extra detail applies. |

**Locked JSON example:**

```json
{
  "code": "VALIDATION_FAILED",
  "message": "Email address is not valid.",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "details": { "field": "email", "reason": "must contain @" }
}
```

All four top-level fields are always present in every error response.

**Rule:** No other top-level fields (`status`, `error`, `timestamp`) may appear in the error envelope. HTTP status codes are conveyed via the HTTP response status line, not inside the body.

### Decision 2 — Error Propagation Chain

For each layer in the stack (database → service layer → API handler → transport → client), define: what errors are caught, what is logged (and at what level), and what is exposed to the next layer.

**Rule:** No layer may expose raw upstream errors to the client. Every layer must catch, wrap, and translate errors before passing them upward.

### Decision 3 — Unhandled Exception Strategy

Define the process-level catch mechanism:

- **Mechanism name** — the specific runtime feature or library used to catch unhandled exceptions (e.g., `process.on('uncaughtException')`, global error middleware, panic recovery).
- **Logged fields** — what information is captured when an unhandled exception occurs (stack trace, request context, environment, timestamp).
- **Client response** — must conform to the global error envelope defined in Decision 1.
- **Alerting timeline** — how quickly the team is notified after an unhandled exception (e.g., "PagerDuty within 5 minutes for >10 unhandled exceptions/minute").

### Decision 4 — Client Fallback Contract

Define per-surface behavior when the backend is unreachable or returns an error:

- **Offline mode support** — does the surface support offline operation? If yes, what subset of features remains available?
- **UI on network failure** — what does the user see when the network is down or the API is unreachable (toast, full-page error, inline message)?
- **Retry strategy** — automatic retry with backoff, manual retry button, or no retry?
- **Timeout thresholds** — how long the surface waits before declaring a request failed (e.g., 10s for API calls, 30s for file uploads).

### Decision 5 — Error Boundary Strategy

Define per-surface error boundary placement and behavior:

- **Boundary placement** — where error boundaries are placed in the component tree (page-level, section-level, component-level).
- **Fallback UI** — what the user sees when a boundary catches an error (generic error message, contextual fallback, partial degradation).
- **Telemetry reporting** — how caught errors are reported to the observability stack (error tracking service name, severity classification, PII scrubbing before reporting).

### User Presentation Prompts

Present these three questions to the user for confirmation:

1. "Does the global error envelope cover every field your clients need?"
2. "Are there surfaces where the fallback contract needs to differ?"
3. "Is the alerting timeline appropriate for your operational maturity?"

### Output

Write completed decisions to `architecture-draft.md` under `## Error Architecture` with five sub-sections matching the five decisions above:

1. `### Global Error Envelope`
2. `### Error Propagation Chain`
3. `### Unhandled Exception Strategy`
4. `### Client Fallback Contract`
5. `### Error Boundary Strategy`
