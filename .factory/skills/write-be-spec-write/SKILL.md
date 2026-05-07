---
name: write-be-spec-write
description: Author and validate BE spec files, update indexes/tracker, run deepening and ambiguity gates, and enforce allowed next-step transitions
parameters:
  - name: spec_file
    type: string
    required: false
    description: Optional explicit BE spec filename
---

## Overview


## Prerequisites

1. BE spec stub exists and includes `## Classification`
2. Referenced Material Inventory exists from classify shard

## Step-by-Step

### Step 1 — Re-run and endpoint reconciliation gate

1. Detect existing authored content and decide continue vs targeted redo.
2. Build endpoint completeness reconciliation table before drafting sections.
3. Require each unspecced endpoint to be either authored now or explicitly deferred with reason.

### Step 2 — Write BE spec content

Use BE template/conventions and write full sections, including split-group metadata when applicable.

Core expectations:
- endpoint contracts
- schema rules
- middleware/security controls
- error strategy
- testing strategy hooks
- IA source mapping

### Step 3 — Content completeness floor (replaces line-count gate)

For every endpoint, verify all of: request schema (fields + constraints + examples), success response schema, response schema per error class, validation rules per (field × constraint) with error codes, full error-code matrix (4xx for validation/auth/404/409/429, 5xx for downstream cascades), authorization row per role with allow/deny + ownership predicate, idempotency statement, rate limit (or explicit inheritance), and observability hooks (logs/metrics/audit/spans).

Hard gate: any missing cell on any endpoint blocks the spec from advancing. Inheritance from conventions must be cited; "implicit" is not allowed. Length is informational only.

### Step 4 — Index and tracker updates

1. Update `.memory/wiki/specs/be/index.md`.
2. Update BE completion state in `.memory/pipeline/progress/spec-pipeline.md`.
3. Handle structural-reference no-spec rows when classification indicates 0 specs.

### Step 5 — Iterative deepening passes

Run multi-pass refinement (passes 1–7 mandatory, 8–10 conditional, hard stop after 10):
1. cross-endpoint consistency
2. sequencing/concurrency scenarios
3. failure cascade analysis
4. authorization completeness (role × endpoint matrix with no empty cells, ownership predicates, 403 vs 404 decisions)
5. observability completeness (logs, metrics, audit-trail, trace spans per endpoint)
6. rate-limit and abuse-protection edge cases (anonymous vs authed limits, burst, enumeration protection, mass-assignment whitelist)
7. failure-mode partial-state hygiene (per external dependency: rollback / compensate / queue / surface)
8–10. additional convergence passes if prior pass produced significant additions

### Step 6 — Cross-reference + ambiguity gates

1. Verify back-links to IA source and related BE specs.
2. Verify deep-dive and cross-shard source citations.
3. Run micro/macro ambiguity checks, two-implementer test, devil's-advocate pass.
4. If last BE spec, run `/audit-ambiguity be` before allowing FE recommendation.

### Step 7 — Dependency/bootstrap and ledger updates

1. Detect newly introduced dependencies and trigger bootstrap + verification as needed.
2. Update feature ledger BE coverage when ledger exists.

### Step 8 — Review request and constrained next-step recommendation

Present:
- spec link(s)
- cross-reference verification status
- ambiguity gate status
- pipeline state and only allowed next command (`/write-be-spec` or `/write-fe-spec`)

## Completion Checklist

- [ ] endpoint reconciliation table completed
- [ ] BE spec content fully authored
- [ ] complexity gate handled
- [ ] BE index updated
- [ ] pipeline tracker updated
- [ ] deepening passes completed
- [ ] ambiguity gate completed
- [ ] dependency bootstrap checks handled
- [ ] feature ledger BE coverage updated (if present)
- [ ] review requested with constrained next-step options

## Next Steps

- if BE specs remain: `/write-be-spec`
- if BE complete and ambiguity audit passes: `/write-fe-spec`
