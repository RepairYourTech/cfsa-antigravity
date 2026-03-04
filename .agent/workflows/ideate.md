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
| Full exploration | Any input with 3+ domains | Full — Horizontal sweep → vertical drilling → cross-cutting synthesis, cross-cut detection active throughout |

**Quality guarantee**: All four input types produce the **same output quality**. The vision document that emerges from a one-liner is structurally and substantively identical to one produced from a rich document. Only the amount of interview work differs.

Transform a raw idea into a comprehensive vision document through exhaustive exploration.

> This pipeline does not build MVPs. The ideation phase is where the entire downstream
> pipeline gets its DNA. If the vision is shallow, every spec, every architecture decision,
> every line of code downstream will be shallow. Treat this phase with the seriousness it
> deserves.

**Output**: `docs/plans/ideation.md` (intermediary, permanent) + `docs/plans/vision.md` (and optional domain appendices)

---

## Shard Overview

| # | Shard | What It Does |
|---|-------|-------------|
| 1 | [`ideate-extract`](.agent/workflows/ideate-extract.md) | Classifies input, seeds `docs/plans/ideation.md`, applies noise filter for chat transcripts (integrated into seeding), runs user intent check, sets expansion mode, loads skills |
| 2 | [`ideate-discover`](.agent/workflows/ideate-discover.md) | Domain mapping, problem exploration, feature inventory (MoSCoW + deepening) |
| 3 | [`ideate-validate`](.agent/workflows/ideate-validate.md) | Constraints, metrics, competitive positioning, domain exhaustion, vision compilation |

---

## Orchestration

### Step 1 — Run `.agent/workflows/ideate-extract.md`

Classifies the user's input (rich doc, thin PRD, chat transcript, verbal), checks for an existing `ideation.md` (re-run check), seeds `docs/plans/ideation.md` from the input, runs the universal user intent check to determine expansion mode, sets the expansion mode flag in `ideation.md`, and loads the idea-extraction and resolve-ambiguity skills.

### Step 2 — Run `.agent/workflows/ideate-discover.md`

Maps domains from the classified input, explores the problem space (personas, pain points, competitive landscape), and builds the full MoSCoW feature inventory with multi-level deepening.

### Step 3 — Run `.agent/workflows/ideate-validate.md`

Explores constraints, success metrics, and competitive positioning. Runs domain exhaustion and vision deepening passes. Compiles `docs/plans/vision.md`.

---

## Quality Gate (Step 12)

### Self-check against Vision rubric

Before presenting to the user, self-check the vision document:

Read .agent/skills/pipeline-rubrics/references/vision-rubric.md before applying the self-check dimensions.

| # | Dimension | Check |
|---|-----------|-------|
| 1 | Problem Clarity | Is the problem one sentence, specific, and testable? |
| 2 | Persona Specificity | Are personas named with pain points + success criteria + switching trigger? |
| 3 | Feature Completeness | Is MoSCoW complete? Are Must Haves explored to ≥Level 2 depth? |
| 4 | Constraint Explicitness | Are all axes (budget, timeline, team, compliance, performance) addressed? |
| 5 | Success Measurability | Are there concrete numbers/thresholds? |
| 6 | Competitive Positioning | Are competitors named with differentiation? |
| 7 | Open Question Resolution | Do all open questions have owners + deadlines? |
| 8 | **Input-Output Proportionality** | Is the vision output proportional to input richness? Rich inputs must produce rich visions. |
| 9 | **Domain Coverage** | Has every identified domain been explored to ≥3 levels of depth? Are appendices created for complex domains? |
| 10 | **Input-Output Fidelity** | Two-layer check: (1) Source → `ideation.md`: every major section of the original source maps to `ideation.md` (checked during seeding in Step 1.5); (2) `ideation.md` → `vision.md`: every section in `ideation.md` maps to `vision.md` — nothing dropped during compilation (checked in Step 11). |

For any dimension that scores ⚠️ or ❌, resolve it NOW — don't present a document with known gaps.
Loop back to the relevant step and work through it with the user.

> **Dimension 8 is critical.** If the user provided a 738KB input document and the vision
> is under 200 lines without appendices, this is a FAIL. Go back and extract what was lost.

> **Note**: This is an internal self-check, not a formal audit. For a rigorous,
> independent audit with evidence citations, run `/audit-ambiguity vision` as a
> separate step after this workflow completes.

### Request review

Use `notify_user` to request review of `docs/plans/vision.md` (and any appendices). Include:
- Summary of the self-check results (all 10 dimensions)
- Any areas where you resolved gaps during the self-check
- The final domain coverage map

The vision must be approved before proceeding. Do NOT proceed to the next step until the user sends a message explicitly approving this output. Proposing next steps is not the same as receiving approval. Wait for explicit approval before continuing.

### Proposed next steps

**Mandatory next step**: Run `/audit-ambiguity vision` for all inputs, regardless of input type. Even a rich document can have gaps the agent missed. The audit is cheap; the cost of a gap propagating to architecture is high. Do not propose `/create-prd` until `/audit-ambiguity vision` has run.
