---
description: Structured idea extraction from raw input to vision document — input-adaptive, domain-exhaustive, production-grade from the first conversation
pipeline:
  position: 1
  stage: vision
  predecessors: [] # entry point
  successors: [audit-ambiguity, create-prd] # audit-ambiguity recommended before create-prd
  skills: [brainstorming, idea-extraction, pipeline-rubrics, prd-templates, prompt-engineer, resolve-ambiguity, technical-writer]
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

**Quality guarantee**: All input types produce the **same output quality** using the same fractal structure. The ideation output from a one-liner is structurally identical to one from a rich document. Every node has an index, CX file, and children. Every feature has a Role Lens. Only the amount of interview work differs.

Transform a raw idea into comprehensive, structured ideation output through exhaustive recursive exploration with the Deep Think protocol.

> This pipeline does not build MVPs. The ideation phase is where the entire downstream
> pipeline gets its DNA. If the ideation is shallow, every spec, every architecture decision,
> every line of code downstream will be shallow. Treat this phase with the seriousness it
> deserves.

**Output**: `docs/plans/ideation/` folder (pipeline key file: `ideation-index.md`) + `docs/plans/vision.md` (human-readable summary)

---

## 0. Prerequisite gate

Check whether `docs/plans/ideation/ideation-index.md` already exists.

- **If it does NOT exist** → This is a fresh ideation. Proceed to Shard 1.
- **If it DOES exist** → **STOP**. Present to the user:

> ⚠️ **Ideation output already exists** at `docs/plans/ideation/ideation-index.md`.
>
> Running `/ideate` again will overwrite the existing ideation output.
>
> **Overwrite** (start fresh) or **Abort**?

**Do not proceed** to any shard until the user explicitly confirms "Overwrite." If the user says "Abort," end the workflow immediately.

---

## Shard Overview

| # | Shard | What It Does |
|---|-------|-------------|
| 1 | [`ideate-extract`](.agent/workflows/ideate-extract.md) | Classifies input, determines structural classification (4 shapes), creates fractal `ideation/` folder structure using Node Classification Gate, seeds domain folders, runs user intent check, sets expansion mode, loads skills |
| 2 | [`ideate-discover`](.agent/workflows/ideate-discover.md) | Recursive breadth-before-depth exploration with Deep Think. Creates fractal nodes (folders with index + CX) and leaf feature files (with Role Lens). Hierarchical CX detection active throughout. |
| 3 | [`ideate-validate`](.agent/workflows/ideate-validate.md) | Constraints, metrics, competitive positioning, leaf-node exhaustion check, fractal structure compliance, vision summary compilation |

---

## Orchestration

### Step 1 — Run `.agent/workflows/ideate-extract.md`

Classifies the user's input (rich doc, thin PRD, chat transcript, verbal), determines structural classification (single-surface, multi-surface-shared, multi-product-hub, multi-product-peer), checks for existing ideation folder (re-run check), creates the fractal `docs/plans/ideation/` folder structure using the Node Classification Gate, runs user intent check to determine expansion mode, sets the expansion mode flag in `ideation-index.md`, and loads skills.

### Step 2 — Run `.agent/workflows/ideate-discover.md`

Recursive breadth-before-depth exploration: Level 0 (global domain map) → Level 1 (domain breadth sweep with Node Classification Gate) → Level 2+ (vertical drilling with Reactive Depth and Promotion Protocol). Deep Think active at every level. Writes to fractal feature files with Role Lens. Hierarchical CX files accumulated at every level.

### Step 3 — Run `.agent/workflows/ideate-validate.md`

Explores constraints, success metrics, and competitive positioning. Runs leaf-node exhaustion check (all leaf features ≥ `[DEEP]`, Role Lens complete, Deep Think yields zero hypotheses, all CX files clean). Verifies fractal structure compliance. Compiles `docs/plans/vision.md` as a human-readable executive summary.

---

## Quality Gate

> The quality self-check and review request are handled by `ideate-validate.md` (Step 12).
> The parent does not duplicate shard-level quality gates.

### Proposed next steps

**Mandatory next step**: Run `/audit-ambiguity ideation` for all inputs, regardless of input type. Even a rich document can have gaps the agent missed. The audit is cheap; the cost of a gap propagating to architecture is high. Do not propose `/create-prd` until `/audit-ambiguity ideation` has run.

