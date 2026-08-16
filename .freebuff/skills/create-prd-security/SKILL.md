---
name: create-prd-security
description: Define security, attack surface, integration, and observability architecture with compliance escalation
parameters:
  - name: strict_map_guard
    type: boolean
    required: false
    description: If true, fail immediately when Security/Auth map cells are missing
---

## Overview


## Prerequisites

1. Architecture shard completed with component/data strategy context
2. Required map cells available for Security and Auth

## Step-by-Step

### Step 0 — Map guard and context reload

1. Validate Security and Auth entries in cross-cutting map section.
2. Reload ideation context: personas, constraints/compliance, domain role matrices, CX trust boundaries.
3. Resume/initialize checkpoint.

### Step 1 — Security model with compliance escalation

1. Define authentication and authorization scope (or documented no-auth scope when applicable).
2. Define data protection, validation, age restrictions/compliance, rate limiting, CSP/CORS, code signing.
3. Escalate minors/payments/health/government constraints to top-level architectural sections when applicable.
4. Confirm decisions and write `## Security Model` to architecture draft immediately.
5. Trigger bootstrap for newly locked security keys when required.

### Step 2 — Attack surface review

1. Run universal and surface-specific attack surface checks.
2. Confirm with user.
3. Write `## Security — Attack Surface` section.

### Step 3 — Integration points

1. If zero external integrations, write explicit no-integration statement.
2. Otherwise document each integration: provided capability, failure mode, fallback, cost model.
3. Write `## Integration Points` section.

### Step 4 — Observability architecture

1. Run observability decision interview: logging, tracing, alerting, dashboards, retention.
2. Confirm decisions and trigger required bootstrap keys.
3. Write `## Observability Architecture` section.

## Completion Checklist

- [ ] Map guard passed
- [ ] Ideation context reloaded
- [ ] Security model locked and written
- [ ] Compliance escalations documented where required
- [ ] Attack surface section written
- [ ] Integration points section written
- [ ] Observability section written
- [ ] Checkpoint updated

## Next Steps

- Run `create-prd-compile`
