---
description: Scan downstream pipeline documents for inconsistencies with locked decisions and correct them one at a time
pipeline:
  position: utility
  stage: quality-gate
  predecessors: [] # callable from any stage
  successors: [] # returns to caller
  skills: [resolve-ambiguity, technical-writer]
  calls-bootstrap: false
shards: [propagate-decision-scan, propagate-decision-apply]
---

# Propagate Decision

Scan downstream pipeline documents for contradictions with locked decisions, then apply fixes one at a time with user approval.

**Usage**: `/propagate-decision` — you'll be shown a pre-scan of all 5 decision types and asked which to propagate.

**Optional**: `/propagate-decision structure` — skip the menu and propagate a specific decision type directly.

**When to use this**: After filling an instruction file placeholder or changing a locked architectural decision. Run **before** `/remediate-pipeline` — propagation fixes inconsistencies that would otherwise appear as ambiguity gaps during auditing.

**When NOT to use this**: If you're adding genuinely new features or requirements — use `/evolve-feature` instead. This command corrects always-intended things; that command adds new things.

**Key distinction from `/evolve-feature`**: `/propagate-decision` corrects downstream documents that should have always reflected a locked decision. `/evolve-feature` adds genuinely new scope that didn't exist before.

---

## Shard Overview

| # | Shard | What It Does |
|---|-------|--------------|
| 1 | [`propagate-decision-scan`](.agent/workflows/propagate-decision-scan.md) | Pre-scans all 5 decision types, presents selection, runs full scan, writes impact report |
| 2 | [`propagate-decision-apply`](.agent/workflows/propagate-decision-apply.md) | Presents each contradiction for approval, flags implicit assumptions, writes propagation record |

---

## Orchestration

### Step A — Run `.agent/workflows/propagate-decision-scan.md`

Pre-scans all 5 decision types, presents a selection menu to the user, runs a full scan on the selected types, builds an impact report with explicit contradictions and implicit assumptions, writes the report to `docs/audits/propagation-scan-[date].md`, and stops for user confirmation before proceeding.

### Step B — Run `.agent/workflows/propagate-decision-apply.md`

Presents each explicit contradiction one at a time with Y/n/skip/stop-and-save options, flags implicit assumptions for `/resolve-ambiguity`, runs a consistency check on changed documents, writes a propagation record, and proposes next steps.

---

## Key Principles

- **Locked decisions are non-negotiable** — Downstream documents must reflect locked decisions. This workflow enforces that.
- **One at a time** — Every fix is presented individually for user approval. No batch auto-fixes.
- **Explicit vs implicit** — Explicit contradictions are direct conflicts that get fixed. Implicit assumptions are vague references that get flagged for `/resolve-ambiguity`.
- **Consistency check after fixes** — Fixing one contradiction can introduce another. The consistency check catches cascading issues.
- **Stop-and-save** — The user can pause at any time and resume later. Progress is persisted.
