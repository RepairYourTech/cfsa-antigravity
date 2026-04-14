---
name: implement-slice-tdd
description: Execute RED→GREEN→REFACTOR with validation, deep checks, and mandatory progress updates
parameters:
  - name: slice
    type: string
    required: false
    description: Optional explicit slice identifier
---

## Overview


## Prerequisites

1. Contract schemas already written
2. Setup shard completed

## Step-by-Step

### Step 1 — RED: write failing tests

1. Write failing tests for every acceptance criterion.
2. Add failing tests for uncovered contract fields/errors/validations.
3. Add IA edge-case tests with explicit trace tags.
4. Run test command and verify tests fail.
5. Enforce red-test count gate vs acceptance criteria count.

### Step 2 — GREEN: implement minimal correct code

1. Implement required schema, API, logic, and UI changes.
2. Enforce boundary-not-placeholder rules for stubs.
3. Annotate non-spec implementation decisions.
4. Run test command and verify green.

### Step 3 — Debug cycle (when green fails)

1. Classify failure type (contract/logic/integration).
2. Run bounded debug iterations with explicit hypothesis tracking.
3. Escalate after maximum loop threshold with evidence package.

### Step 4 — Refactor and completeness verification

1. Refactor with tests green.
2. Run adversarial review pass.
3. Run structured spec completeness checks:
   - field coverage
   - validation coverage
   - error code coverage
   - edge case handling
   - access-control enforcement
4. Run query optimization and resource cleanup checks where applicable.

### Step 5 — Validation and synthesis

1. Run full validation command.
2. In parallel mode, run synthesis protocol.

### Step 6 — Mandatory progress updates and evidence gate

1. Update all required progress targets.
2. Re-read updated files and include raw evidence in completion payload.
3. Apply slice completion gates and QA anti-cheat audit.
4. Emit next command with infrastructure/auth gate branching rule.

## Completion Checklist

- [ ] RED tests authored and failing
- [ ] GREEN implementation complete and passing
- [ ] refactor and completeness checks complete
- [ ] validation command passes
- [ ] progress files updated + re-verified
- [ ] completion payload includes required evidence

## Next Steps

- default: `/implement-slice`
- infra/auth gate path: `/verify-infrastructure`
