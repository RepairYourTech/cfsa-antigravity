---
name: write-fe-spec-classify
description: Classify FE target, validate prerequisites, load frontend skills, and build referenced-material inventory
parameters:
  - name: shard
    type: string
    required: false
    description: Optional explicit shard or FE spec target
---

## Overview


## Prerequisites

1. Target shard has BE `complete`
2. Brand-guidelines and design-system prerequisites are resolved

## Step-by-Step

### Step 0 — Pipeline and prerequisite guards

1. Read pipeline tracker and select FE target shard.
2. Enforce placeholder guard for required frontend stack placeholders.
3. Verify brand-guidelines values are fully resolved.
4. Run design-system prerequisite check and fail fast if incomplete.

### Step 1 — Classification and source mapping

1. Classify target as Feature spec or Cross-cutting spec.
2. Map required upstream sources:
   - BE spec(s) when feature-driven
   - IA source shard
   - cross-shard references
   - deep dives with FE implications
3. Present classification + mapping and require explicit user approval.

### Step 2 — Skill loading bundle

1. Load stack-aware FE framework/design/accessibility/state-management skills.
2. Load technical-writer, testing-strategist, error-handling skills.
3. Use resolve-ambiguity skill for unresolved requirements.

### Step 3 — Source ingestion and inventories

Read and extract from:
1. FE and master indexes
2. BE source specs (for API/data/error contracts)
3. IA source shard (flows/access/responsive/a11y/edge cases)
4. cross-shard references and deep dives
5. cross-cutting FE specs (`00-*`)

Build:
- Referenced Material Inventory
- Accessibility extraction inventory (with gate checks)
- Conditional rendering matrix (role × feature variants)

### Step 4 — Approval and FE seed stub creation

1. Present classification, source mapping, brand/design-system compliance summary.
2. Require explicit approval before writing phase.
3. Create FE spec seed stub using FE template after approval.

## Completion Checklist

- [ ] pipeline gate passed and target selected
- [ ] placeholders/brand/design-system prerequisites validated
- [ ] classification and source mapping approved
- [ ] skill bundle loaded
- [ ] referenced-material inventory complete
- [ ] accessibility extraction inventory complete
- [ ] conditional rendering matrix complete
- [ ] FE seed stub created

## Next Steps

- Run `write-fe-spec-write`
