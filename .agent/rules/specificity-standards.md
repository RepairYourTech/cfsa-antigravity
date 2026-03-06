---
description: Every spec item must have testable acceptance criteria — no ambiguity, no adjectives, only numbers and types
trigger: always_on
---

# Specificity & Depth Standards

> No ambiguity downstream. No surface-level specs. Every element must be testable.

## No Ambiguity: Testable Acceptance Criteria

Every spec item, feature description, and requirement MUST have **testable acceptance criteria**.

### Ambiguous vs. Concrete

| ❌ Ambiguous | ✅ Concrete |
|-------------|------------|
| "Fast response times" | "P95 latency < 200ms for API responses" |
| "Secure authentication" | "JWT with RS256, 15-min access token, 7-day refresh, httpOnly cookie" |
| "User-friendly interface" | "Form validates on blur, shows inline errors, submits on Enter" |
| "Handle errors gracefully" | "4xx returns `{ error: string, code: string }`, 5xx logs to Sentry" |

### When Writing Specs

- Numbers, not adjectives ("3 retries", not "retry several times")
- Specific types ("string[]", not "a list")
- Exact error behavior ("returns 409 with existing email", not "handles duplicates")
- Concrete state transitions ("pending → processing → complete | failed")

### When Writing Code

- Explicit return types, not inferred
- Named constants, not magic numbers
- Error messages that identify the problem and suggest the fix

## Depth Standards: Exhaustive Specifications

Specs must go **deep enough** that an implementer needs zero clarification.

### Architecture Spec Depth

1. Every entity has all fields typed with constraints
2. Every relationship has cardinality and cascade behavior
3. Every endpoint has request/response schema, error codes, auth rules
4. Every state machine has all transitions and guard conditions
5. Every integration has retry policy, timeout, fallback behavior

### Feature Spec Depth

1. Every UI component has props typed, states enumerated, events listed
2. Every form has validation rules per field with error messages
3. Every API call has loading, success, and error UI states
4. Every responsive breakpoint has layout behavior specified
5. Every interaction has keyboard, mouse, and touch behavior defined
