---
description: Pre-scan all 6 decision types, present selection menu, run full scan on selected types, and build impact report
parent: propagate-decision
shard: scan
standalone: true
position: 1
pipeline:
  position: utility
  stage: quality-gate
  predecessors: [] # callable standalone
  successors: [propagate-decision-apply]
  skills: [technical-writer]
  calls-bootstrap: false
---

# Propagate Decision — Scan

Pre-scan all 6 decision types for downstream contradictions, present a selection menu, run a full scan on the selected types, and write the impact report.

> **Prerequisite**: At least one instruction file must be filled (not `{{PLACEHOLDER}}`). If all are still placeholders → **STOP**: run `/bootstrap-agents` first.

---

## 1. Pre-scan all decision types

Read `.agent/skills/prd-templates/references/decision-propagation.md` → **Decision Type Sources** table.

For each decision type:
1. Read the source document to extract the current locked value
2. Quick-scan downstream documents for references to that decision topic
3. Note count of downstream references found

---

## 2. Present selection menu

Read `.agent/skills/prd-templates/references/decision-propagation.md` → **Selection Menu Format**. Present with actual counts from Step 1.

If `[A]` selected → run full scan on all 6 types, filter to those with findings.

If called with specific argument (e.g., `/propagate-decision structure`) → skip menu, proceed directly.

**STOP** — do not proceed until the user selects.

**Zero-findings shortcut**: If the pre-scan in Step 1 found zero downstream references across ALL decision types → skip the menu entirely: "No downstream references found for any decision type. All pipeline documents are consistent with locked decisions. No propagation needed." Exit workflow.

---

## 3. Full scan on selected types

For each selected decision type, scan every downstream document in the scope (per Decision Type Sources table):

1. Read the locked value from source
2. Search each downstream document for references
3. Classify each reference as: **explicit contradiction** / **implicit assumption** / **consistent**
4. Record: document path, line number, current text, locked value

For **error-architecture** type: read `.agent/skills/prd-templates/references/decision-propagation.md` → **Error-Architecture Scan Procedure** and follow it.

---

## 4. Build and write impact report

Read `.agent/skills/technical-writer/SKILL.md` for writing standards.

Read `.agent/skills/prd-templates/references/decision-propagation.md` → **Impact Report Format**.

Write `docs/audits/propagation-scan-[date].md` using the format.

---

## 5. Present summary and confirm

Present summary counts. Reference the full report path.

**STOP** — do not proceed to apply until user confirms.
