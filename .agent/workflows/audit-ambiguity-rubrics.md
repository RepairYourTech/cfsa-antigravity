---
description: Scope determination, document loading, and scoring rubrics for all 5 pipeline layers for the audit-ambiguity workflow
parent: audit-ambiguity
shard: rubrics
standalone: true
position: 1
pipeline:
  position: utility
  stage: quality-gate
  predecessors: []
  successors: [audit-ambiguity-execute]
  skills: [pipeline-rubrics]
  calls-bootstrap: false
---

# Ambiguity Audit — Rubrics

Determine audit scope, load source documents, and apply the scoring rubrics for each pipeline layer.

**Prerequisite**: At least one pipeline layer must have completed documents to audit. If no documents exist, tell the user which pipeline steps to run first.

---

## 1. Determine audit scope

Ask the user:
- `vision` — Audit vision document only
- `architecture` — Audit architecture design only
- `ia` — Audit IA shards only
- `be` — Audit BE specs only
- `fe` — Audit FE specs only
- `all` — Full cascade (Vision → Architecture → IA → BE → FE)

## 2. Load source documents

Read `.agent/skills/pipeline-rubrics/references/scoring.md` for the document-to-layer mapping table. Load all documents for each layer being audited.

## 2.5. Persist audit scope

Write `docs/audits/audit-scope.md` with the determined scope and document list:

```markdown
# Audit Scope

> Generated: [date]

## Layers to Audit
[list of selected layers]

## Documents to Audit
[for each layer, list the exact file paths that will be audited]

## Status
in-progress
```

This file is read by `/audit-ambiguity-execute` as its prerequisite.

## 3. Load and apply rubrics

Read `.agent/skills/pipeline-rubrics/SKILL.md` for the scoring methodology. For each layer being audited, load the matching rubric from the skill's `references/` directory:

| Layer | Rubric File |
|-------|-------------|
| Vision | `.agent/skills/pipeline-rubrics/references/vision-rubric.md` |
| Architecture | `.agent/skills/pipeline-rubrics/references/architecture-rubric.md` |
| IA | `.agent/skills/pipeline-rubrics/references/ia-rubric.md` |
| BE | `.agent/skills/pipeline-rubrics/references/be-rubric.md` |
| FE | `.agent/skills/pipeline-rubrics/references/fe-rubric.md` |

Apply the scoring formula from `.agent/skills/pipeline-rubrics/references/scoring.md`.

Proceed to `/audit-ambiguity-execute` with scope and rubrics loaded.
