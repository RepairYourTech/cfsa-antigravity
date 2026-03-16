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
**Output**: `docs/plans/ia/`, `docs/plans/be/`, `docs/plans/fe/` directories with indexes and shard skeletons (or per-surface subdirectories for multi-surface projects)

---

## 1. Read architecture design

Read the file at `docs/plans/*-architecture-design.md`.

If no architecture design exists, tell the user to run `/create-prd` first. Do not proceed without an approved design.

Also check the document's `**Status**:` field. If the status is `Draft` or `Review` → **STOP**: "The architecture design is not yet approved (current status: [status]). Get explicit approval from the user and update the status to `Approved` before decomposing."

Also read `docs/plans/ideation/ideation-index.md` for the fractal domain map and structural classification. The ideation folder uses a fractal structure — read domain indexes (not flat files) to understand depth, child counts, and cross-cut density.

> **Design system prerequisite (web/mobile/desktop projects)**: Read `.agent/instructions/tech-stack.md` and locate the `SURFACES` value. If surfaces include `web`, `mobile`, or `desktop`, verify that `docs/plans/design-system.md` exists and is not empty.
>
> If it does not exist:
>
> ⚠️ **Warning**: FE specs for this project require a design system (`docs/plans/design-system.md`). Run `/create-prd-design-system` before writing any FE specs. You may continue with architecture decomposition now, but the design system must be completed before the FE spec writing phase.
>
> This is a warning, not a hard stop — architecture decomposition can proceed. API-only, CLI, and extension projects are not affected.

Identify the **Project Type** from the architecture design header:
- **Single-surface** (web, desktop, mobile, CLI, API) → standard flat structure
- **Multi-surface** (desktop + web, mobile + web, etc.) → per-surface subdirectories with shared layer

## 2. Load brainstorming skill

Read `.agent/skills/brainstorming/SKILL.md` — domain boundary decisions benefit from collaborative exploration.

## 3. Identify domain boundaries

Read .agent/skills/architecture-mapping/SKILL.md and follow its methodology.

Analyze the architecture design and identify natural domain boundaries. Each boundary becomes a numbered IA shard.

**Fractal tree analysis for shard boundaries:**

The ideation folder uses a fractal structure. Walk the tree to inform shard granularity:

| Signal | What It Means for Sharding |
|--------|---------------------------|
| Deep fractal tree (3+ levels) | Domain is complex enough for its own shard |
| Many children (5+ features) | Consider splitting into multiple shards |
| Dense CX file (5+ cross-cuts) | This domain has high coupling — keep it together in one shard, or isolate carefully |
| Rich Role Matrix (3+ roles with access) | Shard needs multi-role IA spec coverage |
| Hub-and-spoke shared domains | Shared domains often become `00-*` cross-cutting shards |
| Leaf features marked `[EXHAUSTED]` | Most confident for shard scoping — behavior is fully defined |

**Standard heuristics also apply:**
- Features that share the same data models belong together
- Features that can be developed/deployed independently are candidates for separation
- Features that share the same access control model may belong together
- Cross-cutting concerns (auth, API conventions, error handling) become `00-*` shards

Read `.agent/skills/architecture-mapping/SKILL.md` and follow its Domain Boundary Protocol. Build the domain inventory record, apply all three split trigger rules, and produce the domain boundary table. Present split candidates to the user before locking any boundary.

> **Important**: Ideation does NOT prescribe shard boundaries. It provides the raw data (depth, features, cross-cuts, roles). This workflow makes the shard boundary decisions based on architectural analysis.

Present the proposed domain decomposition to the user for validation.

## 4. Assign shard numbers

Follow the numbering convention:
- `00-*` — Cross-cutting/foundation concerns (may have multiple: `00-api-conventions`, `00-auth-middleware`, etc.)
- `01-*` through `NN-*` — Feature domains, ordered by dependency (dependencies first)

Order rule: If shard B depends on shard A, then A gets a lower number than B.

## 4.5. Request approval of domain boundaries

**STOP HERE** and present the domain boundary table and shard numbering to the user for explicit approval. Use `notify_user` to present:

1. The complete domain boundary table from Step 3
2. The proposed shard numbering from Step 4
3. The dependency ordering rationale
4. Any shards marked as needing deep dives

Ask:
- "Does this decomposition capture every feature from the architecture design?"
- "Are the domain boundaries in the right places, or should any be split/merged?"
- "Is the dependency ordering correct?"

**Do not proceed** to shard skeleton creation until the user explicitly approves the domain boundaries. If the user requests changes, revise Steps 3-4 and re-present.

**Write `docs/plans/ia/decomposition-plan.md` immediately after user approval of the domain list, before proceeding to skeleton creation. This is a single gate — write the plan once, then proceed to the Shard Overview.**

---

## Shard Overview

| # | Shard | What It Does |
|---|-------|-------------|
| 1 | [`decompose-architecture-structure`](.agent/workflows/decompose-architecture-structure.md) | Creates directory structure, shard skeletons, and all layer indexes |
| 2 | [`decompose-architecture-validate`](.agent/workflows/decompose-architecture-validate.md) | Identifies deep dives, annotates shard types, validates dependencies, generates tracker, requests review |

---

## Orchestration

### Step A — Run `.agent/workflows/decompose-architecture-structure.md`

Creates the directory structure (with multi-surface subdirectories if needed), writes shard skeleton files, and creates the IA, BE, FE, and master index files.

### Step B — Run `.agent/workflows/decompose-architecture-validate.md`

Identifies deep dive candidates, annotates expected shard document types, validates the dependency graph, generates the spec pipeline tracker, and requests user review.
