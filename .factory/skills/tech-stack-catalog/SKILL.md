---
name: tech-stack-catalog
description: "Per-surface tech stack decision tables and development tooling options. Use during /create-prd-stack to present constraint-filtered options to the user."
category: reference
risk: none
source: self
date_added: "2026-02-28"
---

# Tech Stack Catalog

Reference tables for tech stack decisions organized by project surface type. Used by `/create-prd-stack` to present constraint-filtered options.

## When to Use This Skill

- During `/create-prd-stack` — load the decision tables for each applicable surface
- When adding a new surface to an existing project
- When evaluating tech stack alternatives

## How to Use

1. Read the project's surface classification from `docs/plans/ideation/meta/constraints.md`
2. Load `references/surface-decision-tables.md` for the applicable surface sections
3. Filter options using constraint questions before presenting
4. Load `references/dev-tooling-decisions.md` for development tooling

## Reference Files

| File | Contents |
|------|----------|
| `references/surface-decision-tables.md` | Universal, web, desktop, mobile, CLI, multi-surface decision axes |
| `references/dev-tooling-decisions.md` | Package manager, test runner, linter, type checker + bootstrap keys |
| `references/constraint-questions.md` | Per-axis constraint questions for filtering options |

## Option Presentation Format

For each axis, filter options using constraints, then present:

| # | Option | Strengths | Risks | Fit |
|---|--------|-----------|-------|-----|
| 1 | [Option] | ... | ... | [/5] |
| H | **Hybrid** | [Combine elements] | ... | [/5] |

> **Recommendation**: Based on constraints [list], **Option [N]** scores highest because [rationale].

## Related Skills

- `design-direction` — visual direction interview (runs during stack decisions)
- `brainstorming` — one-decision-at-a-time approach
