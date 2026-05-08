---
description: Security-first — PII isolation, input validation, secret handling, no secrets in client
trigger: always_on
---

# Security First

## The Rule

**Security is not a feature — it is the foundation.** Every line of code is written with the assumption that it will be attacked. PII must never leak. Secrets must never reach the client. Inputs must always be validated.

## PII Isolation

| Rule | Implementation |
|------|---------------|
| **No PII in AI payloads** | User data (email, name, DOB, payment info) is NEVER included in AI model requests |
| **PII fields tagged in schemas** | {{CONTRACT_LIBRARY}} schemas mark sensitive fields for automated auditing |
| **No PII in logs** | Structured logging with automatic PII redaction |
| **No PII in error messages** | Error responses never include user data — use IDs and codes only |
| **Encrypted at rest** | All PII fields encrypted in database |

## Input Validation

- **Every** API endpoint validates input with {{CONTRACT_LIBRARY}} — no exceptions
- **Every** form validates client-side with {{CONTRACT_LIBRARY}} AND server-side with the same schema
- **No** raw user input reaches a database query — always parameterized
- **No** user input is rendered as HTML — always escaped
- **Rate limiting** — Every public-facing endpoint must have rate limiting configured. No exceptions. Use the project's configured rate limiting utility (see `patterns.md` for the approach). Unauthenticated endpoints must have stricter limits than authenticated ones.

## Secrets Management

- **NEVER** hardcode secrets in source code
- **NEVER** expose API keys in client-side bundles
- All secrets via environment variables, accessed only in server-side code
- API keys stored encrypted, decrypted only at request time

## CSP & Headers

Every response includes:
- `Content-Security-Policy` — strict, no inline scripts
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` — HSTS with long max-age

## What Gets Flagged

| Pattern | Verdict |
|---------|---------|
| PII field in AI model request payload | ❌ Rejected. Strip before sending. |
| API key hardcoded in source file | ❌ Rejected. Use environment variable. |
| User input rendered as raw HTML | ❌ Rejected. Always escape. |
| Public endpoint without rate limiting | ❌ Rejected. Add rate limiter. |
| API endpoint without input validation | ❌ Rejected. Add {{CONTRACT_LIBRARY}} schema. |
| Encrypted PII, parameterized queries, server-side secrets | ✅ Correct. |
