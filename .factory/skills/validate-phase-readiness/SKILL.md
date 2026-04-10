---
name: validate-phase-readiness
description: Execute production-readiness gates with applicability control, consolidate validation report, and issue final readiness verdict
parameters:
  - name: phase
    type: string
    required: false
    description: Optional explicit phase identifier override
---

## Overview


## Prerequisites

1. Quality shard has completed successfully
2. Quality-shard report section (`## Spec Coverage`) exists in phase validation audit file

## Step-by-Step

### Step 0 — Gate applicability matrix (mandatory first)

1. Classify phase content against gate applicability rules.
2. Build gate applicability table with always-on/content-triggered/deferred statuses.
3. Apply single-deferral/deadline constraints.

### Step 1 — API documentation sync gate (conditional)

1. Run when applicability matrix marks as required.
2. Verify OpenAPI/docs synchronization with implemented contracts and errors.

### Step 2 — Accessibility gate (conditional)

1. Run accessibility audit for changed UI components when applicable.

### Step 3 — Performance gates

1. Run budget verification against engineering standards when budgets exist.
2. Enforce fail/warn behavior by classification.
3. Run optional deep performance audit when tooling/skill is available.

### Step 4 — Security and dependency gates

1. Run adversarial and security-hardening reviews.
2. Run DAST when configured/applicable.
3. Run package manager vulnerability audit and enforce high/critical blocking rule.
4. Run supplemental dependency-audit protocol when installed.

### Step 5 — Feature ledger and boundary stub audits

1. Verify must-have features assigned to phase are implemented.
2. Audit active `BOUNDARY:` stubs for tracking/test/spec-status validity.

### Step 6 — Report append and completion gating

1. Verify quality shard already wrote spec coverage section.
2. Append readiness sections to existing phase validation report.
3. Update progress/memory/session artifacts.
4. Present report with pass/fail verdict and constrained next steps.

## Completion Checklist

- [ ] applicability matrix completed
- [ ] conditional gates executed or validly deferred
- [ ] security/dependency gates passed
- [ ] feature-ledger reconciliation passed
- [ ] boundary stub audit passed
- [ ] readiness sections appended to report
- [ ] verdict presented with next-step guidance

## Next Steps

- if pass: `/update-architecture-map`
- if fail: resolve findings and re-run `/validate-phase`
