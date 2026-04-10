---
name: write-architecture-spec-deepen
description: Run iterative IA deepening, finalize shard, update indexes/tracker, and enforce ambiguity gates before handoff
parameters:
  - name: shard
    type: string
    required: false
    description: Optional explicit IA shard filename
---

## Overview


## Prerequisites

1. Target IA shard exists with all design sections filled (no unresolved skeleton markers)
2. Design shard has completed and received explicit approval

## Step-by-Step

### Step 1 — Skeleton and readiness guard

1. Verify target shard has no unresolved placeholder/TODO skeleton markers in required authored sections.
2. If unresolved markers remain, stop and return to design shard.

### Step 2 — Iterative deepening passes

Run passes until no meaningful additions remain (with pass-loop guard):
1. cross-section consistency
2. what-if scenario expansion
3. adversarial/abuse-path pass
4. additional convergence passes when new material appears

Ensure event-consumer cross-references are valid and bidirectional.

### Step 3 — Finalize shard and run complexity gate

1. Write full integrated shard content to `docs/plans/ia/[shard-name].md`.
2. Re-read and verify required sections are non-empty and consistent.
3. Apply complexity thresholds:
   - <=400 lines pass
   - 401-500 lines warn
   - >500 lines stop and trigger split path

### Step 4 — Update indexes and tracker

1. Mark shard complete in `docs/plans/ia/index.md`.
2. Update `.factory/progress/spec-pipeline.md` IA column via protocol.
3. Run conditional bootstrap if shard is the architecture-design stack-lock shard.

### Step 5 — Ambiguity gates and last-shard branch

1. Run micro + macro ambiguity gates and two-implementer/devil's-advocate checks.
2. If this is the last IA shard, run `/audit-ambiguity ia` before any BE spec recommendation.
3. If IA shards remain, recommend next pending IA shard.

### Step 6 — Review request and constrained next-step recommendation

Present completion with:
- shard link
- cross-reference verification status
- ambiguity gate confirmation
- pipeline state and next allowed command

## Completion Checklist

- [ ] deepening passes completed with convergence
- [ ] cross-references validated bidirectionally
- [ ] complexity gate handled
- [ ] IA index updated
- [ ] spec pipeline tracker updated
- [ ] ambiguity gates passed
- [ ] last-shard audit branch handled correctly
- [ ] review request sent and workflow paused

## Next Steps

- if IA shards remain: `/write-architecture-spec`
- if IA complete and ambiguity audit passes: `/write-be-spec`
