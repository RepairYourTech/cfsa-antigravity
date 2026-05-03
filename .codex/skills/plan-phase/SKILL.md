---
name: plan-phase
description: Orchestrate phase planning into dependency-ordered TDD slices with preflight gates and write/finalization flow
parameters:
  - name: phase
    type: string
    required: false
    description: Optional phase identifier override (defaults to current phase from progress index)
---

## Overview

Runs phase planning in two shards: preflight → write.


## Prerequisites

1. IA, BE, and FE spec layers are fully complete
2. Phase progression state exists in `.codex/progress/`
3. Architecture phasing section and spec indexes are available

## Step-by-Step

### Step 0 — Full-layer readiness gate

1. Verify `.memory/wiki/specs/ia/index.md`, `.memory/wiki/specs/be/index.md`, and `.memory/wiki/specs/fe/index.md` exist.
2. Verify all required entries in each index are complete.
3. If any layer is incomplete: stop and route to missing spec workflow.

### Step 1 — Run preflight shard

Call skill: `plan-phase-preflight`

Expected outputs:
- phase sequencing gate result
- completeness audit result
- cross-layer consistency report
- draft continuity decision

### Step 2 — Run write shard

Call skill: `plan-phase-write`

Expected outputs:
- `.memory/wiki/specs/phases/phase-N.md`
- `.memory/wiki/specs/phases/phase-N-draft.md`
- generated progress files in `.codex/progress/`
- verified bootstrap/map completeness for planning prerequisites

## Completion Checklist

- [ ] full-layer readiness confirmed
- [ ] preflight shard completed
- [ ] write shard completed
- [ ] phase plan and progress artifacts generated
- [ ] review requested and workflow paused for approval
- [ ] next valid command recommendation emitted

## Next Steps

After explicit approval, the only valid next command is:
- `/implement-slice` (starting with first dependency-ordered slice)
