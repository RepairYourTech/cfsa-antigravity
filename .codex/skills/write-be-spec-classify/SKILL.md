---
name: write-be-spec-classify
description: Classify target IA shard for BE extraction, load stack skills, and produce a complete referenced-material inventory
parameters:
  - name: shard
    type: string
    required: false
    description: Optional explicit IA shard filename
---

## Overview


## Prerequisites

1. Target IA shard is complete
2. `.memory/wiki/specs/ia/index.md` and `.codex/progress/spec-pipeline.md` are present

## Step-by-Step

### Step 0 — Pipeline and IA readiness gates

1. Read pipeline tracker and select BE target shard.
2. Verify IA completion state for selected shard.
3. If IA incomplete, stop and route to IA workflow.

### Step 1 — Classification

1. Apply BE classification guidance (feature domain / multi-domain split / cross-cutting / structural reference / composite).
2. Provide classification rationale, expected BE spec count, and split boundaries.
3. Require explicit user approval before proceeding.

### Step 2 — Surface stack map validation

1. Resolve shard surface context.
2. Verify required stack map values:
   - Languages
   - Databases
   - BE Frameworks
   - ORMs
   - Unit Tests
   - Auth (cross-cutting)
3. If missing values, stop and route to PRD stage completion.

### Step 3 — Skill loading bundle

1. Load required backend design skills and conditional async/workflow-automation skills when needed.
2. Load ambiguity skill when unresolved requirements appear.

### Step 4 — Source ingestion and inventory

Read in order:
1. BE and master indexes + data-placement strategy
2. primary IA shard
3. cross-shard references with section-level capture
4. referenced deep dives (must be complete)
5. testability/acceptance sections (when present)
6. completed cross-cutting BE specs (`00-*`)

Build Referenced Material Inventory with file/section/line source records.

### Step 5 — Approval and spec stub creation

1. Present classification + inventory and request explicit approval.
2. After approval, create BE spec stub(s) from BE template.
3. If structural reference (0 specs), emit no-write branch and recommend next shard.

## Completion Checklist

- [ ] target shard selected and IA-complete
- [ ] classification approved
- [ ] stack map validation passed
- [ ] skill bundle loaded
- [ ] referenced material inventory complete
- [ ] deep-dive completeness validated
- [ ] BE stub(s) created after approval

## Next Steps

- Run `write-be-spec-write`
