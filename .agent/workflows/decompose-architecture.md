---
description: Break architecture design into numbered IA shards and create layer indexes — establishes the full docs/plans/ structure
pipeline:
  position: 3
  stage: architecture
  predecessors: [create-prd]
  successors: [write-architecture-spec]
  skills: [architecture-mapping, brainstorming, prd-templates, session-continuity]
  calls-bootstrap: false
shards: [decompose-architecture-structure, decompose-architecture-validate]
---

// turbo-all

# Decompose Architecture

Break the architecture design document into domain-bounded IA shards and create the full spec layer structure.

**Input**: `docs/plans/YYYY-MM-DD-architecture-design.md` (must exist and be approved)
**Output**: `docs/plans/ia/`, `docs/plans/be/`, `docs/plans/fe/` directories with indexes and shard skeletons

---

## 1. Read architecture design

Read the file at `docs/plans/*-architecture-design.md`.

If no architecture design exists → **STOP**: tell the user to run `/create-prd` first.

**Multi-file handling**: If the glob matches multiple files (e.g., multiple dated versions):
- Use the file with the most recent date prefix
- Warn: "Multiple architecture-design files found. Using `[filename]` (most recent). If this is wrong, specify the correct file."

Check the document's `**Status**:` field.
- If `Draft` or `Review` → **STOP**: "Architecture design not yet approved. Get explicit approval first."
- If the `**Status**:` field does not exist → **STOP**: "Architecture design document has no Status field. Add `**Status**: Approved` after explicit review, or run `/create-prd` to regenerate."

Read `docs/plans/ideation/ideation-index.md` for the fractal domain map and structural classification.

> **Design system prerequisite (web/mobile/desktop projects)**: Read `.agent/instructions/tech-stack.md` → `SURFACES`. If surfaces include `web`, `mobile`, or `desktop`, verify `docs/plans/design-system.md` exists.
>
> If not: ⚠️ **Warning** — run `/create-prd-design-system` before writing FE specs. Architecture decomposition can proceed. API-only/CLI/extension projects unaffected.

Identify **Project Type** from the architecture design header:
- **Single-surface** → standard flat structure
- **Multi-surface** → per-surface subdirectories with shared layer

**Surface consistency check**: Compare the Project Type derived here with `## Structural Classification` in `ideation-index.md`. If they conflict (e.g., ideation says single-surface but architecture says multi-surface) → **STOP**: "Surface classification mismatch between ideation (`[ideation value]`) and architecture design (`[arch value]`). Resolve via `/propagate-decision` before decomposing."

## 2. Load brainstorming skill

Read `.agent/skills/brainstorming/SKILL.md`.

## 3. Identify domain boundaries

Read `.agent/skills/architecture-mapping/SKILL.md` and follow its Domain Boundary Protocol.

Read `.agent/skills/prd-templates/references/shard-boundary-analysis.md` for fractal tree signals and standard heuristics.

Walk the ideation fractal tree to inform shard granularity. Build the domain inventory record, apply split trigger rules, produce the domain boundary table.

> **Important**: Ideation does NOT prescribe shard boundaries. It provides raw data. This workflow makes boundary decisions based on architectural analysis.

Present the proposed domain decomposition to the user for validation.

## 4. Assign shard numbers

- `00-*` — Cross-cutting/foundation concerns
- `01-*` through `NN-*` — Feature domains, dependency-ordered (lower = fewer deps)

## 4.5. Request approval of domain boundaries

**STOP** — present domain boundary table, shard numbering, dependency ordering, and deep dive candidates to the user via `notify_user`.

**Do not proceed** until the user explicitly approves.

**Write `docs/plans/ia/decomposition-plan.md` immediately after approval**, before proceeding to skeleton creation.

---

## Shard Overview

| # | Shard | What It Does |
|---|-------|-------------|
| 1 | [`decompose-architecture-structure`](.agent/workflows/decompose-architecture-structure.md) | Creates directory structure, shard skeletons, and all layer indexes |
| 2 | [`decompose-architecture-validate`](.agent/workflows/decompose-architecture-validate.md) | Identifies deep dives, annotates shard types, validates dependencies, generates tracker, requests review |

---

## Orchestration

### Step A — Run `.agent/workflows/decompose-architecture-structure.md`
### Step B — Run `.agent/workflows/decompose-architecture-validate.md`
