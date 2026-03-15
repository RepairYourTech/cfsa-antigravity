---
description: Audit existing pipeline layers with adversarial probing, remediate gaps layer by layer, and advance to the next unstarted layer
pipeline:
  position: utility
  stage: quality-gate
  predecessors: [] # callable from any stage
  successors: [] # returns to caller
  skills: [code-review-pro, pipeline-rubrics, prd-templates, resolve-ambiguity, verification-before-completion]
  calls-bootstrap: false
shards: [remediate-pipeline-assess, remediate-pipeline-execute]
---

# Remediate Pipeline

Walk existing pipeline output layer by layer — audit with adversarial probing, remediate gaps, enforce the fresh-run rule, and advance only when each layer is genuinely clean.

**Usage**: `/remediate-pipeline` — you'll be shown the current pipeline state and asked which layer to start from.

**Optional**: `/remediate-pipeline @layer` — start at a specific layer (e.g., `/remediate-pipeline ia`). All upstream layers must be confirmed clean first.

**When to use this**: When you have existing specs produced by a previous pipeline run (possibly with broken tooling, shallow rubrics, or self-grading bias) and need to bring them up to the current quality standard before continuing.

**When NOT to use this**: If you're starting fresh — use `/ideate` instead. If you know exactly which layer is dirty — use `/audit-ambiguity [layer]` directly.

---

## Shard Overview

| # | Shard | What It Does |
|---|-------|--------------|
| 1 | [`remediate-pipeline-assess`](.agent/workflows/remediate-pipeline-assess.md) | Scans pipeline state, identifies layers with content, checks existing audit reports, builds remediation plan |
| 2 | [`remediate-pipeline-execute`](.agent/workflows/remediate-pipeline-execute.md) | Layer-by-layer audit → remediate → fresh-run instruction loop |

---

## Orchestration

### Step A — Run `.agent/workflows/remediate-pipeline-assess.md`

Scans all pipeline layers for existing content, checks `docs/audits/` for prior audit reports, classifies each layer (confirmed-clean / unverified-clean / needs-audit / no-content), determines the starting layer, presents the remediation plan to the user for approval, and writes `docs/audits/remediation-state.md`.

### Step B — Run `.agent/workflows/remediate-pipeline-execute.md`

Executes the remediation loop for the current layer: runs the full adversarial audit inline, classifies and remediates all gaps, persists re-verification metadata, and instructs the user to run `/audit-ambiguity [layer]` as a fresh invocation before advancing. On re-invocation, detects the confirmed-clean state and advances to the next layer automatically.

---

## Key Principles

- **Audit before fix** — Never fix what you haven't measured. The audit score is the baseline.
- **Layer order is mandatory** — Vision → Architecture → IA → BE → FE. Upstream gaps corrupt downstream specs. Never audit a downstream layer before its upstream is confirmed clean.
- **Fresh-run rule is absolute** — The session that fixes gaps cannot confirm them clean. After remediation, the user must run `/audit-ambiguity [layer]` as a new invocation. This workflow stops after remediation and resumes on re-invocation.
- **Judgment calls block advancement** — A layer cannot advance until all judgment-call gaps are resolved by the user. Mechanical fixes can be applied automatically with user approval.
- **Stop at the first dirty layer** — Do not audit FE if BE has unresolved gaps. Fix upstream first.
- **Don't delete, fix forward** — The goal is to bring existing work up to standard, not to discard it. Only recommend a full layer restart if >70% of its documents score ❌ on the majority of rubric dimensions.
