---
name: create-prd-stack
description: Execute constraint-first tech stack decisioning with per-axis ideation synthesis and progressive bootstrap triggers
parameters:
  - name: strict
    type: boolean
    required: false
    description: If true, fail when any decision axis remains unresolved
---

## Overview


## Prerequisites

1. `.memory/wiki/specs/ideation/ideation-index.md` exists
2. `.memory/wiki/specs/ideation/meta/constraints.md` exists and includes `## Project Surfaces`

## Step-by-Step

### Step 1 — Checkpoint resumption

1. Use workflow checkpoint protocol at `.memory/wiki/specs/architecture/prd-working/workflow-state.md`.
2. Resume if active shard matches; otherwise initialize fresh shard checkpoint.

### Step 2 — Constraint-first discovery

1. Read constraints and ideation index for structural classification + engagement tier.
2. Build and present constraints map:
   - hard constraints
   - surface constraints
   - soft constraints
3. Read per-axis constraint question references before options.

### Step 3 — Build ideation relevance index (mandatory)

1. Create `.memory/wiki/specs/architecture/prd-working/ideation-relevance-index.md`.
2. Map each decision axis to relevant domain/deep-dive/CX files.
3. Enforce stop gate: every axis must have at least one relevant ideation file.

### Step 4 — Per-axis stack decisions

For each applicable axis:
1. Read all files listed for that axis in relevance index.
2. Answer Tier 1 constraint questions from ideation evidence.
3. Append axis synthesis (3-5 cited bullets) to `.memory/wiki/specs/architecture/prd-working/stack-synthesis.md`.
4. Enforce cite-or-stop gate (minimum two project-specific citations).
5. Ask Tier 2 user-facing questions.
6. Present filtered options + recommendation.
7. Confirm decision (tier-aware).
8. Trigger progressive bootstrap for confirmed key(s).
9. Verify bootstrap result and update checkpoint state.

### Step 5 — Persistence map interview

1. Run database persistence-map methodology from database-schema-design skill.
2. Confirm each required store.
3. Trigger bootstrap + verification per confirmed store.

### Step 6 — Design direction and tooling

1. Run design direction decision flow.
2. Trigger bootstrap for DESIGN_DIRECTION.
3. Confirm development tooling axes and trigger bootstrap for tooling keys.

### Step 7 — Decision persistence

1. Append confirmed decisions to `.memory/wiki/specs/architecture-draft.md` as they are locked.
2. Ensure no unresolved `TBD` values remain in this shard output.

## Completion Checklist

- [ ] Checkpoint started/resumed
- [ ] Constraints map completed
- [ ] Ideation relevance index written
- [ ] Per-axis synthesis completed for all axes
- [ ] Progressive bootstrap fired and verified per confirmed key
- [ ] Persistence map interview completed
- [ ] Design direction and tooling decisions completed
- [ ] Stack decisions written to architecture draft

## Next Steps

- Run `create-prd-design-system`
