---
description: Scan pipeline state, identify layers with content, check existing audit reports, and build the remediation plan
parent: remediate-pipeline
shard: assess
standalone: true
position: 1
pipeline:
  position: utility
  stage: quality-gate
  predecessors: [] # callable standalone
  successors: [remediate-pipeline-execute]
  skills: [code-review-pro]
  calls-bootstrap: false
---

# Remediate Pipeline — Assess

Scan all five pipeline layers, check for existing audit reports, determine the starting layer, and present a remediation plan for user approval.

> **Prerequisite**: At least one pipeline layer must have completed documents. If `docs/plans/vision.md` does not exist, tell the user to run `/ideate` first.

---

## 0. Pre-check: scan instruction files for unfilled placeholders

Before assessing pipeline layers, scan all instruction files for any `{{` patterns:

1. `AGENTS.md`
2. `GEMINI.md`
3. `.agent/instructions/workflow.md`
4. `.agent/instructions/commands.md`
5. `.agent/instructions/structure.md`
6. `.agent/instructions/patterns.md`
7. `.agent/instructions/tech-stack.md`

**If any unfilled `{{PLACEHOLDER}}` patterns are found**:

> **STOP** — do not proceed with pipeline remediation. Tell the user which files and placeholders are affected and provide remediation commands:
>
> | File(s) with unfilled placeholders | Remediation |
> |------------------------------------|-------------|
> | `structure.md` (`{{PROJECT_STRUCTURE}}`, `{{ARCHITECTURE_TABLE}}`) | Run `/create-prd-compile` Step 9.5 to generate and lock the directory structure |
> | `patterns.md` (`{{FRAMEWORK_PATTERNS}}`) | Run `/bootstrap-agents-provision` after confirming the frontend framework |
> | `AGENTS.md`, `GEMINI.md`, or other files | Run `/bootstrap-agents-fill` then `/bootstrap-agents-provision` with confirmed stack values |
>
> Pipeline remediation audits spec documents, but agents use instruction files throughout implementation — broken instruction files must be fixed first.
>
> Once all instruction files are clean, re-run `/remediate-pipeline` to audit the spec layers.

**If all instruction files are clean**: Confirm "Instruction files are fully configured." and proceed to Step 1.

---

## 1. Scan pipeline layers

Check which layers have content by verifying the presence of key files:

| Layer | Key Files to Check | Has Content If… |
|-------|-------------------|-------------------|
| Vision | `docs/plans/vision.md` | File exists and is non-empty |
| Architecture | `docs/plans/*-architecture-design.md` | At least one dated file exists |
| IA | `docs/plans/ia/index.md` | File exists with ≥1 shard listed |
| BE | `docs/plans/be/index.md` | File exists with ≥1 spec listed |
| FE | `docs/plans/fe/index.md` | File exists with ≥1 spec listed |

For each layer with content, also note:
- How many documents it contains (shards/specs count)
- Whether any deep dive files exist (IA layer only)

---

## 2. Check existing audit reports

For each layer with content, check `docs/audits/[layer]-ambiguity-report.md` and `docs/audits/audit-scope.md`. Classify each layer using this decision tree:

| Condition | Classification |
|-----------|---------------|
| No audit report exists | `needs-audit` |
| Report exists, score > 0% | `needs-audit` |
| Report exists, score = 0%, no `## Gaps Fixed` in `audit-scope.md` | `unverified-clean` |
| Report exists, score = 0%, `## Gaps Fixed` exists but `fixed_by_session` is the current session | `unverified-clean` (same session cannot self-confirm) |
| Report exists, score = 0%, `## Gaps Fixed` exists from a different session | `confirmed-clean` |
| No content in layer | `no-content` |

---

## 3. Determine starting layer

**If the user invoked with `@layer` argument**:
1. Validate that all upstream layers are `confirmed-clean`. If any upstream layer is not confirmed clean, warn the user: "Layer [X] cannot be audited until upstream layers are clean. Starting from [upstream layer] instead."
2. Start from the first dirty upstream layer, or the requested layer if all upstream layers are clean.

**If no argument**: Start from the first layer (in Vision → Architecture → IA → BE → FE order) that is `needs-audit` or `unverified-clean`.

**If all layers with content are `confirmed-clean`**: "All pipeline layers are already confirmed clean. No remediation needed." Propose the appropriate next pipeline step and exit.

---

## 4. Present remediation plan

Use `notify_user` to present the following:

> ## Pipeline Remediation Plan
>
> Layer | Documents | Status | Action
> Vision | 1 doc | ✅ Confirmed clean | Skip
> Architecture | 2 docs | ⚠️ Unverified clean | Re-audit to confirm
> IA | 17 shards + 9 deep dives | 🔴 Needs audit | Audit + remediate
> BE | 17 specs | 🔴 Needs audit | Audit + remediate
> FE | — | ⬜ No content | Skip (not started)
>
> **Starting from**: IA
>
> This will audit the IA layer with adversarial probing, remediate any gaps found, then stop and ask you to confirm with a fresh audit before advancing to BE.

"Does this plan look right? Confirm to proceed, or tell me which layer to start from."

**Do NOT proceed** to Step 5 until the user explicitly confirms the remediation plan.

---

Read `.agent/skills/prd-templates/references/operational-templates.md` for the **Remediation State** template. Create or update `docs/audits/remediation-state.md` using the template, filling in layer statuses from Step 2 and the current layer from Step 3.

After writing `remediation-state.md`, proceed to run `.agent/workflows/remediate-pipeline-execute.md`.
