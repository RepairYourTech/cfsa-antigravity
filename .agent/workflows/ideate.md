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

### Engagement Tiers

After input classification, the user chooses how much involvement they want. All tiers are available for all input types — the pipeline recommends a default but the user picks.

Read the engagement tier protocol (`.agent/skills/prd-templates/references/engagement-tier-protocol.md`) — apply the tier behavior for ideation decisions. The user chooses their tier after input classification. All tiers produce the **same output quality** using the same fractal structure — only the amount of human involvement differs.

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
- **If it exists but is corrupt** (file size < 100 bytes OR missing `## Structural Classification` section) → Treat as fresh. Warn: "Found a corrupt ideation-index.md — treating as a fresh start." Delete the corrupt file and proceed to Shard 1.
- **If it DOES exist and is valid** → Check for downstream artifacts before offering overwrite:

### 0.1. Downstream cascade check

Scan for downstream pipeline output:
- `docs/plans/*-architecture-design.md`
- `docs/plans/ia/` (any `.md` files besides `index.md`)
- `docs/plans/be/` (any `.md` files besides `index.md`)
- `docs/plans/fe/` (any `.md` files besides `index.md`)

**If downstream artifacts exist** → **STOP**. Present:

> ⚠️ **Ideation output AND downstream specs exist.**
>
> Re-running `/ideate` will invalidate **all** downstream work:
> - Architecture design document
> - IA specs (N shards)
> - BE specs (N specs)
> - FE specs (N specs)
>
> You would need to re-run the entire pipeline from `/create-prd` forward.
>
> **Overwrite** (start fresh, accept cascade invalidation) or **Abort**?

**If no downstream artifacts exist** → Present the standard overwrite prompt:

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
| 1 | [`ideate-extract`](.agent/workflows/ideate-extract.md) | Classifies input, determines structural classification (4 shapes), creates fractal `ideation/` folder structure using Node Classification Gate, seeds domain folders, asks engagement tier + expansion mode, loads skills |
| 2 | [`ideate-discover`](.agent/workflows/ideate-discover.md) | Recursive breadth-before-depth exploration with Deep Think. Gate behavior controlled by engagement tier. Creates fractal nodes (folders with index + CX) and leaf feature files (with Role Lens). Hierarchical CX detection active throughout. |
| 3 | [`ideate-validate`](.agent/workflows/ideate-validate.md) | Constraints, metrics, competitive positioning, leaf-node exhaustion check, fractal structure compliance, vision summary compilation. Auto tier gets a review checkpoint before compilation. |

---

## Orchestration

### Step 1 — Run `.agent/workflows/ideate-extract.md`

Classifies the user's input (rich doc, thin PRD, chat transcript, verbal), determines structural classification (single-surface, multi-surface-shared, multi-product-hub, multi-product-peer), checks for existing ideation folder (re-run check), creates the fractal `docs/plans/ideation/` folder structure using the Node Classification Gate, asks user to choose engagement tier (Auto/Hybrid/Interactive) and expansion mode, writes both to `ideation-index.md` immediately, and loads skills.

### Step 2 — Run `.agent/workflows/ideate-discover.md`

Recursive breadth-before-depth exploration: Level 0 (global domain map) → Level 1 (domain breadth sweep with Node Classification Gate) → Level 2+ (vertical drilling with Reactive Depth and Promotion Protocol). Deep Think active at every level. Writes to fractal feature files with Role Lens. Hierarchical CX files accumulated at every level.

### Step 3 — Run `.agent/workflows/ideate-validate.md`

Explores constraints, success metrics, and competitive positioning. Runs leaf-node exhaustion check (all leaf features ≥ `[DEEP]`, Role Lens complete, Deep Think yields zero hypotheses, all CX files clean). Verifies fractal structure compliance. Compiles `docs/plans/vision.md` as a human-readable executive summary.

---

## Quality Gate

> The quality self-check and review request are handled by `ideate-validate.md` (Step 12).
> The parent does not duplicate shard-level quality gates.

### Next step

**STOP** — do NOT propose `/create-prd` or any other pipeline workflow. The only valid next step is:

- `/audit-ambiguity ideation` — mandatory coverage verification before `/create-prd` can begin.

> If the user wants to pause, save progress and note where to resume. When resuming, the next step remains `/audit-ambiguity ideation`.
