---
name: ideate-validate
description: Validate ideation completeness through constraints, exhaustion, rubric checks, and output compilation
parameters:
  - name: strict
    type: boolean
    required: false
    description: If true, fail immediately on unresolved validation dimensions
---

## Overview


## Prerequisites

1. Discover shard completed
2. Ideation index exists and has deep/exhausted leaf coverage

## Step-by-Step

### Step 1 — Engagement tier-aware validation behavior

1. Read engagement tier from ideation index.
2. Apply tier behavior from engagement-tier protocol.

### Step 2 — Constraints and metrics

1. Run constraint exploration via `.claude/skills/prd-templates/references/constraint-exploration.md`.
2. Detect showstoppers and pause for user decision when found.
3. Write `docs/plans/ideation/meta/constraints.md` with at least one constraint entry.

### Step 3 — Domain exhaustion and missing-domain reasoning

1. Run domain exhaustion criteria from `.claude/skills/prd-templates/references/domain-exhaustion-criteria.md`.
2. Perform missing-domain reasoning:
   - product archetype baseline
   - folder coverage comparison
   - cross-feature gap implications
3. If new domains are accepted, seed and re-run exhaustion check.

### Step 4 — Auto-tier review checkpoint

If tier is Auto:
1. Present auto-confirmed decisions and reasoning.
2. Wait for overrides.
3. Persist corrections immediately.

### Step 5 — Compile outputs

1. Compile `docs/plans/vision.md` using vision template.
2. Run fidelity check: every domain from ideation index appears in vision.
3. Create `docs/plans/feature-ledger.md` with feature IDs, names, domains, and MoSCoW values.

### Step 6 — Ideation rubric quality gate and review request

1. Apply ideation rubric (`.claude/skills/pipeline-rubrics/references/ideation-rubric.md`) across all dimensions.
2. Resolve warning/fail dimensions before review request unless loop guard threshold reached.
3. Request user review of ideation index and vision outputs.
4. Stop and wait for explicit approval.

## Completion Checklist

- [ ] Constraints written and showstoppers handled
- [ ] Exhaustion criteria executed
- [ ] Missing-domain reasoning executed
- [ ] Auto-tier checkpoint handled when applicable
- [ ] vision.md compiled and fidelity-checked
- [ ] feature-ledger.md created
- [ ] Rubric self-check complete
- [ ] Review requested and workflow paused for approval

## Next Steps

After ideation approval, the only valid next command is:
- `/audit-ambiguity ideation`
