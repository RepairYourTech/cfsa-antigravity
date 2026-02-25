---
description: Break architecture design into numbered IA shards and create layer indexes — establishes the full docs/plans/ structure
pipeline:
  position: 3
  stage: architecture
  predecessors: [create-prd]
  successors: [write-architecture-spec]
  skills: [technical-writer, resolve-ambiguity]
  calls-bootstrap: false
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

## 5. Create directory structure and shard skeletons

> **Note**: The standard directories (`docs/plans/ia/deep-dives/`, `docs/plans/be/`, `docs/plans/fe/`, `docs/plans/phases/`, `docs/audits/`) are pre-scaffolded. No directory creation needed for single-surface projects.

### Multi-surface projects

For each surface identified in the architecture design, plus a `shared/` surface, create the per-surface subdirectories (e.g., `docs/plans/shared/ia/deep-dives/`, `docs/plans/desktop/fe/`, `docs/plans/web/be/`, etc.). Each new directory must include a `.gitkeep` file and a `README.md` following the same pattern as the pre-scaffolded directories in `docs/plans/`.

Each surface gets its own independent spec pipeline. The `shared/` surface contains
cross-surface domain models and API contracts that both surfaces depend on.

### Shard skeletons (all project types)

For each shard, create a skeleton file:

```markdown
# [Shard ##] — [Domain Name]

> **Architecture Source**: [link to architecture-design.md]
> **Status**: Skeleton | Draft | Review | Complete

## Overview
[1-2 sentence description of this domain's scope]

## Features
[List of features from the domain boundary table]

## User Interactions
[To be filled during /write-architecture-spec]

## Data Model
[To be filled during /write-architecture-spec]

## Access Control
[To be filled during /write-architecture-spec]

## Edge Cases
[To be filled during /write-architecture-spec]

## Cross-Shard Dependencies
[List which other shards this one depends on or is depended upon by]

## Deep Dives Needed
[List any features complex enough to warrant a separate deep dive document]
```

## 6. Create IA index

Create `docs/plans/ia/index.md`:

```markdown
# IA Layer — Information Architecture

> **Architecture Source**: [link to architecture-design.md]

## Reading Order

Read cross-cutting shards first, then feature shards in numerical order.

## Shards

| # | Shard | Status | Deep Dives |
|---|-------|--------|------------|
| 00 | [00-shard-name.md](00-shard-name.md) | 🔲 | — |
| 01 | [01-shard-name.md](01-shard-name.md) | 🔲 | — |
| ... | ... | ... | ... |

## Conventions

- Every shard must define: features, user interactions, data model, access control, edge cases
- Cross-shard dependencies must be bidirectional (if A references B, B must reference A)
- Complex features get a separate deep dive in `deep-dives/`
- Status: 🔲 Skeleton → 📝 Draft → 👀 Review → ✅ Complete
```

## 7. Create BE index skeleton

Create `docs/plans/be/index.md`:

```markdown
# BE Layer — Backend Specifications

> **IA Source**: [link to ia/index.md]

## Reading Order

Read cross-cutting specs first, then feature specs in numerical order.

## Conventions Template

Every BE spec MUST include:
- API Endpoints (method, path, description)
- Request/Response Contracts (Zod schemas)
- Database Schema (tables, fields, indexes, permissions)
- Middleware & Policies (auth, rate limits, validation)
- Data Flow (request lifecycle)
- Error Handling (specific error codes, not generic 500s)
- IA Source Map (which IA shard sections and deep dives inform each part)

## Shard-to-Spec Mapping

Populated by `/write-be-spec`. Mapping depends on shard document type
(classified during `/write-architecture-spec`):

| IA Shard | Type | BE Spec(s) | Status |
|----------|------|-----------|--------|
| *(populated by /write-be-spec)* | | | |
```

## 8. Create FE index skeleton

Create `docs/plans/fe/index.md`:

```markdown
# FE Layer — Frontend Specifications

> **BE Source**: [link to be/index.md]

## Reading Order

Read cross-cutting specs first, then feature specs in numerical order.

## Conventions Template

Every FE spec MUST include:
- Component Inventory (tree with props interfaces)
- Page/Route Definitions (URL patterns, guards, redirects)
- State Management (server state, client state, URL state)
- Interaction Specification (click, hover, keyboard, form validation)
- Responsive Behavior (breakpoints, component behavior)
- Accessibility (ARIA roles, keyboard navigation, screen reader)
- Loading/Error/Empty States
- Source Map (traceability to BE spec and IA shard sections)

## Spec-to-Source Mapping

Populated by `/write-fe-spec`. FE specs are organized by UI surface, not backend boundary:

| # | FE Spec | BE Source(s) | IA Source | Status |
|---|---------|-------------|-----------|--------|
| *(populated by /write-fe-spec)* | | | | |
```

