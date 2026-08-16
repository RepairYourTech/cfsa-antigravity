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


## Prerequisites

1. FE spec seed stub exists with classification and source inventories
2. Classify shard has explicit user approval

## Step-by-Step

### Step 1 — Re-run handling and FE spec authoring

1. Detect existing authored content and handle continue vs targeted redo.
2. Write FE spec sections using FE template and conventions.
3. Include split-group metadata for split-origin specs when applicable.

### Step 2 — Content completeness floor (replaces line-count gate)

For every component, view, and form, verify all of: state enumeration (idle/loading/error-per-class/empty/success/optimistic-pending/optimistic-rollback/disabled/degraded), role variants matrix with no empty cells (full/read-only/partial-hidden/disabled/not-rendered with specific fields/actions), form fields with validation + error copy + on-blur vs on-submit behavior, empty/loading/error UI copy + retry affordances, responsive interaction-behavior changes per breakpoint, accessibility inventory per interactive element (keyboard binding + focus order + screen-reader text + ARIA), navigation (back/deep-link/bookmark/multi-tab/unsaved-changes), and network-degradation behavior (loading-threshold + retry + offline).

Hard gate: any missing cell on any component blocks the spec from advancing. Inheritance from design system must be cited per component; "implicit" is not allowed. Length is informational only.

### Step 3 — Index and tracker updates

1. Update `.memory/wiki/specs/fe/index.md` status.
2. Update FE completion state in `.memory/pipeline/progress/spec-pipeline.md` via protocol.

### Step 4 — Iterative deepening passes

Run multi-pass refinement (passes 1–7 mandatory, 8–10 conditional, hard stop after 10):
1. state synchronization and source-of-truth behavior
2. degraded network behavior and retry semantics
3. user-flow sequencing and persistence behavior
4. responsive/touch interaction gap analysis
5. state enumeration completeness (per-class error UI, optimistic states, degraded states, transition triggers, persistence across nav)
6. role-conditional rendering exhaustion (role × component matrix with no empty cells; specify hidden fields, disabled actions, layout-slot collapse)
7. accessibility edge-case enumeration (keyboard, focus management, screen-reader announcements, color/contrast, motion preferences)
8–10. additional convergence passes if prior pass produced significant additions

### Step 5 — Cross-reference + ambiguity gates

1. Verify links to BE source, IA source, and related FE specs.
2. Verify citations for cross-shard material.
3. Run micro/macro ambiguity checks + two-implementer + devil's-advocate passes.
4. If final FE spec, run `/audit-ambiguity fe` before plan-phase recommendation.

### Step 6 — Dependency/bootstrap, ledger, and navigation completeness

1. Detect new FE dependencies and run bootstrap + verification when needed.
2. Update feature ledger FE coverage when ledger exists.
3. If all FE specs complete, run navigation completeness check and resolve orphan routes.

### Step 7 — Graph refresh, review request, and constrained next-step recommendation

1. Run Protocol 8 fully, including mandatory `memory_compile` graph refresh after tracker verification.
2. Present:
- spec link(s)
- cross-reference verification status
- ambiguity gate status
- spec graph refresh confirmation
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
- [ ] spec graph refreshed via `memory_compile`
- [ ] review requested with constrained next-step options

## Next Steps

- if FE specs remain: `/write-fe-spec`
- if FE complete and all gates pass: `/plan-phase`
