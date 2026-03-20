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

## 2. Enumerate source documents

Read `.agent/skills/pipeline-rubrics/references/scoring.md` for the document-to-layer mapping table.

**MANDATORY filesystem discovery**: Use file system tools (`find_by_name`, `list_dir`) to recursively discover ALL files matching the layer's patterns from `scoring.md`. Do NOT build the document list from memory or from reading an index file — the filesystem is the source of truth.

## 2a. Document Enumeration Gate

> **BLOCKING GATE — do not proceed until this passes.**

1. Count the total documents discovered by filesystem tools.
2. State: **"Enumerated N documents for [layer] audit."**
3. **Minimum counts** — if below these thresholds, re-scan:
   - Ideation: count ALL `.md` files recursively under `docs/plans/ideation/` (expect 20+ for any real project)
   - Architecture: ≥2 (`architecture-design.md` + `ENGINEERING-STANDARDS.md`)
   - IA/BE/FE: ≥2 (index + at least one shard/spec)
4. If re-scan still yields fewer than threshold, state why and proceed with the actual count.

## 2b. Persist audit scope

Write `docs/audits/audit-scope.md` with the determined scope and the **complete** document list from Step 2a:

```markdown
# Audit Scope

> Generated: [date]

## Layers to Audit
[list of selected layers]

## Documents to Audit
[for each layer, list EVERY file path discovered in Step 2a — no omissions]

## Document Count
[layer]: [N] documents

## Rubric Files
[for each layer being audited, list the exact path of the rubric file]
- vision: .agent/skills/pipeline-rubrics/references/vision-rubric.md
- architecture: .agent/skills/pipeline-rubrics/references/architecture-rubric.md
- ia: .agent/skills/pipeline-rubrics/references/ia-rubric.md
- be: .agent/skills/pipeline-rubrics/references/be-rubric.md
- fe: .agent/skills/pipeline-rubrics/references/fe-rubric.md

## Status
in-progress
```

(Only include the rubric file entries for the layers actually being audited.)

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
