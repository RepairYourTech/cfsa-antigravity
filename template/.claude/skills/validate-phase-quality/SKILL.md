---
name: validate-phase-quality
description: Execute code-quality gates for a completed phase including tests, coverage, lint, types, build, CI/CD, staging, migrations, and spec coverage
parameters:
  - name: phase
    type: string
    required: false
    description: Optional explicit phase identifier override
---

## Overview


## Prerequisites

1. All slices in target phase are marked complete

## Step-by-Step

### Step 0 — Validation skill loading and optional parallelism

1. Load testing-strategist, code-review-pro, deployment-procedures skills.
2. Optionally parallelize independent-slice validation checks where safe.

### Step 1 — Test suite gate

1. Run test command.
2. If tests fail, stop with failing-slice report.

### Step 2 — Coverage and mutation gates

1. Run coverage command and enforce thresholds from engineering standards (or defaults).
2. Run mutation testing for critical paths when supported.
3. Enforce blocking/non-blocking outcomes per policy.

### Step 3 — Static quality gates

1. Run lint command (zero errors requirement).
2. Run type-check command (zero errors requirement).
3. Run build command (must succeed).

### Step 4 — Delivery and deployment gates

1. Verify CI/CD pipeline is green for latest phase commit.
2. Deploy to staging and run smoke checks.
3. Verify deployment strategy alignment with architecture doc when documented.
4. Verify migrations are clean and rollback scripts exist.

### Step 5 — Spec coverage sweep

1. Run full spec coverage sweep across IA/BE/FE layers.
2. Apply hard-stop behavior for uncovered mandatory scope.

## Completion Checklist

- [ ] tests pass
- [ ] coverage thresholds pass
- [ ] lint/type/build pass
- [ ] CI/CD green
- [ ] staging deployment + smoke checks pass
- [ ] deployment strategy verification complete
- [ ] migration verification complete
- [ ] spec coverage sweep complete

## Next Steps

- Run `validate-phase-readiness`
