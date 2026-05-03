---
name: write-architecture-spec
description: Orchestrate IA shard authoring via design and deepen passes, with pipeline-state-driven shard selection and ambiguity gates
parameters:
  - name: shard
    type: string
    required: false
    description: Optional shard override; defaults to lowest-numbered IA shard marked not-started
---

## Overview

Runs IA specification authoring in two shards: design → deepen.


## Prerequisites

1. Decomposition outputs exist (`.memory/wiki/specs/ia/` skeletons + indexes)
2. `.codex/progress/spec-pipeline.md` exists and includes IA column states
3. Stack map is resolved for required categories (Databases, Security, Surfaces)

## Step-by-Step

### Step 0 — Pipeline-state shard selection

1. Read `.codex/progress/spec-pipeline.md`.
2. Select lowest-numbered IA shard with `not-started` status unless override is explicitly requested.
3. If no IA shard remains: stop and direct next step to `/write-be-spec`.

### Step 1 — Run design shard

Call skill: `write-architecture-spec-design`

Expected outputs:
- Fully drafted IA sections for selected shard:
  - interactions
  - contracts
  - data models
  - access control
  - accessibility
  - event schemas
  - edge cases

### Step 2 — Run deepen shard

Call skill: `write-architecture-spec-deepen`

Expected outputs:
- Iterative deepening passes complete
- IA shard finalized and verified
- IA index updated for shard completion
- spec pipeline IA state updated
- ambiguity gates executed

## Quality Gate

Do not close workflow unless all pass:
- complete interaction flows
- typed contracts with explicit errors
- complete data model relationships/constraints
- role coverage across all interactions
- edge-case coverage for concurrency/deletion/conflicts
- bidirectional cross-shard dependencies

## Completion Checklist

- [ ] target shard selected from pipeline state
- [ ] design shard completed and user-reviewed
- [ ] deepen shard completed and user-reviewed
- [ ] IA index updated
- [ ] pipeline tracker updated
- [ ] ambiguity gates completed
- [ ] next valid step recommended based on remaining IA shards

## Next Steps

- If IA shards remain: `/write-architecture-spec`
- If IA is complete and `/audit-ambiguity ia` is clean: `/write-be-spec`
