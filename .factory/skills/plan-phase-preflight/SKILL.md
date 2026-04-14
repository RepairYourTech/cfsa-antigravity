---
name: plan-phase-preflight
description: Validate sequencing and cross-layer readiness before phase slicing, including coverage and consistency hard gates
parameters:
  - name: phase
    type: string
    required: false
    description: Optional explicit phase number override
---

## Overview


## Prerequisites

1. Approved IA/BE/FE specs exist
2. Progress state files exist under `.factory/progress/`

## Step-by-Step

### Step 0 — Phase sequencing gate

1. Read `.factory/progress/index.md` for current phase number.
2. If planning Phase N>1, verify Phase N-1 is complete and has passing `/validate-phase`.
3. Run architecture map freshness warning gate for N>1 (warning + user resolution).

### Step 1 — Planning skill load

1. Load testing-strategist and technical-writer planning guidance.

### Step 2 — Application completeness audit

1. Read surfaces from tech-stack map.
2. Run only applicable checks by surface class:
   - route coverage
   - navigation coverage
   - auth state coverage
   - empty/error states
   - onboarding
   - web/desktop global error pages
   - cli help/exit/discovery coverage
3. If any applicable check fails, stop and require FE spec remediation.

### Step 3 — Cross-layer consistency hard gates

1. Run BE↔FE coverage checks (with internal-only exception handling).
2. Enforce minimum consistency checks:
   - field mapping integrity
   - BE error code FE propagation
   - access-control role consistency
   - IA→BE contract drift
   - optimistic update rollback support
3. If mismatches exist, stop and require resolution.

### Step 4 — Feature ledger verification (conditional)

1. If feature ledger exists, verify no orphan statuses in IA/BE/FE columns.
2. Block progression when orphaned features remain.

### Step 5 — Draft continuity decision

1. Detect existing `.memory/wiki/specs/phases/phase-N-draft.md`.
2. Require explicit user decision to continue missing slices vs start fresh.

## Completion Checklist

- [ ] sequencing gate passed
- [ ] completeness audit passed for applicable surfaces
- [ ] cross-layer consistency checks passed
- [ ] feature ledger verification passed (or skipped if absent)
- [ ] draft continuity decision captured

## Next Steps

- Run `plan-phase-write`
