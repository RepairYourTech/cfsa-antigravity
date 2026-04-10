---
name: implement-slice
description: Orchestrate single-slice implementation via setup and strict TDD passes with mandatory progress tracking updates
parameters:
  - name: slice
    type: string
    required: false
    description: Optional explicit slice identifier override
---

## Overview

Runs slice implementation in two shards: setup → tdd.


## Prerequisites

1. Phase plan exists with acceptance criteria for target slice
2. Surface stack map and command mappings are fully populated
3. Workspace setup prerequisites are complete

## Step-by-Step

### Step 1 — Run setup shard

Call skill: `implement-slice-setup`

Expected outputs:
- progress/session context loaded
- slice acceptance criteria + source specs loaded
- placeholder/map verification passed
- parallel mode decision captured
- contract schema written

### Step 2 — Run tdd shard

Call skill: `implement-slice-tdd`

Expected outputs:
- RED→GREEN→REFACTOR cycle completed
- validation command passed
- progress files updated and re-verified
- completion payload includes progress evidence and next command

## Quality Gate

Do not close workflow unless all pass:
- tests pass
- validation command passes
- all progress tracking files updated and re-read
- next command recommendation reflects infra/auth gate branching

## Completion Checklist

- [ ] setup shard completed
- [ ] tdd shard completed
- [ ] tests and validation green
- [ ] required progress artifacts updated and verified
- [ ] review/completion summary emitted with evidence

## Next Steps

- default: `/implement-slice` for next slice
- if infrastructure/auth gate applies: `/verify-infrastructure`
