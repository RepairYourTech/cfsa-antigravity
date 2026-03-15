---
description: Measure coverage and ambiguity across all pipeline layers (Vision, Architecture, IA, BE, FE) with scored reports
pipeline:
  position: utility
  stage: quality-gate
  predecessors: [] # callable from any stage
  successors: [] # returns to caller
  skills: [code-review-pro, pipeline-rubrics, resolve-ambiguity, technical-writer, verification-before-completion]
  calls-bootstrap: false
shards: [audit-ambiguity-rubrics, audit-ambiguity-execute]
---

# Ambiguity Audit

Audit pipeline output completeness and identify gaps that would force guesswork during implementation.

**Usage**: `/audit-ambiguity` — you'll be asked which layer(s) to audit.

---

## 0. Load audit skills

Read these skills for review guidance:
1. `.agent/skills/code-review-pro/SKILL.md` — Review methodology
2. `.agent/skills/technical-writer/SKILL.md` — Spec clarity standards

---

## Shard Overview

| # | Shard | What It Does |
|---|-------|-------------|
| 1 | [`audit-ambiguity-rubrics`](.agent/workflows/audit-ambiguity-rubrics.md) | Determines scope, loads documents, provides all 5 rubrics (Vision, Architecture, IA, BE, FE) with scoring criteria |
| 2 | [`audit-ambiguity-execute`](.agent/workflows/audit-ambiguity-execute.md) | Executes the audit one document at a time, compiles report, remediates gaps, proposes next steps |

---

## Orchestration

### Step A — Run `.agent/workflows/audit-ambiguity-rubrics.md`

Asks the user which layer(s) to audit, loads the source documents, and provides the scoring rubrics for each applicable layer.

### Step B — Run `.agent/workflows/audit-ambiguity-execute.md`

Audits each document one at a time (read → score with evidence → classify gaps → verify → finalize), compiles the report to `docs/audits/`, remediates gaps using `resolve-ambiguity`, and proposes next steps.

---

## Key Principles

- **One document at a time** — Read, score, verify, finalize. Never batch-read and score from memory.
- **Every score needs evidence** — A ✅ without a citation is lazy. A ❌ without listing what you searched is a potential hallucination.
- **Verify before finalizing** — Re-read with findings in hand. This is the hallucination catch.
- **Read the full document** — Don't skim. Ambiguity hides in the details.
- **Be specific** — "Error handling incomplete" is not a finding. "POST /v1/reviews has no error code for duplicate review" IS a finding.
- **Open questions ≠ ambiguity** — Explicitly flagged unknowns are known unknowns, not gaps.
- **Score honestly** — The goal is to find real gaps, not to produce a good number.
- **Upstream first** — Fix Vision gaps before Architecture, Architecture before IA, IA before BE, BE before FE.
- **Resolve, don't just report** — Use `resolve-ambiguity` to classify and fix gaps, not just list them.
- **Simulate before scoring** — Before scoring any document, attempt to write a stub implementation from it. Every decision you have to make that isn't explicitly specified is a gap. Add it to the punch list unconditionally.
- **Two-implementer test** — A ✅ means two different developers reading only this spec would make the same implementation decision. If you cannot confidently say that, score ⚠️ instead.
- **Devil's advocate pass** — After scoring, argue against each ✅. Ask: "What would a junior developer get wrong?" and "What would a malicious implementer exploit?" Any ✅ that can't survive this drops to ⚠️.
- **Cross-layer gaps are ❌** — A BE spec that doesn't match its IA shard user flows fails regardless of its individual score. Cross-layer consistency is checked after per-document scoring.
