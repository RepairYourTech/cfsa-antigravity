---
name: validate-phase
description: Orchestrate phase validation across code-quality and production-readiness gates with mandatory reporting and verdicting
parameters:
  - name: phase
    type: string
    required: false
    description: Optional explicit phase identifier override
---

## Overview

Runs validation in two shards: quality → readiness.


## Prerequisites

1. Phase slices are complete
2. Required progress and standards documents exist
3. Validation environment/tooling is available

## Step-by-Step

### Step 1 — Run quality shard

Call skill: `validate-phase-quality`

Expected outputs:
- test/lint/type/build validation results
- CI/CD, staging deploy, deployment strategy, migration checks
- spec coverage sweep results

### Step 2 — Run readiness shard

Call skill: `validate-phase-readiness`

Expected outputs:
- gate applicability matrix
- readiness gate results (API docs/a11y/perf/security/dependencies)
- consolidated report in `.memory/wiki/specs/audits/phase-N-validation.md`
- final pass/fail verdict + constrained next step recommendation

## Quality Gate

Do not close workflow unless all pass:
- quality shard checks complete and passing
- readiness shard checks complete and passing (or appropriately deferred per policy)
- validation report written
- explicit verdict determined

## Completion Checklist

- [ ] quality shard completed
- [ ] readiness shard completed
- [ ] validation report produced
- [ ] verdict (pass/fail) captured
- [ ] next-step recommendation emitted

## Next Steps

- if pass: `/update-architecture-map`
- if fail: resolve findings and re-run `/validate-phase`
