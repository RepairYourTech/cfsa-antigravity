---
name: plan-phase-write
description: Derive slices from specs, order by dependencies, write acceptance criteria with citations, and finalize phase/progress artifacts
parameters:
  - name: phase
    type: string
    required: false
    description: Optional explicit phase number override
---

## Overview


## Prerequisites

1. Preflight shard passed
2. Scope sources available (architecture phasing + BE/FE indexes)

## Step-by-Step

### Step 1 — Read phase scope

1. Read architecture design phasing section.
2. Read BE index to determine in-scope specs.

### Step 2 — Spec-anchored slice derivation

1. Derive candidate slices from FE interaction specification user flows.
2. Map each flow to BE endpoints via source map.
3. Group only when strict dependency criteria are met.
4. Size slices (S/M/L).
5. Enforce L-slice review/split decision before ordering.
6. Enforce slice count sanity gates (warn at 16–25, hard stop >25).

### Step 3 — Spec coverage verification gate

1. Build BE endpoint coverage table (covered/uncov/deferred).
2. Build FE component coverage table.
3. Require every endpoint/component to be assigned or explicitly deferred before proceeding.
4. Update feature-ledger slice assignment when ledger exists.
5. Add split-companion context notes for letter-suffixed split groups.

### Step 4 — Dependency ordering and infrastructure gates

1. Order slices by dependency.
2. Enforce infrastructure-first rules and `/setup-workspace` prerequisite gate.
3. Add explicit `/verify-infrastructure` hard-gate checkpoints in the phase plan.
4. Incorporate parallelization guidance while preserving TDD order constraints.

### Step 5 — Acceptance criteria writing (write-as-you-go)

1. For each slice, write acceptance criteria using operational template.
2. Every criterion must include source citation (`[BE §..]`, `[FE §..]`, `[IA §..]`).
3. Append each completed slice progressively to `phase-N-draft.md`.

### Step 6 — Finalize and generate progress artifacts

1. Finalize `phase-N.md` from draft source.
2. Generate progress files via progress-generation protocol.
3. Run bootstrap/map completeness gate for planning-critical categories.

### Step 7 — Review request and constrained next step

1. Present phase plan + progress artifacts for approval.
2. Stop until explicit approval.
3. Recommend only `/implement-slice` as next command after approval.

## Completion Checklist

- [ ] scope and in-scope specs read
- [ ] slices derived from FE/BE sources
- [ ] coverage gate passed
- [ ] dependency ordering complete with infra gates
- [ ] acceptance criteria written with citations
- [ ] phase draft and final plan written
- [ ] progress files generated
- [ ] review requested with constrained next step

## Next Steps

After explicit approval:
- `/implement-slice`
