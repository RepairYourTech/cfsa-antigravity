---
name: write-be-spec
description: Orchestrate backend spec production from completed IA shards through classify and write passes with mandatory ambiguity gates
parameters:
  - name: shard
    type: string
    required: false
    description: Optional IA shard override; defaults to lowest-numbered BE not-started shard with IA complete
---

## Overview

Runs BE specification authoring in two shards: classify → write.


## Prerequisites

1. IA shard(s) are complete and marked ✅ in `.memory/wiki/specs/ia/index.md`
2. `.memory/pipeline/progress/spec-pipeline.md` exists
3. BE conventions/index files exist under `.memory/wiki/specs/be/`

## Step-by-Step

### Step 0 — Pipeline-state shard selection

1. Read `.memory/pipeline/progress/spec-pipeline.md`.
2. Find shards where IA is `complete` and BE is `not-started`.
3. Select lowest-numbered eligible shard unless user explicitly overrides.
4. If none remain, stop and recommend `/write-fe-spec`.

### Step 1 — Run classify shard

Call skill: `write-be-spec-classify`

Expected outputs:
- Classification type + rationale
- Expected BE spec count
- Referenced Material Inventory
- Created BE spec stub(s) after approval

### Step 2 — Run write shard

Call skill: `write-be-spec-write`

Expected outputs:
- Full BE spec file(s) in `.memory/wiki/specs/be/`
- Updated `.memory/wiki/specs/be/index.md`
- Updated `.memory/pipeline/progress/spec-pipeline.md` BE status
- Ambiguity gate results + next allowed command

## Quality Gate

Do not close workflow unless all pass:
- request/response schema coverage per endpoint
- database schema/index/permission completeness
- middleware/security constraints reflected from IA
- specific error code definitions
- rate-limit specs per endpoint
- deep-dive and cross-reference coverage
- complete IA Source Map traceability

## Completion Checklist

- [ ] target shard selected from pipeline state
- [ ] classify shard completed and approved
- [ ] write shard completed and approved
- [ ] BE index updated
- [ ] BE pipeline tracker updated
- [ ] ambiguity gate completed
- [ ] next valid command recommendation emitted

## Next Steps

- if BE specs remain: `/write-be-spec`
- if BE complete and `/audit-ambiguity be` is clean: `/write-fe-spec`
