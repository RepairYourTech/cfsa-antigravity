---
name: pipeline-rubrics
description: "Scoring rubrics for all 5 pipeline layers (Vision, Architecture, IA, BE, FE). Use when auditing specs, running self-checks, or remediating ambiguity gaps."
category: quality
risk: none
source: self
date_added: "2026-02-28"
---

# Pipeline Rubrics

Standardized scoring rubrics for every pipeline layer. Used by audit workflows, self-checks in compilation workflows, and remediation workflows.

## When to Use This Skill

- During `/audit-ambiguity` — load the rubric for the layer being audited
- During document compilation self-checks — load the relevant rubric to validate before presenting
- During `/remediate-pipeline` — load rubrics for adversarial scoring
- Any time a two-implementer test is needed on a pipeline document

## How to Use

1. Identify the pipeline layer being scored
2. Load the matching reference file from `references/`
3. Score each dimension using the ✅ / ⚠️ / ❌ criteria
4. Apply the scoring formula from `references/scoring.md`

## Reference Files

| Layer | File | Dimensions |
|-------|------|------------|
| Vision | `references/vision-rubric.md` | 7 |
| Architecture | `references/architecture-rubric.md` | 15 |
| IA | `references/ia-rubric.md` | 8 |
| BE | `references/be-rubric.md` | 10 |
| FE | `references/fe-rubric.md` | 10 |
| Scoring | `references/scoring.md` | Formula + cross-layer checks |

## Two-Implementer Test

For every dimension: *"Would two different developers, reading only this spec with no other context, make the same decision?"*

- If YES with a specific citation → ✅
- If MAYBE or requires inference → ⚠️
- If NO or content is absent → ❌

## Related Skills

- `resolve-ambiguity` — resolve gaps found by rubric scoring
- `technical-writer` — rewrite sections that score ⚠️ or ❌
- `code-review-pro` — adversarial review methodology
