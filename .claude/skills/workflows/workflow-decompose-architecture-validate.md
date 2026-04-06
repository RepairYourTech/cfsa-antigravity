---
name: decompose-architecture-validate
description: Validate shard load/dependencies, create deep-dive skeletons, update ledger assignments, and generate pipeline tracker
parameters:
  - name: strict
    type: boolean
    required: false
    description: If true, fail on any unresolved dependency or missing coverage
---

## Overview

Parity source:
- `.agent/workflows/decompose-architecture-validate.md`

Port of `.agent/workflows/decompose-architecture-validate.md` to Claude Code skill format.

## Prerequisites

1. Structure shard completed
2. IA shard skeletons and indexes exist

## Step-by-Step

### Step 1 — Proactive shard load pre-check

1. Evaluate each shard against shard-load thresholds using ideation domain signals.
2. Flag overloaded shards for split review before dependency validation.

### Step 2 — Deep dive candidate generation

1. For each shard marked `Needs Deep Dive`, create skeleton file under `docs/plans/ia/deep-dives/`.
2. Add deep-dive references to parent IA shard files and IA index entries.

### Step 3 — Shard annotation and dependency graph validation

1. Annotate preliminary shard document type per classification table.
2. Validate dependency graph:
   - no circular dependencies
   - cross-cutting shard directionality holds
   - deep-dive references exist
3. Enforce Must Have feature coverage across IA shards.
4. If shard splits are needed, update decomposition plan and re-run coverage check before proceeding.

### Step 4 — Feature ledger IA assignment (conditional)

1. If `docs/plans/feature-ledger.md` exists, map features to IA shards.
2. Populate IA shard + IA status columns.
3. Run orphan detection and stop for resolution if orphans are present.

### Step 5 — Generate spec pipeline tracker and request review

1. Generate tracker using spec pipeline generation protocol.
2. Present outputs for review:
   - IA directory/indexes
   - deep dives
   - BE/FE indexes
   - master index
   - tracker
3. Stop and wait for explicit approval.

## Completion Checklist

- [ ] shard-load pre-check completed
- [ ] deep-dive candidates generated and referenced
- [ ] shard type annotations added
- [ ] dependency graph validated
- [ ] Must Have coverage validated
- [ ] feature ledger assignment updated (if ledger exists)
- [ ] spec pipeline tracker generated
- [ ] review requested and workflow paused

## Next Steps

After approval, the only valid next command is:
- `/write-architecture-spec`