## 9. Create master index

Create or update `docs/plans/index.md`.

### Single-surface master index

```markdown
# [Project Name] — Specification Index

## Documents

| Document | Description | Status |
|----------|-------------|--------|
| [Vision](vision.md) | Problem, personas, features, constraints | ✅ |
| [Architecture Design](YYYY-MM-DD-architecture-design.md) | Tech stack, system design, security | ✅ |

## Specification Layers

| Layer | Index | Purpose | Specs |
|-------|-------|---------|-------|
| **IA** | [ia/index.md](ia/index.md) | Features, interactions, data models, access control | N shards |
| **BE** | [be/index.md](be/index.md) | API endpoints, contracts, database schemas, middleware | N specs |
| **FE** | [fe/index.md](fe/index.md) | Components, routing, state, interactions, a11y | N specs |
```

### Multi-surface master index

```markdown
# [Project Name] — Specification Index

## Documents

| Document | Description | Status |
|----------|-------------|--------|
| [Vision](vision.md) | Problem, personas, features, constraints | ✅ |
| [Architecture Design](YYYY-MM-DD-architecture-design.md) | Tech stack, system design, security | ✅ |

## Surfaces

| Surface | Index | Description | Shards |
|---------|-------|-------------|--------|
| **Shared** | [shared/index.md](shared/index.md) | Cross-surface domain models, sync protocol, shared contracts | N |
| **[Surface 1]** | [surface-1/index.md](surface-1/index.md) | [Surface 1 description] | N |
| **[Surface 2]** | [surface-2/index.md](surface-2/index.md) | [Surface 2 description] | N |

## Pipeline (per surface)

Each surface follows the same spec pipeline independently:
IA shards → BE specs → FE specs → audit → plan → implement → validate

Shared surface specs must be completed first — other surfaces depend on them.
```

Each surface's own `index.md` contains the standard three-layer table (IA/BE/FE)
scoped to that surface, following the same format as the single-surface master index.

## 10. Identify deep dive candidates

For each shard marked "Needs Deep Dive" in Step 3:

1. Create an empty deep dive skeleton at `docs/plans/ia/deep-dives/[feature-name].md`
   - **Naming convention**: Use kebab-case derived from the feature name (e.g., `chat-orchestration.md`, `age-verification-flow.md`, `order-state-machine.md`)
2. Add a reference to it in the parent shard's "Deep Dives Needed" section
3. Add it to the IA index deep dives column

## 11. Annotate expected shard types

Based on domain boundary analysis from Step 3, add a **preliminary** `Document Type`
annotation to each shard skeleton. `/write-architecture-spec` confirms or reclassifies.

| Classification | Expected BE Specs |
|---------------|-------------------|
| **Feature domain** | 1 |
| **Multi-domain** | N (split along sub-feature boundaries) |
| **Cross-cutting** | 1 (`00-*`) |
| **Structural reference** | 0 |

```markdown
> **Document Type** (preliminary): Feature domain | Multi-domain | Cross-cutting | Structural reference
```

> **Note**: Classification is based on domain analysis, not shard content (which doesn't
> exist yet). `/write-be-spec` uses the confirmed type to determine spec count.

## 12. Dependency graph validation

Verify the decomposition (structural checks only — content doesn't exist yet):

- [ ] Every "Must Have" feature from `vision.md` appears in at least one shard
- [ ] No circular dependencies between shards
- [ ] Cross-cutting shards (00-*) don't depend on feature shards
- [ ] Every shard has a preliminary Document Type annotation
- [ ] Deep dive candidates are referenced from their parent shards
- [ ] BE/FE indexes exist with conventions templates (mapping tables will be populated later)
- [ ] For multi-surface: shared surface shards have lower numbers than surface-specific shards that depend on them
- [ ] For multi-surface: each surface has its own index.md with IA/BE/FE layer table
- [ ] For multi-surface: cross-surface dependencies point to shared/ shards, not directly to another surface's shards

## 13. Generate spec pipeline tracker

Read `.agent/skills/session-continuity/protocols/07-spec-pipeline-generation.md` and follow the **Spec Pipeline Generation Protocol**
to create `.agent/progress/spec-pipeline.md` tracking IA/BE/FE completion per shard.

## 14. Request review and propose next steps

Use `notify_user` to present:
- The full `docs/plans/ia/` directory (shard skeletons + index)
- `docs/plans/be/index.md`
- `docs/plans/fe/index.md`
- `docs/plans/index.md`
- `.agent/progress/spec-pipeline.md`

The decomposition must be approved before filling in shards with `/write-architecture-spec`.

**Proposed next step**: Once approved, run `/write-architecture-spec` starting with the lowest-numbered skeleton shard. Read `.agent/progress/spec-pipeline.md` to identify which shard to start with.
