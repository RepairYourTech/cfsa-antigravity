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

Review and apply fixes for explicit contradictions one at a time, flag implicit assumptions for `/resolve-ambiguity`, run a consistency check on changed documents, and write the propagation record.

> **Prerequisite**: `docs/audits/propagation-scan-[date].md` must exist. Run `/propagate-decision-scan` first if no scan report is found.

---

## 1. Explicit contradictions (one at a time)

For each explicit contradiction from the scan report, display:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Contradiction 1 of X
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Document: docs/plans/ia/03-payments.md
Section:  Data Model
Current:  PostgreSQL array types used for tag storage
Locked:   MySQL (no native array type)
Fix to:   Replace with JSON column type per MySQL conventions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Y] Apply fix and move to next
[n] Skip this item
[skip] Skip entire document
[stop-and-save] Save progress and stop for later resumption
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- **Y** — Apply the fix to the source document and move to the next contradiction
- **n** — Skip this item (leave it unchanged, record as skipped)
- **skip** — Skip all remaining contradictions in this document
- **stop-and-save** — Save progress to the scan file (mark which items are done/skipped) and stop. The user can re-run `/propagate-decision-apply` later to resume from where they left off.

---

## 2. Implicit assumptions (one at a time)

For each implicit assumption from the scan report, display:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assumption 1 of X
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Document: docs/plans/be/auth-spec.md
Section:  Middleware
Current:  "the auth provider"
Issue:    Does not specify Supabase Auth — could be misinterpreted
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Y] Flag for /resolve-ambiguity
[n] Ignore (not ambiguous enough to matter)
[skip] Skip entire document
[stop-and-save] Save progress and stop for later resumption
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- **Y** — Add the item to `docs/audits/propagation-ambiguity-[date].md` for later `/resolve-ambiguity` use
- **n** — Ignore this item (record as ignored)
- **skip** — Skip all remaining assumptions in this document
- **stop-and-save** — Same behavior as Step 1

---

## 3. Consistency check on changed documents

For every document that received at least one fix in Step 1:

1. **Re-read the full document** — verify the fix was applied correctly
2. **Check for remaining references to old values** — the fix may have changed one section but the same old value may appear elsewhere in the document
3. **Check for internal contradictions introduced by fixes** — the fix may conflict with other content in the same document
4. **Check cross-references between changed documents** — if two documents were both fixed, verify they are now consistent with each other

Report any issues found. **Do not auto-fix** — present them to the user for review. If new contradictions were introduced, add them to the scan report for a subsequent apply pass.

---

## 4. Write propagation record

Write `docs/audits/propagation-[type]-[date].md` recording:

- **Decision type** that was propagated
- **Source document** containing the locked decision
- **Documents scanned** (count and list)
- **Explicit contradictions found** (count)
- **Fixes applied** (count and list)
- **Fixes skipped** (count and list with reasons)
- **Implicit assumptions flagged** (count)
- **Implicit assumptions ignored** (count)
- **Consistency check results** (pass/fail with details)
- **Timestamp** of the propagation run

---

## 5. Propose next steps

Display the completion summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Propagation Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fixed:   X contradictions across Y documents
Flagged: X implicit assumptions for /resolve-ambiguity
Skipped: X items
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Recommended next steps:
1. Run `/resolve-ambiguity` to address the X flagged assumptions
   (see docs/audits/propagation-ambiguity-[date].md)
2. Run `/remediate-pipeline` to audit all layers with the corrected specs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If no assumptions were flagged, omit recommendation 1.
