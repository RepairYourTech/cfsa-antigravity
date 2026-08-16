---
name: create-prd-compile
description: Compile architecture draft into dated architecture design and engineering standards with rubric-complete quality gates
parameters:
  - name: output_date
    type: string
    required: false
    description: Optional date override for architecture output filename (YYYY-MM-DD)
---

## Overview


## Prerequisites

1. Security shard completed
2. `.memory/wiki/specs/architecture-draft.md` exists with required sections
3. Required map cells available for Unit Tests, E2E Tests, CI/CD

## Step-by-Step

### Step 0 — Map guard and checkpoint

1. Validate required map cells in tech stack map.
2. Resume/initialize checkpoint state for compile shard.

### Step 1 — Development methodology

1. Define and confirm:
   - contract-first approach
   - TDD discipline
   - vertical slices
   - spec layer flow
   - quality gates
2. Write `## Development Methodology` to architecture draft immediately.

### Step 2 — Phasing strategy (with ideation reload)

1. Reload ideation context for Must domains, domain depth, and CX dependencies.
2. Build dependency-ordered phases with infrastructure verification gates.
3. Confirm phase ordering and feasibility.
4. Write `## Phasing Strategy` to architecture draft.

### Step 3 — Lock directory structure

1. Generate canonical directory tree from locked stack decisions.
2. Present architecture separation table.
3. Require explicit approval.
4. Trigger bootstrap keys for project structure outputs.
5. Write `## Directory Structure` section to architecture draft.

### Step 4 — Compile final architecture document

1. Validate required sections exist in architecture draft.
2. Compile to `.memory/wiki/specs/YYYY-MM-DD-architecture-design.md`.
3. Ensure section depth is implementation-ready.

### Step 5 — Performance budgets and engineering standards

1. Run performance budget interview for all applicable axes.
2. Write confirmed budgets to `.memory/wiki/specs/ENGINEERING-STANDARDS.md` immediately.
3. Compile full engineering standards with no unresolved placeholders.

### Step 6 — Rubric gate and review request

1. Run architecture rubric self-check (all dimensions).
2. Resolve any warning/fail dimensions before review request.
3. Present final architecture design + engineering standards for approval.
4. Stop and wait for explicit user approval.

## Completion Checklist

- [ ] Map guard passed
- [ ] Development methodology written
- [ ] Phasing strategy written
- [ ] Directory structure locked and written
- [ ] Dated architecture-design document compiled
- [ ] ENGINEERING-STANDARDS.md compiled
- [ ] Rubric self-check all green
- [ ] Review request sent and workflow paused

## Next Steps

After explicit approval, the only valid next command is:
- `/audit-ambiguity architecture`
