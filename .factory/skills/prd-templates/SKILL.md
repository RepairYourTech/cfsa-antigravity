---
name: prd-templates
description: "Document templates for all pipeline output documents — specs, indexes, reports, and strategy docs. Use when any workflow needs to produce a structured document."
category: templates
risk: none
source: self
date_added: "2026-02-28"
---

# PRD Templates

Canonical markdown templates for all pipeline output documents. Workflows reference these templates instead of inlining them — the template defines structure, the workflow fills content.

## When to Use This Skill

- During any workflow step that produces a structured document
- When writing specs (BE, FE), indexes, reports, or strategy documents
- During classification steps that seed spec file stubs

## Conventions

**Dated File Convention**: Compiled artifacts (e.g., `architecture-design.md`, `data-placement-strategy.md`, `ENGINEERING-STANDARDS.md`, audit reports) are always prefixed with `YYYY-MM-DD-`. Any workflow reading these files must use a glob pattern (e.g., `docs/plans/*-architecture-design.md`). See `docs/kit-architecture.md` Section 3 — Dated File Convention for the full rule and table. Note: `ideation-index.md` and `vision.md` are NOT dated — they are living documents updated throughout ideation.

## How to Use

1. Read the appropriate template from `references/`
2. Fill each section with content gathered during prior workflow steps
3. Apply the depth rule: every section should have ≥200 words for architecture docs; no section should use TBD or placeholder values

## Reference Files

| Template | File | Used By |
|----------|------|---------|
| Architecture Design | `references/architecture-design-template.md` | `/create-prd-compile` Step 10 |
| Engineering Standards | `references/engineering-standards-template.md` | `/create-prd-compile` Step 11 |
| Vision Document | `references/vision-template.md` | `/ideate-validate` Step 11 |
| BE Spec + Seed Stub | `references/be-spec-template.md` | `/write-be-spec-write` Step 7, `/write-be-spec-classify` |
| FE Spec + Seed Stub | `references/fe-spec-template.md` | `/write-fe-spec-write` Step 6, `/write-fe-spec-classify` |
| Data Placement Strategy | `references/data-placement-template.md` | `/create-prd-architecture` Step 5 |
| Design System Decision Options | `references/design-system-decisions.md` | `/create-prd-design-system` Step 1 (option menus + output template); downstream: `write-fe-spec-classify` Step 0.75 prerequisite check |
| Infrastructure Report | `references/infrastructure-report-template.md` | `/verify-infrastructure` Steps 0.6, 8 |
| Decomposition (shards + indexes) | `references/decomposition-templates.md` | `/decompose-architecture-structure` Steps 5-9 |
| Operational (slices, remediation, skills, sync) | `references/operational-templates.md` | `/plan-phase`, `/remediate-pipeline-assess`, `/bootstrap-agents-provision`, `/sync-kit` |

## Depth Standards

> **Template depth rule**: Section headings in templates are MINIMUM headings, not maximum content. Each section must contain the full detail gathered during prior steps. If a section is under 200 words, it's almost certainly too shallow. Apply the two-implementer test: could a developer interpret this two different ways? If yes, add more detail.

## Shard Seeding Procedure

Run this procedure when filling the `## Features` section of each shard skeleton during `/decompose-architecture-structure`.

### Source

Read `docs/plans/ideation/ideation-index.md` — specifically the `## Structural Classification` and `## Structure Map` sections.

- **All project shapes**: Use the Structure Map to find the correct domain **folder** path. Each domain is a folder containing `*-index.md` (children table + Role Matrix), `*-cx.md` (cross-cuts), and child feature `.md` files.
- **Multi-product projects**: Domain folders may be under `docs/plans/ideation/surfaces/{surface-name}/` (surface-exclusive) or `docs/plans/ideation/domains/` (shared).

Match each shard to its ideation domain by name. Walk the domain's fractal tree: read the domain index for the children list, then read each child feature file to extract sub-features. If the domain has sub-domain folders, recurse into them.

### Actor + Goal Format Rule

Extract every Level-1 sub-feature as a concrete capability a user would recognise, written in actor + goal format with primary data noted.

**Example:** `"Creator can upload a video → primary data: media asset"`

Do NOT use architecture-level headlines or implementation details.

### Grouping Rule

List sub-features as bullet points in the `## Features` section. Group by functional area if the ideation content suggests natural groupings.

### `[THIN — review with user]` Fallback Rule

If a shard's domain has no corresponding ideation domain folder (the domain was introduced during architecture design, not ideation — check the `ideation-index.md` Structure Map for paths under `domains/` and `surfaces/`), mark the skeleton with `[THIN — review with user]` at the top of `## Features` and seed from the architecture design description instead.

At the validation step, the user must confirm whether to:
- Keep the shard separate
- Merge it into an adjacent shard
- Add missing sub-features from ideation (create a domain folder if needed)

### Directory Example

Seeded skeletons always live in the flat `docs/plans/ia/` directory — IA is shared across all surfaces. Multi-product projects add per-surface BE and FE directories only:

**Single-surface:**
```
docs/plans/ia/
├── 00-infrastructure.md
├── 01-user-accounts.md      ← ## Features seeded from ideation/domains/01-user-accounts/ (index + feature files)
├── 02-content-library.md    ← ## Features seeded from ideation/domains/02-content-library/ (index + feature files)
├── ...
```

**Multi-product** (IA stays flat — only BE/FE get per-surface directories):
```
docs/plans/ia/
├── 00-infrastructure.md
├── 01-operations.md         ← ## Features seeded from ideation/surfaces/desktop/01-operations/ (index + feature files)
├── 02-device-history.md     ← ## Features seeded from ideation/domains/02-device-history/ (index + feature files)

docs/plans/be/desktop/       ← per-surface BE specs (inside be/)
docs/plans/fe/desktop/       ← per-surface FE specs (inside fe/)
docs/plans/be/               ← shared BE specs (pre-scaffolded, serves as shared surface)
docs/plans/fe/               ← shared FE specs (pre-scaffolded, serves as shared surface)
```
