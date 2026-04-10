---
name: create-prd
description: Orchestrate architecture design generation from ideation through stack, design-system, architecture, security, and compile shards
parameters:
  - name: ideation_index
    type: string
    required: false
    description: Optional override path to ideation-index.md
---

## Overview

Runs the create-prd stage in five shards and compiles final architecture outputs.


## Prerequisites

1. `docs/plans/ideation/ideation-index.md` exists and is complete
2. Ideation approval already obtained
3. `.claude/instructions/tech-stack.md` exists and has resolved values for required map cells

## Step-by-Step

### Step 0 — Ideation readiness gate

1. Read ideation index and validate required sections:
   - `## Structural Classification`
   - `## Engagement Tier`
   - `## MoSCoW Summary` (with at least one Must Have)
2. If missing required sections: stop and direct user to complete ideation.
3. For large ideation sets, run deep ideation loading protocol and write digest to architecture draft.

### Step 1 — Run stack shard

Call skill: `create-prd-stack`

Expected outputs:
- `docs/plans/prd-working/ideation-relevance-index.md`
- `docs/plans/prd-working/stack-synthesis.md`
- Stack decisions appended to `docs/plans/architecture-draft.md`

### Step 2 — Run design-system shard

Call skill: `create-prd-design-system`

Expected outputs:
- `docs/plans/design-system.md`
- `docs/plans/prd-working/design-system-synthesis.md`

### Step 3 — Run architecture shard

Call skill: `create-prd-architecture`

Expected outputs:
- `## System Architecture` in `docs/plans/architecture-draft.md`
- `## Error Architecture` in `docs/plans/architecture-draft.md`
- `## Data Strategy` in `docs/plans/architecture-draft.md`
- `docs/plans/data-placement-strategy.md`

### Step 4 — Run security shard

Call skill: `create-prd-security`

Expected outputs:
- `## Security Model` in `docs/plans/architecture-draft.md`
- `## Security — Attack Surface` in `docs/plans/architecture-draft.md`
- `## Integration Points` in `docs/plans/architecture-draft.md`
- `## Observability Architecture` in `docs/plans/architecture-draft.md`

### Step 5 — Run compile shard

Call skill: `create-prd-compile`

Expected outputs:
- `docs/plans/YYYY-MM-DD-architecture-design.md`
- `docs/plans/ENGINEERING-STANDARDS.md`
- Checkpoint cleanup in `docs/plans/prd-working/`

## Completion Checklist

- [ ] Ideation readiness and size-aware loading handled
- [ ] Stack shard complete
- [ ] Design-system shard complete
- [ ] Architecture shard complete
- [ ] Security shard complete
- [ ] Compile shard complete
- [ ] Architecture rubric self-check complete
- [ ] User review requested with both final documents
- [ ] Next command recommendation emitted

## Next Steps

After explicit user approval of compiled architecture outputs, the only valid next command is:
- `/audit-ambiguity architecture`
