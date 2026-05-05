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
2. Phase progression state exists in `.memory/pipeline/progress/`
3. Architecture phasing section and spec indexes are available

## Step-by-Step

### Step 0 — Full-layer readiness gate

1. Resolve target phase: if the `phase` parameter was supplied, use it; otherwise read the current phase from `.memory/pipeline/progress/spec-pipeline.md`. Pass the resolved phase identifier into both shards.
2. Verify `.memory/wiki/specs/ia/index.md`, `.memory/wiki/specs/be/index.md`, and `.memory/wiki/specs/fe/index.md` exist.
3. Verify all required entries in each index are marked ✅ complete.
4. If any layer is incomplete: stop and route to the specific missing workflow:
   - IA incomplete → `/write-architecture-spec`
   - BE incomplete → `/write-be-spec`
   - FE incomplete → `/write-fe-spec`

### Step 1 — Run preflight shard

Call skill: `plan-phase-preflight` (pass resolved phase)

Expected outputs:
- phase sequencing gate result
- completeness audit result
- cross-layer consistency report
- draft continuity decision

### Step 2 — Run write shard

Call skill: `plan-phase-write` (pass resolved phase)

Expected outputs:
- `.memory/wiki/specs/phases/phase-N.md`
- `.memory/wiki/specs/phases/phase-N-draft.md`
- generated progress files in `.memory/pipeline/progress/`
- verified bootstrap/map completeness for planning prerequisites

## Quality Gate

Do not close workflow unless all pass:
- every slice declares an explicit surface scope per `vertical-slices` rule
- every slice has testable acceptance criteria with citations to IA/BE/FE specs
- slices are ordered by dependency, not by perceived priority or quality tier
- contract → test → implementation order is preserved per `tdd-contract-first`
- no slice contains placeholder acceptance criteria — boundary stubs only where allowed by `boundary-not-placeholder`
- progress tracker reflects all generated slices and their initial status

## Completion Gate (MANDATORY)

Before reporting completion to the user:

1. **Memory check** — Apply rule `memory-capture`. Write any patterns, decisions, or blockers from this workflow to `.memory/wiki/`. If nothing to write, confirm: "No new patterns/decisions/blockers."
2. **Progress update** — Update `.memory/pipeline/progress/` tracking files (phase plan, slice statuses, pipeline tracker).
3. **Session log** — Write session entry to `.memory/pipeline/progress/sessions/` per `session-continuity` protocol 05.

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
