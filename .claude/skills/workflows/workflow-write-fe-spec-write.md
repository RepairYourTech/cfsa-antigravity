---
name: write-fe-spec-write
description: Author FE spec files, update indexes/tracker, run deepening and ambiguity gates, and enforce navigation completeness before plan-phase handoff
parameters:
  - name: spec_file
    type: string
    required: false
    description: Optional explicit FE spec filename
---

## Overview

Parity source:
- `.agent/workflows/write-fe-spec-write.md`

Port of `.agent/workflows/write-fe-spec-write.md` to Claude Code skill format.

## Prerequisites

1. FE spec seed stub exists with classification and source inventories
2. Classify shard has explicit user approval

## Step-by-Step

### Step 1 — Re-run handling and FE spec authoring

1. Detect existing authored content and handle continue vs targeted redo.
2. Write FE spec sections using FE template and conventions.
3. Include split-group metadata for split-origin specs when applicable.

### Step 2 — Complexity gate

Apply line-count thresholds:
- <=600 pass
- 601-800 warn
- >800 hard stop and split recommendation

### Step 3 — Index and tracker updates

1. Update `docs/plans/fe/index.md` status.
2. Update FE completion state in `.agent/progress/spec-pipeline.md` via protocol.

### Step 4 — Iterative deepening passes

Run multi-pass refinement:
1. state synchronization and source-of-truth behavior
2. degraded network behavior and retry semantics
3. user-flow sequencing and persistence behavior
4. responsive/touch interaction gap analysis
5. optional convergence pass (loop guard enforced)

### Step 5 — Cross-reference + ambiguity gates

1. Verify links to BE source, IA source, and related FE specs.
2. Verify citations for cross-shard material.
3. Run micro/macro ambiguity checks + two-implementer + devil's-advocate passes.
4. If final FE spec, run `/audit-ambiguity fe` before plan-phase recommendation.

### Step 6 — Dependency/bootstrap, ledger, and navigation completeness

1. Detect new FE dependencies and run bootstrap + verification when needed.
2. Update feature ledger FE coverage when ledger exists.
3. If all FE specs complete, run navigation completeness check and resolve orphan routes.

### Step 7 — Review request and constrained next-step recommendation

Present:
- spec link(s)
- cross-reference verification status
- ambiguity gate status
- pipeline state and allowed next command

## Completion Checklist

- [ ] FE spec fully authored
- [ ] complexity gate handled
- [ ] FE index updated
- [ ] pipeline tracker updated
- [ ] deepening passes completed
- [ ] ambiguity gate completed
- [ ] dependency bootstrap checks handled
- [ ] feature ledger FE coverage updated (if present)
- [ ] navigation completeness check passed when final FE spec
- [ ] review requested with constrained next-step options

## Next Steps

- if FE specs remain: `/write-fe-spec`
- if FE complete and all gates pass: `/plan-phase`
