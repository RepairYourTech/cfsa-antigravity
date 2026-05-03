---
name: ideate-discover
description: Execute recursive breadth-before-depth ideation discovery with Deep Think, CX gate enforcement, and feature deepening
parameters:
  - name: resume
    type: boolean
    required: false
    description: Resume from partially explored ideation folders when true
---

## Overview


## Prerequisites

1. `.memory/wiki/specs/ideation/ideation-index.md` exists
2. Extract shard already completed

## Step-by-Step

### Step 1 — Mid-shard resumption check

1. Scan existing ideation domain folders and feature files.
2. If partially complete, skip completed domains and continue at first incomplete domain.
3. If all domains marked deep/exhausted, skip to problem exploration or handoff to validate.

### Step 2 — Read engagement tier and apply gate behavior

1. Read `## Engagement Tier` from ideation index.
2. Apply gate behavior from `.codex/skills/prd-templates/references/engagement-tier-protocol.md`.
3. If tier missing, default to Hybrid and request override/confirmation.

### Step 3 — Recursive domain exploration

1. Execute recursive exhaustion protocol in `.codex/skills/idea-extraction/SKILL.md`.
2. Route by expansion mode from ideation index:
   - Full
   - Vertical
   - Horizontal
   - Cross-cutting
   - Combination
   - As-is
   - Audit ambiguity first
3. Enforce CX Decision Gate after each resolved question/decision/hypothesis.

### Step 4 — Problem exploration

Write and verify:
- `.memory/wiki/specs/ideation/meta/problem-statement.md`
- `.memory/wiki/specs/ideation/meta/personas.md`
- `.memory/wiki/specs/ideation/meta/competitive-landscape.md`

Ensure `Why Now` section exists in problem statement.

### Step 5 — Feature inventory and deepening

1. Build MoSCoW matrix in ideation index.
2. Enforce 0 Must Have guard.
3. Run adjacent feature analysis and capture accepted additions.
4. Deepen Must Haves recursively.
5. Deepen Should Haves at Level 1.

### Step 6 — Mandatory cross-cut synthesis sweep

1. Evaluate at least Must×Must and Must×Should feature pair matrix.
2. Classify emergent capabilities (already captured / new cross-cut / new feature).
3. Persist accepted cross-cuts and accepted new features immediately.
4. Enforce CX coverage check when multiple active domains exist.

### Step 7 — Post-discovery verification

1. Verify each domain in Domain Map has required index and CX files.
2. Verify ideation index has populated Domain Map.
3. Create any missing required artifacts before exit.

## Completion Checklist

- [ ] Resumption logic handled
- [ ] Engagement tier gate behavior applied
- [ ] Recursive exploration completed for selected mode
- [ ] Meta files created and non-empty
- [ ] MoSCoW matrix populated with Must Haves
- [ ] Cross-cut synthesis sweep completed
- [ ] Required ideation artifacts verified
- [ ] Handoff emitted to validate shard

## Next Steps

- Run `ideate-validate`
