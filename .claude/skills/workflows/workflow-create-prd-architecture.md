---
name: create-prd-architecture
description: Define system architecture, error architecture, and data strategy with map guards and ideation context reload
parameters:
  - name: strict_map_guard
    type: boolean
    required: false
    description: If true, fail immediately when required map cells are missing
---

## Overview


## Prerequisites

1. Stack decisions completed
2. Required map cells available for Hosting, ORMs, Databases

## Step-by-Step

### Step 0 — Map guard and context reload

1. Validate required map cells from `.claude/instructions/tech-stack.md`.
2. If any required cell is empty: stop and request map completion.
3. Read ideation context sources (index, constraints, global/domain CX, domain indexes or digest).
4. Resume/initialize checkpoint.

### Step 1 — System architecture section

Design and confirm:
1. Component diagram
2. Data flow lifecycle
3. Deployment topology
4. API surface
5. Deployment strategy
6. Surface interconnection (when multi-surface)
7. Shared domain boundary ownership

Write confirmed `## System Architecture` to `docs/plans/architecture-draft.md` immediately.

### Step 2 — Error architecture section (hard gate)

1. Run error architecture interview.
2. Confirm all five required decisions.
3. Write `## Error Architecture` with five sub-sections and canonical envelope example.

### Step 3 — Data strategy section

1. Run data strategy interview using database/ORM skill guidance.
2. Define placement, schema approach, query patterns, migrations, PII boundaries.
3. For multi-surface: define ownership and sync protocol.
4. Run cross-store entity consistency pass.
5. Write confirmed `## Data Strategy` to architecture draft.

### Step 4 — Data placement document

Create `docs/plans/data-placement-strategy.md` from template using locked data decisions.

## Completion Checklist

- [ ] Map guard passed
- [ ] Ideation context reloaded
- [ ] System architecture written and confirmed
- [ ] Error architecture written and confirmed
- [ ] Data strategy written and confirmed
- [ ] Cross-store consistency captured
- [ ] data-placement-strategy.md created
- [ ] Checkpoint updated

## Next Steps

- Run `create-prd-security`
