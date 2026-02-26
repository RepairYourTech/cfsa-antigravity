---
description: Directory structure, shard skeletons, and layer index creation for the decompose-architecture workflow
parent: decompose-architecture
shard: structure
standalone: true
position: 1
pipeline:
  position: 3.1
  stage: architecture
  predecessors: [create-prd]
  successors: [decompose-architecture-validate]
  skills: [technical-writer]
  calls-bootstrap: false
---

// turbo-all

# Decompose Architecture — Structure

Create directory structure, shard skeleton files, and all layer indexes.

**Prerequisite**: Read the approved domain boundaries from `docs/plans/ia/decomposition-plan.md`. If this file does not exist, the boundaries have not been approved — tell the user to run `/decompose-architecture` Steps 3-4.5 first to approve and persist the domain boundaries before running this shard.

---

## 5. Create directory structure and shard skeletons

> **Note**: The standard directories (`docs/plans/ia/deep-dives/`, `docs/plans/be/`, `docs/plans/fe/`, `docs/plans/phases/`, `docs/audits/`) are pre-scaffolded. No directory creation needed for single-surface projects.

### Multi-surface projects

For each surface identified in the architecture design, plus a `shared/` surface, create the per-surface subdirectories (e.g., `docs/plans/shared/ia/deep-dives/`, `docs/plans/desktop/fe/`, `docs/plans/web/be/`, etc.). Each new directory must include a `.gitkeep` file and a `README.md` following the same pattern as the pre-scaffolded directories in `docs/plans/`.

Each surface gets its own independent spec pipeline. The `shared/` surface contains
cross-surface domain models and API contracts that both surfaces depend on.

### Mandatory: 00-infrastructure shard (all project types)

This shard is **always** created for every project, regardless of what the architecture design says. It must be numbered `00` and created before any feature shards.

The `00-infrastructure` skeleton must contain these five items:

1. CI/CD pipeline setup (using the confirmed CI/CD skill from bootstrap)
2. Environment configuration (`.env.example`, environment variable documentation)
3. Deployment pipeline (using the confirmed hosting skill)
4. Project scaffolding (directory structure, base configuration files)
5. Database initialization (schema creation, migration tooling setup)

> _"This shard must be the first slice in Phase 1 — it is the foundation everything else builds on."_

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

### Propose next step

Directory structure, shard skeletons, and all layer indexes are created. Next: Run `/decompose-architecture-validate` to identify deep dive candidates, annotate shard types, validate the dependency graph, and generate the spec pipeline tracker.

> If this shard was invoked standalone (not from `/decompose-architecture`), surface this via `notify_user`.

