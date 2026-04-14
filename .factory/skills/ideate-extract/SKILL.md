---
name: ideate-extract
description: Classify ideation input, run structural classification, seed fractal ideation folders, and persist engagement/expansion mode
parameters:
  - name: input_source
    type: string
    required: false
    description: Optional file path or inline text for classification
---

## Overview


## Prerequisites

1. User provided idea input (file or verbal)
2. If file path is provided, it exists and is non-empty

## Step-by-Step

### Step 1 — Input assessment

1. Read and apply input classification protocol from `.factory/skills/prd-templates/references/input-classification.md`.
2. Read `.factory/skills/idea-extraction/SKILL.md` and run mode-specific path:
   - Extraction mode (rich input)
   - Expansion mode (thin input)
   - Interview mode (verbal/no file)
3. Enforce gate: classification yields one input type only.

### Step 2 — Structural classification

1. Run structural classification protocol from `idea-extraction/SKILL.md`.
2. Write one of:
   - `single-surface`
   - `multi-surface-shared`
   - `multi-product-hub`
   - `multi-product-peer`
   into `.memory/wiki/specs/ideation/ideation-index.md` under `## Structural Classification`.

### Step 3 — Re-run decision

1. If ideation index already exists, summarize current state.
2. Ask user to continue or start fresh.
3. If start fresh, archive old ideation folder before reseeding.

### Step 4 — Seed fractal ideation folder

1. Follow folder seeding protocol from `.factory/skills/prd-templates/references/folder-seeding-protocol.md`.
2. Create required node artifacts (`{slug}-index.md`, `{slug}-cx.md`, feature leaves).
3. Verify `.memory/wiki/specs/ideation/.gitkeep` and `.memory/wiki/specs/ideation/README.md` remain present.

### Step 5 — Engagement + expansion persistence

1. Read engagement tier protocol and capture user-selected tier.
2. Write `## Engagement Tier` to ideation index immediately.
3. Read expansion modes reference and capture selected mode.
4. Write `## Expansion Mode` to ideation index immediately.

### Step 6 — Skill load handoff

1. Load `idea-extraction` methodology for downstream exploration.
2. Load `resolve-ambiguity` for reactive ambiguity handling.
3. Stop with explicit handoff to discover shard.

## Completion Checklist

- [ ] Input classified with a single mode
- [ ] Structural classification written
- [ ] Re-run decision handled
- [ ] Fractal ideation folder seeded and verified
- [ ] Engagement tier written
- [ ] Expansion mode written
- [ ] Handoff emitted to discover shard

## Next Steps

- Run `ideate-discover`
