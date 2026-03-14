# Vision Document Template

Use this template when compiling `docs/plans/vision.md` as the human-readable executive summary.

> **Important**: `vision.md` is a summary document for human consumption. The pipeline reads
> `docs/plans/ideation/ideation-index.md` directly — not this file. All the depth, domain
> files, cross-cut ledger, and structured data live in the `ideation/` folder.

```markdown
# [Project Name] — Vision

> One-sentence pitch: [from Step 4]

> **This is a human-readable project summary.** For pipeline-grade detail, see
> [ideation-index.md](ideation/ideation-index.md) and the domain files it references.

## Problem Statement
[Condensed from `meta/problem-statement.md`]

## Target Users
[Condensed persona summaries from `meta/personas.md` — name + role + pain point + success criteria.
Not the full 6-field exploration — that detail stays in the personas file.]

## Solution Overview
[2-3 paragraphs describing what the product does and why it matters.]

## Domain Map
[One paragraph per domain, condensed from the domain files in `ideation/domains/`.
Each domain links to its full file.]

## Feature Inventory (MoSCoW)
### Must Have (Phase 1)
[Feature names + one-line description. Links to domain files for drill-down detail.]
### Should Have (Phase 2)
[Feature names + one-line description.]
### Could Have (Phase 3+)
### Won't Have (explicitly excluded)

## Key Cross-Cutting Interactions
[Top confirmed interactions from `cross-cuts/cross-cut-ledger.md`.
Full synthesis detail stays in the ledger.]

## Constraints Summary
[Condensed from `meta/constraints.md` — budget, timeline, team, compliance, performance, surfaces.]

## Success Metrics
[Key metrics with concrete targets. Full details in relevant domain files.]

## Competitive Landscape
[Condensed from `meta/competitive-landscape.md` — competitors, differentiation, moat.]

## Key Decisions
[Numbered list of major product decisions made during ideation.]

## Open Questions
[Anything unresolved that needs answers before architecture — with owners and target stages.]
```
