# Data Placement Strategy Template

Use this template to create `docs/plans/data-placement-strategy.md` during `/create-prd-architecture`.

```markdown
# Data Placement Strategy

## N-Tier Model Responsibilities

Define each tier in the system and what it is responsible for:

| Tier | Responsibility | Examples |
|------|---------------|----------|
| [Client / Edge / API / Database / Cache / Object Storage / External Service] | [What this tier owns and manages] | [Specific technologies] |

## Complete Data Placement Map

For every data type in the system, specify its canonical owner:

| Data Type | Canonical Owner | Stored Content | Encryption | Rationale |
|-----------|----------------|----------------|------------|-----------|
| [e.g., User profile] | [e.g., Database] | [Fields stored] | [at-rest / in-transit / both / none] | [Why this placement] |
| [e.g., Session tokens] | [e.g., Cache] | [Token data] | [encryption approach] | [Why this placement] |
| [e.g., Uploaded files] | [e.g., Object storage] | [File content + metadata] | [encryption approach] | [Why this placement] |

## Security Boundaries

For each tier, explicitly state what it stores AND what it does NOT store:

| Tier | Stores | Does NOT Store |
|------|--------|---------------|
| [Client] | [e.g., UI state, cached display data] | [e.g., raw PII, API secrets, decryption keys] |
| [Edge/CDN] | [e.g., static assets, cached public responses] | [e.g., user-specific data, PII] |
| [API Server] | [e.g., request context, short-lived auth tokens] | [e.g., persistent user data, raw credentials] |
| [Database] | [e.g., user records, PII (encrypted)] | [e.g., API secrets, session tokens] |
| [Cache] | [e.g., computed values, session data] | [e.g., PII, source-of-truth records] |

## PII Boundaries

- Which fields contain PII (enumerate every one)
- Where PII is stored vs where it is NOT stored
- How PII is isolated from AI/analytics pipelines
- PII access logging requirements

## GDPR/Compliance Data Lifecycle

| Data Category | Retention Period | Deletion Trigger | Deletion Responsibility | Verification |
|--------------|-----------------|-----------------|------------------------|-------------|
| [e.g., Account data] | [e.g., Account lifetime + 30 days] | [e.g., Account deletion request] | [e.g., API server → database cascade] | [How deletion is verified] |
| [e.g., Usage analytics] | [e.g., 90 days] | [e.g., TTL expiry] | [e.g., Database auto-purge] | [How deletion is verified] |

## Tenancy Model

[Single-tenant / Multi-tenant / Hybrid]
- Isolation mechanism: [e.g., row-level security, schema-per-tenant, database-per-tenant]
- Data co-mingling rules: [What data is shared vs isolated]
- Cross-tenant query prevention: [How enforced]

## Sync Protocol (multi-surface only)

- What data syncs between surfaces
- Sync frequency and mechanism
- Conflict resolution strategy
- Network partition behavior

## Summary Table

| Layer | Stores | Does NOT Store |
|-------|--------|---------------|
| [Layer 1] | [List] | [List] |
| [Layer 2] | [List] | [List] |
```

This document is consumed by `/write-be-spec` and `/write-architecture-spec` to ensure every spec places data consistently.
