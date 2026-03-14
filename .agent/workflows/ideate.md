---
description: Structured idea extraction from raw input to vision document — input-adaptive, domain-exhaustive, production-grade from the first conversation
pipeline:
  position: 1
  stage: vision
  predecessors: [] # entry point
  successors: [create-prd]
  skills: [idea-extraction, resolve-ambiguity]
  calls-bootstrap: false
shards: [ideate-extract, ideate-discover, ideate-validate]
---

# Ideate

## Invocation Patterns

| Invocation | Behavior |
|---|---|
| `/ideate` | Starts an interactive interview from scratch |
| `/ideate @path/to/file.md` | Reads the file, classifies it automatically, enters the appropriate mode |

### Input Types and Modes

| Input Type | Detection | Mode Triggered |
|---|---|---|
| Rich document | >5KB, detailed docs, design conversations, prior specs | Extraction — captures existing depth, fills gaps via interview |
| Thin PRD | <5KB, structured but shallow (bullet list, rough PRD) | Expansion — deepens every section via domain exhaustion |
| Chat transcript | Chat logs, unstructured conversation transcripts | Extraction + noise filter — extracts signal, discards noise, fills gaps |
| One-liner / verbal | User describes idea in chat, no files | Interview (deep) — builds vision from scratch domain by domain |
| Full exploration | Any input with 3+ domains | Full — Recursive breadth-before-depth with Deep Think protocol, cross-cut detection active throughout |

**Quality guarantee**: All input types produce the **same output quality**. The ideation output that emerges from a one-liner is structurally and substantively identical to one produced from a rich document. Only the amount of interview work differs.

Transform a raw idea into comprehensive, structured ideation output through exhaustive recursive exploration with the Deep Think protocol.

> This pipeline does not build MVPs. The ideation phase is where the entire downstream
> pipeline gets its DNA. If the ideation is shallow, every spec, every architecture decision,
> every line of code downstream will be shallow. Treat this phase with the seriousness it
> deserves.

**Output**: `docs/plans/ideation/` folder (pipeline key file: `ideation-index.md`) + `docs/plans/vision.md` (human-readable summary)

---

## Shard Overview

| # | Shard | What It Does |
|---|-------|-------------|
| 1 | [`ideate-extract`](.agent/workflows/ideate-extract.md) | Classifies input, creates `ideation/` folder structure, seeds domain files, runs user intent check, sets expansion mode, loads skills |
| 2 | [`ideate-discover`](.agent/workflows/ideate-discover.md) | Recursive breadth-before-depth domain exploration with Deep Think — writes directly to domain files. Cross-cut detection + ledger active throughout. |
| 3 | [`ideate-validate`](.agent/workflows/ideate-validate.md) | Constraints, metrics, competitive positioning, domain exhaustion check, vision summary compilation |

---

## Orchestration

### Step 1 — Run `.agent/workflows/ideate-extract.md`

Classifies the user's input (rich doc, thin PRD, chat transcript, verbal), checks for an existing ideation folder (re-run check), creates the `docs/plans/ideation/` folder structure from the input, runs the universal user intent check to determine expansion mode, sets the expansion mode flag in `ideation-index.md`, and loads the idea-extraction and resolve-ambiguity skills.

### Step 2 — Run `.agent/workflows/ideate-discover.md`

Recursive breadth-before-depth exploration: Level 0 (global domain map) → Level 1 (domain breadth sweep) → Level 2+ (vertical drilling). Deep Think protocol active at every level. Writes directly to domain files. Cross-cut ledger accumulated continuously.

### Step 3 — Run `.agent/workflows/ideate-validate.md`

Explores constraints, success metrics, and competitive positioning. Runs domain exhaustion check (all domains ≥ `[DEEP]`, Deep Think yields zero hypotheses, cross-cut ledger clean). Compiles `docs/plans/vision.md` as a human-readable executive summary.

---

## Quality Gate (Step 12)

### Self-check against Ideation rubric

Before presenting to the user, self-check the ideation output:

Read `.agent/skills/pipeline-rubrics/references/ideation-rubric.md` before applying the self-check dimensions.

| # | Dimension | Check |
|---|-----------|-------|
| 1 | Problem Clarity | Is the problem one sentence, specific, and testable? |
| 2 | Persona Specificity | Are personas named with all 6 fields? |
| 3 | Feature Completeness | Is MoSCoW complete? Are Must Haves explored to ≥Level 2 depth? |
| 4 | Constraint Explicitness | Are all axes (budget, timeline, team, compliance, performance) addressed? |
| 5 | Success Measurability | Are there concrete numbers/thresholds? |
| 6 | Competitive Positioning | Are competitors named with differentiation? |
| 7 | Open Question Resolution | Do all open questions have owners + deadlines? |
| 8 | **Input-Output Proportionality** | Is the ideation output proportional to input richness? Rich inputs must produce rich output. |
| 9 | **Domain Coverage** | Are all domains at `[DEEP]` or `[EXHAUSTED]`? |
| 10 | **Deep Think Coverage** | Were hypotheses tracked and resolved (confirmed/rejected)? |
| 11 | **Cross-Cut Completeness** | Is the cross-cut ledger clean? No pending entries? |
| 12 | **Folder Structure Compliance** | Does the `ideation/` folder match the template structure? |

For any dimension that scores ⚠️ or ❌, resolve it NOW — don't present with known gaps.
Loop back to the relevant step and work through it with the user.

> **Note**: This is an internal self-check, not a formal audit. For a rigorous,
> independent audit with evidence citations, run `/audit-ambiguity ideation` as a
> separate step after this workflow completes.

### Request review

Use `notify_user` to request review of:
- `docs/plans/ideation/ideation-index.md` — the pipeline key file
- `docs/plans/vision.md` — the human summary

Include:
- Summary of the self-check results (all 12 dimensions)
- Any areas where gaps were resolved during the self-check
- The final domain coverage map
- Deep Think stats: N hypotheses presented, N confirmed, N rejected

The ideation must be approved before proceeding. Do NOT proceed until the user sends a message explicitly approving. Wait for explicit approval.

### Proposed next steps

**Mandatory next step**: Run `/audit-ambiguity ideation` for all inputs, regardless of input type. Even a rich document can have gaps the agent missed. The audit is cheap; the cost of a gap propagating to architecture is high. Do not propose `/create-prd` until `/audit-ambiguity ideation` has run.
