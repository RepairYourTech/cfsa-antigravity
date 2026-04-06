---
name: decompose-architecture-structure
description: Create decomposition directory structure, IA shard skeletons, and all required layer indexes from approved decomposition plan
parameters:
  - name: strict
    type: boolean
    required: false
    description: If true, fail on any missing shard skeleton or index artifact
---

## Overview

Parity source:
- `.agent/workflows/decompose-architecture-structure.md`

Port of `.agent/workflows/decompose-architecture-structure.md` to Claude Code skill format.

## Prerequisites

1. `docs/plans/ia/decomposition-plan.md` exists
2. Decomposition plan contains a populated domain boundary table

## Step-by-Step

### Step 1 — Validate decomposition plan input

1. Verify decomposition plan exists and has `## Domain Boundary Table`.
2. If missing or incomplete: stop and return control to parent decomposition workflow.

### Step 2 — Create layer-aware structure

1. Preserve layer-first structure:
   - `docs/plans/ia/`
   - `docs/plans/be/`
   - `docs/plans/fe/`
2. For multi-surface projects, create surface subdirectories under `be/` and `fe/` only.
3. Ensure each new surface directory includes `.gitkeep` and `README.md`.

### Step 3 — Seed IA shard skeletons

1. Create mandatory `docs/plans/ia/00-infrastructure.md` first.
2. Create one IA shard skeleton per decomposition-plan shard using decomposition templates.
3. Seed initial sub-feature references from ideation fractal mapping logic.
4. Verify all expected shard files exist and are non-empty.
5. Enforce shard-count thresholds from boundary analysis guidance.

### Step 4 — Coverage and index generation

1. Run Must Have domain coverage check (each Must domain must map to at least one shard).
2. Create `docs/plans/ia/index.md`.
3. Create `docs/plans/be/index.md`.
4. Create `docs/plans/fe/index.md`.
5. Create or update `docs/plans/index.md` using single- or multi-surface template variant.

## Completion Checklist

- [ ] decomposition-plan input validated
- [ ] layer-first structure prepared
- [ ] 00-infrastructure shard created
- [ ] all planned shard skeletons created
- [ ] Must Have domain coverage check passed
- [ ] IA/BE/FE/master indexes created

## Next Steps

- Run `decompose-architecture-validate`
