---
name: write-architecture-spec-design
description: Draft IA shard sections from reconciled ideation and architecture sources, with write-as-you-go section locking
parameters:
  - name: shard
    type: string
    required: false
    description: Optional explicit IA shard filename
---

## Overview


## Prerequisites

1. Target IA shard skeleton exists under `docs/plans/ia/`
2. Pipeline tracker is available to determine current shard when not overridden

## Step-by-Step

### Step 0 — Pipeline and map guards

1. Read `.claude/progress/spec-pipeline.md` and select target shard.
2. Verify required stack map values exist in `.claude/instructions/tech-stack.md`:
   - Databases
   - Security
   - Surfaces
3. If guards fail: stop and route to prerequisite workflow.

### Step 1 — Re-run check for partially filled shard

1. Inspect target IA shard for existing authored sections.
2. If partial content exists, ask whether to continue (skip completed sections) or redo selected sections.

### Step 2 — Requirements reconciliation and scope lock

1. Reconcile authoritative sources (ideation domain tree + shard features + MoSCoW summary).
2. Run sub-feature reconciliation protocol.
3. Present adds/removals/re-scope outcomes and lock scope.
4. If sub-feature count exceeds split threshold, stop and route through decomposition remediation.

### Step 3 — Draft and lock required sections (write-as-you-go)

For each section below:
1. present proposed content + review questions
2. confirm decisions
3. write section immediately to shard file

Sections:
- `## Interactions`
- `## Contracts`
- `## Data Models`
- `## Access Control`
- `## Accessibility`
- `## Event Schemas` (explicit N/A allowed)
- `## Edge Cases`

### Step 4 — Deep dive file writes (conditional)

1. Detect deep-dive references in shard.
2. For referenced deep-dive skeletons, author exhaustive subsystem details when still placeholders.

### Step 5 — Completeness gate and review request

1. Verify all required sections exist and are non-empty.
2. Verify no unresolved skeleton markers remain for required sections.
3. Request explicit approval before deepen shard begins.

## Completion Checklist

- [ ] pipeline + map guards passed
- [ ] scope reconciliation completed and confirmed
- [ ] all required sections written progressively
- [ ] conditional deep-dive files authored where referenced
- [ ] section completeness gate passed
- [ ] explicit approval requested

## Next Steps

- Run `write-architecture-spec-deepen`
