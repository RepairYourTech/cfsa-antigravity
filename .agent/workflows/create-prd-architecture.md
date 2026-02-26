---
description: System architecture and data strategy for the create-prd workflow
parent: create-prd
shard: architecture
standalone: true
position: 2
pipeline:
  position: 2.2
  stage: architecture
  predecessors: [create-prd-stack]
  successors: [create-prd-security]
  skills: [database-schema-design, technical-writer]
  calls-bootstrap: false
---

// turbo-all

# Create PRD — Architecture & Data Strategy

Design the high-level system architecture and data strategy. Create the data placement strategy document.

**Prerequisite**: Tech stack decisions must be locked — verify that `{{PLACEHOLDER}}` values for tech stack axes have been filled (by `/create-prd-stack` or `/bootstrap-agents`). If placeholders remain unfilled, tell the user to complete tech stack decisions first.

---

## 4. System architecture

Design the high-level system. Each sub-item requires full exploration, not a summary sentence:

1. **Component diagram** — What services exist? How do they communicate? What protocols? What happens if one is down?
2. **Data flow** — Request lifecycle from client to database and back. Every hop, every transformation, every auth check along the way. Draw the full sequence.
3. **Deployment topology** — What runs where? Edge? Origin? External? Local machine? App Store? What are the latency implications? What are the cost implications?
4. **API surface** — REST? GraphQL? RPC? Versioning strategy? Error format? Pagination? Rate limit headers?

For multi-surface projects, additionally define:
5. **Surface interconnection** — How do surfaces communicate? What is the source of truth for shared data? What happens when a surface is offline?
6. **Shared domain boundary** — Which entities/models are shared across surfaces vs surface-specific?

For each component, also define:
- What it owns (data, logic, auth decisions)
- What it delegates (to other components or external services)
- What happens when it fails (graceful degradation, circuit breakers, fallbacks)

**Present to user**: Show the system architecture section and walk through each component. Ask:
- "Does this component diagram capture every service in the system?"
- "Are there failure modes I haven't accounted for?"
- For multi-surface: "What happens if the sync layer goes down? Can each surface degrade gracefully?"

Refine based on discussion before proceeding.

Write the completed `## System Architecture` section to `docs/plans/architecture-draft.md` (create the file if it does not exist). Do not wait until the end — write this section as soon as it is completed and confirmed by the user.

## 5. Data strategy

Using `{{DATABASE_SKILL}}`. Each sub-item must be explored to field-level depth:

1. **Data placement** — What lives in the database vs cache vs object storage vs external service vs local device storage? For each entity: which service owns it and why
2. **Schema approach** — Strict schema vs schemaless vs hybrid? Field types, constraints, indexes, relations with cardinality
3. **Query patterns** — Read-heavy? Write-heavy? What are the hot paths? What needs caching? What are the N+1 risks?
4. **Migration strategy** — How will schema evolve? Backward compatibility approach? Zero-downtime migration plan?
5. **PII boundaries** — Which fields contain PII? Where is PII stored vs where is it NOT stored? How is PII isolated from AI/analytics pipelines?

For multi-surface projects, additionally define:
6. **Data ownership** — Which surface is the source of truth for each entity? How are conflicts resolved?
7. **Sync protocol** — What data syncs between surfaces? How frequently? What happens during network partition?

**Present to user**: Show the data strategy section and walk through placement decisions. Ask:
- "Does every entity have a clear owner?"
- "Are there query patterns I'm missing that could become hot paths?"

Refine based on discussion before proceeding.

Write the completed `## Data Strategy` section to `docs/plans/architecture-draft.md`. Do not wait until the end — write this section as soon as it is completed and confirmed by the user.

### Data placement strategy document

Extract the data placement decisions into a standalone reference:

Create `docs/plans/data-placement-strategy.md` with the following required sections:

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

### Propose next step

System architecture and data placement strategy are complete. Next: Run `/create-prd-security` to define the security model, compliance escalation, and integration points.

> If this shard was invoked standalone (not from `/create-prd`), surface this via `notify_user`.

