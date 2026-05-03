---
name: write-be-spec-write
description: Author and validate BE spec files, update indexes/tracker, run deepening and ambiguity gates, and enforce allowed next-step transitions
parameters:
  - name: spec_file
    type: string
    required: false
    description: Optional explicit BE spec filename
---

## Overview


## Prerequisites

1. BE spec stub exists and includes `## Classification`
2. Referenced Material Inventory exists from classify shard

## Step-by-Step

### Step 1 — Re-run and endpoint reconciliation gate

1. Detect existing authored content and decide continue vs targeted redo.
2. Build endpoint completeness reconciliation table before drafting sections.
3. Require each unspecced endpoint to be either authored now or explicitly deferred with reason.

### Step 2 — Write BE spec content

Use BE template/conventions and write full sections, including split-group metadata when applicable.

Core expectations:
- endpoint contracts
- schema rules
- middleware/security controls
- error strategy
- testing strategy hooks
- IA source mapping

### Step 3 — Complexity gate

Apply line-count thresholds:
- <=600 pass
- 601-800 warn
- >800 hard stop and split recommendation

### Step 4 — Index and tracker updates

1. Update `.memory/wiki/specs/be/index.md`.
2. Update BE completion state in `.codex/progress/spec-pipeline.md`.
3. Handle structural-reference no-spec rows when classification indicates 0 specs.

### Step 5 — Iterative deepening passes

Run multi-pass refinement:
1. cross-endpoint consistency
2. sequencing/concurrency scenarios
3. failure cascade analysis
4. optional convergence passes up to loop guard threshold

### Step 6 — Cross-reference + ambiguity gates

1. Verify back-links to IA source and related BE specs.
2. Verify deep-dive and cross-shard source citations.
3. Run micro/macro ambiguity checks, two-implementer test, devil's-advocate pass.
4. If last BE spec, run `/audit-ambiguity be` before allowing FE recommendation.

### Step 7 — Dependency/bootstrap and ledger updates

1. Detect newly introduced dependencies and trigger bootstrap + verification as needed.
2. Update feature ledger BE coverage when ledger exists.

### Step 8 — Graph refresh, review request, and constrained next-step recommendation

1. Run Protocol 8 fully, including mandatory `memory_compile` graph refresh after tracker verification.
2. Present:
- spec link(s)
- cross-reference verification status
- ambiguity gate status
- spec graph refresh confirmation
- pipeline state and only allowed next command (`/write-be-spec` or `/write-fe-spec`)

## Completion Checklist

- [ ] endpoint reconciliation table completed
- [ ] BE spec content fully authored
- [ ] complexity gate handled
- [ ] BE index updated
- [ ] pipeline tracker updated
- [ ] deepening passes completed
- [ ] ambiguity gate completed
- [ ] dependency bootstrap checks handled
- [ ] feature ledger BE coverage updated (if present)
- [ ] spec graph refreshed via `memory_compile`
- [ ] review requested with constrained next-step options

## Next Steps

- if BE specs remain: `/write-be-spec`
- if BE complete and ambiguity audit passes: `/write-fe-spec`
