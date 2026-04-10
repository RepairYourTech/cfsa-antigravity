---
name: decompose-architecture
description: Decompose approved architecture design into IA shards and layered spec structure, then validate dependencies and tracking outputs
parameters:
  - name: architecture_doc
    type: string
    required: false
    description: Optional explicit architecture-design file path; defaults to latest dated file
---

## Overview

Runs decomposition in two shards: structure → validate.


## Prerequisites

1. Approved `docs/plans/*-architecture-design.md` exists
2. `docs/plans/ideation/ideation-index.md` exists
3. If surfaces include web/mobile/desktop, `docs/plans/design-system.md` should exist before FE specification work

## Step-by-Step

### Step 0 — Architecture readiness and consistency gates

1. Locate latest dated architecture design document if no explicit path is provided.
2. Validate `**Status**: Approved` is present.
3. Read ideation index and compare structural classification with architecture project type.
4. If mismatch is detected: stop and require decision propagation/resolution before decomposition.

### Step 1 — Domain boundary analysis

1. Load architecture-mapping and shard-boundary analysis guidance.
2. Walk ideation fractal structure to identify domain boundaries.
3. Build boundary table and assign shard numbers (`00-*` foundation, then dependency order).
4. Present decomposition proposal and require explicit approval.
5. Write `docs/plans/ia/decomposition-plan.md` immediately after approval.

### Step 2 — Run structure shard

Call skill: `decompose-architecture-structure`

Expected outputs:
- `docs/plans/ia/*.md` shard skeletons (including mandatory `00-infrastructure.md`)
- `docs/plans/ia/index.md`
- `docs/plans/be/index.md`
- `docs/plans/fe/index.md`
- `docs/plans/index.md`

### Step 3 — Run validate shard

Call skill: `decompose-architecture-validate`

Expected outputs:
- deep dive skeletons under `docs/plans/ia/deep-dives/`
- shard type annotations and dependency validation results
- updated feature ledger IA assignments (when ledger exists)
- generated spec pipeline tracker

## Completion Checklist

- [ ] Architecture status and consistency gates passed
- [ ] Domain boundaries approved and written
- [ ] Structure shard completed
- [ ] Validate shard completed
- [ ] Review request issued for decomposition outputs
- [ ] Next valid command recommendation emitted

## Next Steps

After explicit approval, the only valid next command is:
- `/write-architecture-spec` (starting from the lowest-numbered pending shard)
