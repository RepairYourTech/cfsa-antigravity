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

1. `.memory/wiki/specs/ideation/ideation-index.md` exists and is complete
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
- `.memory/wiki/specs/architecture/prd-working/ideation-relevance-index.md`
- `.memory/wiki/specs/architecture/prd-working/stack-synthesis.md`
- Stack decisions appended to `.memory/wiki/specs/architecture-draft.md`

### Step 2 — Run design-system shard

Call skill: `create-prd-design-system`

Expected outputs:
- `.memory/wiki/specs/design-system.md`
- `.memory/wiki/specs/architecture/prd-working/design-system-synthesis.md`

### Step 3 — Run architecture shard

Call skill: `create-prd-architecture`

Expected outputs:
- `## System Architecture` in `.memory/wiki/specs/architecture-draft.md`
- `## Error Architecture` in `.memory/wiki/specs/architecture-draft.md`
- `## Data Strategy` in `.memory/wiki/specs/architecture-draft.md`
- `.memory/wiki/specs/data-placement-strategy.md`

### Step 4 — Run security shard

Call skill: `create-prd-security`

Expected outputs:
- `## Security Model` in `.memory/wiki/specs/architecture-draft.md`
- `## Security — Attack Surface` in `.memory/wiki/specs/architecture-draft.md`
- `## Integration Points` in `.memory/wiki/specs/architecture-draft.md`
- `## Observability Architecture` in `.memory/wiki/specs/architecture-draft.md`

### Step 5 — Run compile shard

Call skill: `create-prd-compile`

Expected outputs:
- `.memory/wiki/specs/YYYY-MM-DD-architecture-design.md`
- `.memory/wiki/specs/ENGINEERING-STANDARDS.md`
- Checkpoint cleanup in `.memory/wiki/specs/architecture/prd-working/`

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
