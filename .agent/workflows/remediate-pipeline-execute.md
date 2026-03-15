---
description: Execute adversarial audit, remediate gaps, enforce fresh-session confirmation, and advance layers
parent: remediate-pipeline
shard: execute
standalone: true
position: 2
pipeline:
  position: utility
  stage: quality-gate
  predecessors: [remediate-pipeline-assess]
  successors: [] # returns to caller after stop
  skills: [code-review-pro, pipeline-rubrics, resolve-ambiguity, verification-before-completion]
  calls-bootstrap: false
---

# Remediate Pipeline — Execute

Layer-by-layer audit → remediate → fresh-run instruction loop.

> **Prerequisite**: Read `docs/audits/remediation-state.md` to determine the current layer and status. If this file does not exist, run `/remediate-pipeline-assess` first.

---

## 1. Read remediation state

Read `docs/audits/remediation-state.md` to determine:
- The current layer to process
- The status of all layers
- Any layers already confirmed clean this session

---

## 2. Re-invocation detection

Read `docs/audits/audit-scope.md` and look for a `## Gaps Fixed` section.

- **If absent** → This is a first-pass invocation. Proceed to Step 3.
- **If present** → Read the `layer` and `fixed_by_session` fields.
  - If `layer` matches the current layer AND `fixed_by_session` is different from the current session identifier → The user has run a fresh audit and it passed. Mark the current layer as confirmed clean in `remediation-state.md`. Advance to the next layer. If no more layers need auditing, go to Step 7. Otherwise, proceed to Step 3 for the next layer.
  - If `layer` matches but `fixed_by_session` is the same session → **STOP**: "The session that fixed gaps cannot confirm them clean. Please run `/audit-ambiguity [layer]` as a fresh invocation, then re-run `/remediate-pipeline`."

---

## 3. Run adversarial audit inline

Read .agent/skills/code-review-pro/SKILL.md and apply its adversarial review discipline to each layer.

**CRITICAL**: Run the audit inline — do not invoke `/audit-ambiguity` as a sub-workflow.

**CRITICAL ANTI-HALLUCINATION RULE**: Process one document at a time through 3a → 3b → 3c before moving to the next. Never batch-read and score from memory.

### Layer-to-documents mapping

Read `.agent/skills/pipeline-rubrics/references/scoring.md` for the document-to-layer mapping table. Load all documents for the current layer.

### 3a. Implementer Simulation

Attempt to write a stub implementation using only what's in the spec. List every decision not explicitly specified. Write each to `docs/audits/[layer]-ambiguity-report.md` as ❌. These gaps are unconditional.

### 3b. Rubric Scoring with Two-Implementer Test

Load the matching rubric from `.agent/skills/pipeline-rubrics/references/` (see SKILL.md for the file mapping). Score each dimension:

- **✅** → "Two implementers would make the same decision because: [specific reason citing exact text]." If can't confidently say this, score ⚠️.
- **⚠️** → Quote what exists + what's missing + what decision implementer must guess.
- **❌** → List section headings checked, confirm absent.

Write scores immediately to the report file.

### 3c. Devil's Advocate Pass

For each ✅: "What would a junior developer get wrong?" and "What would a malicious implementer exploit?" Downgrade to ⚠️ if either reveals a gap.

---

## 3.5. Cross-Layer Consistency

Runs after all per-document scoring, when the layer is BE, FE, or scope is `all`. Read `.agent/skills/pipeline-rubrics/references/scoring.md` for the cross-layer consistency checks. Write all findings to a `## Cross-Layer Consistency` section in the report.

---

## 4. Zero-gap first-pass path

Read .agent/skills/verification-before-completion/SKILL.md and follow its methodology.

If 0% ambiguity on first pass — layer is "unverified clean." The fresh-run rule still applies. Add summary to report, persist `## Gaps Fixed` in `docs/audits/audit-scope.md`, proceed to Step 6.

---

## 5. Remediate gaps

Read `.agent/skills/resolve-ambiguity/SKILL.md` for the resolution methodology.

**Classify all gaps for the entire layer first, then present together:**

- **Judgment calls** (Intent/Choice — product direction, UX preference, scope): Present ALL to user grouped by document. Wait for decisions.
- **Mechanical fixes** (Technical/factual — resolvable via tiered lookup): Propose with citations. Apply after approval.

### Resolution order

1. Present all judgment calls. Wait for decisions.
2. Apply approved mechanical fixes.
3. Apply user-resolved judgment calls. Re-check if mechanical fixes changed.

Add summary to report. If >70% of docs scored ❌ on majority of dimensions, recommend rewriting layer from scratch.

### Persist fix metadata

Append or replace `## Gaps Fixed` in `docs/audits/audit-scope.md` with: layer, fixed_at (ISO 8601), fixed_by_session (UUID), gaps_resolved (count), report_file path.

---

## 6. Instruct fresh-run confirmation

Use `notify_user`:

> ## [Layer] Remediated
> [N] gaps fixed across [M] documents.
> **Next**: Run `/audit-ambiguity [layer]` as a fresh invocation.
> When it scores 0%, run `/remediate-pipeline` again to advance.
> Do NOT re-run this workflow in this same session.

**STOP** — Do not execute further steps in this invocation.

---

## 7. Advance or complete

Runs when re-invoked after `/audit-ambiguity [layer]` confirmed the layer clean (detected in Step 2).

### If more layers remain
Update `remediation-state.md`: move current layer to confirmed-clean, set next layer as current. Use `notify_user` to instruct re-running `/remediate-pipeline`.

### If all layers confirmed clean
Present completion summary table (all layers ✅) and propose next pipeline step.
