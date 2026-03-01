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
| Infrastructure Report | `references/infrastructure-report-template.md` | `/verify-infrastructure` Steps 0.6, 8 |
| Decomposition (shards + indexes) | `references/decomposition-templates.md` | `/decompose-architecture-structure` Steps 5-9 |
| Operational (slices, remediation, skills, sync) | `references/operational-templates.md` | `/plan-phase`, `/remediate-pipeline-assess`, `/bootstrap-agents-provision`, `/sync-kit` |

## Depth Standards

> **Template depth rule**: Section headings in templates are MINIMUM headings, not maximum content. Each section must contain the full detail gathered during prior steps. If a section is under 200 words, it's almost certainly too shallow. Apply the two-implementer test: could a developer interpret this two different ways? If yes, add more detail.
