---
description: Break architecture design into numbered IA shards and create layer indexes — establishes the full docs/plans/ structure
pipeline:
  position: 3
  stage: architecture
  predecessors: [create-prd]
  successors: [write-architecture-spec]
  skills: [technical-writer, resolve-ambiguity]
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

Also read the file at `docs/plans/vision.md`.

Identify the **Project Type** from the architecture design header:
- **Single-surface** (web, desktop, mobile, CLI, API) → standard flat structure
- **Multi-surface** (desktop + web, mobile + web, etc.) → per-surface subdirectories with shared layer

## 2. Load brainstorming skill

Read `.agent/skills/brainstorming/SKILL.md` — domain boundary decisions benefit from collaborative exploration.

## 3. Identify domain boundaries

Analyze the architecture design and identify natural domain boundaries. Each boundary becomes a numbered IA shard.

**Heuristics for finding boundaries:**
- Features that share the same data models belong together
- Features that can be developed/deployed independently are candidates for separation
- Features that share the same access control model may belong together
- Cross-cutting concerns (auth, API conventions, error handling) become `00-*` shards

**Domain boundary template:**
| # | Domain | Features Included | Complexity | Needs Deep Dive? |
|---|--------|-------------------|------------|-----------------|
| 00 | Cross-cutting | Auth, API conventions, error handling | Medium | No |
| 01 | [Domain] | [Features] | [Low/Med/High] | [Yes/No] |
| ... | ... | ... | ... | ... |

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

---

## Shard Overview

| # | Shard | What It Does |
|---|-------|-------------|
| 1 | [`decompose-architecture-structure`](decompose-architecture-structure.md) | Creates directory structure, shard skeletons, and all layer indexes |
| 2 | [`decompose-architecture-validate`](decompose-architecture-validate.md) | Identifies deep dives, annotates shard types, validates dependencies, generates tracker, requests review |

---

## Orchestration

### Step A — Run `.agent/workflows/decompose-architecture-structure.md`

Creates the directory structure (with multi-surface subdirectories if needed), writes shard skeleton files, and creates the IA, BE, FE, and master index files.

### Step B — Run `.agent/workflows/decompose-architecture-validate.md`

Identifies deep dive candidates, annotates expected shard document types, validates the dependency graph, generates the spec pipeline tracker, and requests user review.
