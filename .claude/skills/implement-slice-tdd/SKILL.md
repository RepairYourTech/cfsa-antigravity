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

### Step 4.5 — Slice depth ratio gate (mandatory)

1. Read `.claude/skills/prd-templates/references/slice-depth-floor.md`.
2. Read the slice's depth floor and breakdown from `phase-N.md` (computed in `/plan-phase-write` Step 5.5). If absent, compute it now from referenced spec sections.
3. Count delivered tests — only tests asserting concrete spec items count (no smoke, no bare `toBeTruthy`).
4. Compute ratio = delivered_tests / depth_floor. Hard gate: `< 1.0` returns to RED with a list of every uncovered floor item. Each floor item must have at least one explicit assertion exercising its specific behavior.
5. Record ratio and matched-item count in `.memory/pipeline/progress/slices/<slice-id>.md` under `## Depth Ratio`.

### Step 5 — Validation and synthesis

1. Run full validation command.
2. In parallel mode, run synthesis protocol.

### Step 6 — Mandatory progress updates and evidence gate

1. Update all required progress targets per Protocol 3 steps 1–7 (slice file, phase file, index.md, blockers/decisions/patterns).
2. Apply Protocol 3 step 8 (read-back verification): re-read each written file and confirm the bytes landed; retry once on failure; STOP after second failed attempt.
3. Run `node scripts/check-progress-consistency.mjs` (Protocol 3 step 9). Exit 1 → fix every reported drift item and re-run until exit 0. Exit 2 → STOP and surface the malformed-file report. **You may not call `notify_user` until exit is 0.**
4. Stamp the slice file with a `## Completion Signature` block (Protocol 3 step 10) recording date, runtime, verifier exit, and depth ratio.
5. Apply slice completion gates (`UI Completeness`, `Spec Traceability`, `Spec Depth Floor`) and QA anti-cheat audit.
6. Completion payload must include: raw re-reads of slice/phase/index, verifier exit code (`0`), updated overall progress fraction, explicit next command (`/implement-slice` for next slice, or `/verify-infrastructure` if this was the infra/auth slice).

## Completion Checklist

- [ ] RED tests authored and failing
- [ ] GREEN implementation complete and passing
- [ ] refactor and completeness checks complete
- [ ] slice depth ratio ≥ 1.0 against spec floor
- [ ] validation command passes
- [ ] progress files updated + re-verified (Protocol 3 step 8)
- [ ] cross-file consistency verifier returned exit 0 (Protocol 3 step 9)
- [ ] Completion Signature stamped on slice file (Protocol 3 step 10)
- [ ] completion payload includes required evidence

## Next Steps

- default: `/implement-slice`
- infra/auth gate path: `/verify-infrastructure`
