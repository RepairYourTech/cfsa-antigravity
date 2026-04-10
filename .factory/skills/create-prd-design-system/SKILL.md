---
name: create-prd-design-system
description: Lock seven design-system decisions from ideation workflows and persist design-system.md incrementally
parameters:
  - name: surfaces
    type: array
    required: false
    description: Optional explicit surfaces override; defaults to ideation constraints
---

## Overview


## Prerequisites

1. Stack shard completed
2. Design direction confirmed in brand-guidelines context
3. Ideation constraints and structure map available

## Step-by-Step

### Step 0 — Prerequisite and context load

1. Verify design direction placeholders are resolved.
2. Read engagement tier from ideation index.
3. Read constraints, ideation structure map, heavy domains, and CX files.
4. Enforce stop gate: must read at least one domain index/deep-dive beyond ideation index.

### Step 1 — Checkpoint resumption

1. Resume or initialize design-system shard checkpoint.
2. Track completion state per decision.

### Step 2 — Per-decision synthesis and locking (7 decisions)

For each decision below:
1. Write cited ideation synthesis (2-4 bullets) to `docs/plans/prd-working/design-system-synthesis.md`.
2. Enforce cite-or-stop gate (minimum one project-specific citation).
3. Present options, trade-offs, recommendation.
4. Confirm decision (tier-aware).
5. Write corresponding section to `docs/plans/design-system.md` immediately.

Decisions:
1. Navigation paradigm
2. Layout grid
3. Page archetypes
4. Global component inventory
5. Motion language
6. Data density philosophy
7. Global state design language

### Step 3 — Completeness verification

1. Validate all seven sections exist in `docs/plans/design-system.md`.
2. Ensure no placeholders or TBD values remain.
3. Ensure global component inventory is usable as FE seed inventory.

## Completion Checklist

- [ ] Context and prerequisite gates passed
- [ ] Checkpoint state updated
- [ ] Seven synthesis sections written
- [ ] Seven design-system decisions confirmed
- [ ] design-system.md written progressively
- [ ] Completeness verification passed

## Next Steps

- Run `create-prd-architecture`
