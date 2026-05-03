---
name: ideate
description: Orchestrate ideation from raw input to validated ideation outputs with shard composition
parameters:
  - name: input_source
    type: string
    required: false
    description: Optional path or inline idea text used for ideation
---

## Overview

Runs the ideation stage in three shards: extract → discover → validate.


## Prerequisites

1. Project has been initialized for Codex (`cfsa-antigravity init --agent codex`)
2. `.codex/instructions/tech-stack.md` exists
3. User has provided an idea (inline or `@file`)

## Step-by-Step

### Step 0 — Re-run and cascade guard

1. Check whether `.memory/wiki/specs/ideation/ideation-index.md` exists.
2. If missing: continue.
3. If present and valid: scan downstream artifacts (`.memory/wiki/specs/*-architecture-design.md`, `.memory/wiki/specs/ia/`, `.memory/wiki/specs/be/`, `.memory/wiki/specs/fe/`).
4. If downstream artifacts exist: STOP and require explicit overwrite confirmation due to cascade invalidation.
5. If user aborts: end workflow.

### Step 1 — Run extract shard

Call skill: `ideate-extract`

Input:
- `input_source`

Expected outputs:
- `.memory/wiki/specs/ideation/` fractal structure seeded
- `## Structural Classification` written in ideation index
- `## Engagement Tier` written
- `## Expansion Mode` written

### Step 2 — Run discover shard

Call skill: `ideate-discover`

Expected outputs:
- Recursive domain exploration completed
- Meta problem/persona/competitive files created
- MoSCoW populated
- Cross-cut synthesis pass completed

### Step 3 — Run validate shard

Call skill: `ideate-validate`

Expected outputs:
- `.memory/wiki/specs/ideation/meta/constraints.md`
- `.memory/wiki/specs/vision.md`
- `.memory/wiki/specs/feature-ledger.md`
- Ideation rubric self-check complete

## Completion Checklist

- [ ] Re-run/cascade guard evaluated
- [ ] Extract shard completed
- [ ] Discover shard completed
- [ ] Validate shard completed
- [ ] User review requested for ideation outputs
- [ ] Next pipeline step explicitly recommended

## Next Steps

After approval of ideation outputs, the only valid next command is:
- `/audit-ambiguity ideation`
