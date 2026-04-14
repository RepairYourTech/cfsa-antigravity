---
name: write-fe-spec
description: Orchestrate frontend spec production from completed BE shards through classify and write passes with mandatory ambiguity and navigation gates
parameters:
  - name: shard
    type: string
    required: false
    description: Optional IA/BE shard override; defaults to lowest-numbered FE not-started shard with BE complete
---

## Overview

Runs FE specification authoring in two shards: classify → write.


## Prerequisites

1. BE spec for target shard is complete
2. `.claude/progress/spec-pipeline.md` exists
3. FE conventions/index files exist under `.memory/wiki/specs/fe/`
4. Design system and brand guidance are available for visual surfaces

## Step-by-Step

### Step 0 — Pipeline-state shard selection

1. Read `.claude/progress/spec-pipeline.md`.
2. Find shards where BE is `complete` and FE is `not-started`.
3. Select lowest-numbered eligible shard unless user explicitly overrides.
4. If none remain, stop and recommend `/plan-phase`.

### Step 1 — Run classify shard

Call skill: `write-fe-spec-classify`

Expected outputs:
- FE classification + rationale
- source mapping (BE + IA + cross-refs)
- accessibility extraction inventory
- design requirements from brand + design-system inputs
- FE spec stub created after approval

### Step 2 — Run write shard

Call skill: `write-fe-spec-write`

Expected outputs:
- Full FE spec file(s) in `.memory/wiki/specs/fe/`
- Updated `.memory/wiki/specs/fe/index.md`
- Updated `.claude/progress/spec-pipeline.md` FE status
- Ambiguity + navigation completeness gate outcomes

## Quality Gate

Do not close workflow unless all pass:
- component props/interfaces are explicit
- all interactive behaviors are defined
- BE field mapping is complete for data-driven UI
- loading/error/empty states defined for all fetch views
- WCAG 2.1 AA requirements are concretely specified
- responsive behavior and touch equivalents are specified
- IA accessibility requirements are consumed explicitly
- source mapping traceability is complete

## Completion Checklist

- [ ] target shard selected from pipeline state
- [ ] classify shard completed and approved
- [ ] write shard completed and approved
- [ ] FE index updated
- [ ] FE pipeline tracker updated
- [ ] ambiguity gate completed
- [ ] navigation completeness check completed when final FE shard
- [ ] next valid command recommendation emitted

## Next Steps

- if FE specs remain: `/write-fe-spec`
- if FE complete, ambiguity audit is clean, and navigation check passes: `/plan-phase`
