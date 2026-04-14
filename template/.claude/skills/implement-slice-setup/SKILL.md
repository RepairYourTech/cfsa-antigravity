---
name: implement-slice-setup
description: Validate implementation prerequisites, load slice/spec context, detect execution mode, and write contract schemas before TDD execution
parameters:
  - name: slice
    type: string
    required: false
    description: Optional explicit slice identifier
---

## Overview


## Prerequisites

1. Phase plan exists with target slice acceptance criteria
2. Tech-stack map and commands are fully resolved

## Step-by-Step

### Step 0 — Critical placeholder/map verification

1. Verify slice surface row completeness in stack map.
2. Verify cross-cutting categories are populated.
3. Verify commands are non-template values.
4. Verify instruction files have no unresolved template markers.
5. If any check fails, stop and route to appropriate remediation workflow.

### Step 1 — Progress/session context load

1. Load session resumption context.
2. Verify previous slice completion state.

### Step 2 — Skill bundle loading

1. Load bundled implementation/debug/testing/code-quality skills.
2. Resolve slice surface and load stack-bound skills (language/tests/ORM/state mgmt as applicable).
3. Trigger bootstrap and verification if slice introduces new dependencies.

### Step 3 — Slice and source spec context loading

1. Read target slice acceptance criteria.
2. For each acceptance criterion citation, read full BE/FE/IA source sections.
3. Discover and load split-companion specs when applicable.
4. Persist source context for TDD traceability.

### Step 4 — Parallel mode detection and dispatch planning

1. Detect surface tags in slice tasks.
2. If no tags: sequential mode.
3. If tags exist: define TDD-order dispatch phases and logging responsibilities.

### Step 5 — Contract writing

1. Resolve cited BE endpoints and copy full contract coverage.
2. Add shapes required by acceptance criteria where missing.
3. Write contract schemas in contracts directory using stack conventions.

## Completion Checklist

- [ ] placeholder/map verification passed
- [ ] progress/session context loaded
- [ ] required skills loaded
- [ ] slice + source context loaded
- [ ] execution mode decided
- [ ] contract schemas written

## Next Steps

- Run `implement-slice-tdd`
