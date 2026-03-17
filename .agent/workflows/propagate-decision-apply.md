---
description: Present each contradiction for approval, flag implicit assumptions for /resolve-ambiguity, run consistency check, and write propagation record
parent: propagate-decision
shard: apply
standalone: true
position: 2
pipeline:
  position: utility
  stage: quality-gate
  predecessors: [propagate-decision-scan]
  successors: []
  skills: [resolve-ambiguity, technical-writer]
  calls-bootstrap: false
---

# Propagate Decision — Apply

Review and apply fixes for explicit contradictions one at a time, flag implicit assumptions, run consistency check, and write propagation record.

> **Prerequisite**: `docs/audits/propagation-scan-[date].md` must exist. If not → run `/propagate-decision-scan` first.

---

## 1. Explicit contradictions (one at a time)

Read `.agent/skills/resolve-ambiguity/SKILL.md` for methodology.

Read `.agent/skills/prd-templates/references/decision-propagation.md` → **Contradiction Display Format**.

For each explicit contradiction from the scan report: display using the format and wait for user response (Y/n/skip/stop-and-save).

After applying a fix to a spec document (`docs/plans/ia/`, `docs/plans/be/`, or `docs/plans/fe/`): append `## Changelog` row. If no `## Changelog` exists, add one from the template in `.agent/skills/prd-templates/references/be-spec-template.md`.

---

## 2. Implicit assumptions (one at a time)

Read `.agent/skills/prd-templates/references/decision-propagation.md` → **Assumption Display Format**.

For each implicit assumption: display using the format and wait for user response. Y → add to `docs/audits/propagation-ambiguity-[date].md`.

---

## 3. Consistency check on changed documents

For every document that received fixes:
1. Re-read full document — verify fix applied correctly
2. Check for remaining old-value references
3. Check for internal contradictions introduced by fixes
4. Check cross-references between changed documents

Report issues. **Do not auto-fix** — present to user.

---

## 4. Write propagation record

Read `.agent/skills/technical-writer/SKILL.md` for methodology.

Write `docs/audits/propagation-[type]-[date].md` recording: decision type, source document, documents scanned, contradictions found/fixed/skipped, assumptions flagged/ignored, consistency results, timestamp.

---

## 5. Propose next steps

Read `.agent/skills/prd-templates/references/decision-propagation.md` → **Completion Summary Format** and present.

If no assumptions flagged → omit `/resolve-ambiguity` recommendation.
