# Decomposition Templates

Templates for shard skeletons and layer indexes created during `/decompose-architecture-structure`.

---

## Shard Skeleton

For each shard, create at `docs/plans/ia/[NN-domain-name].md`:

```markdown
# [Shard ##] — [Domain Name]

> **Architecture Source**: [link to architecture-design.md]
> **Status**: Skeleton | Draft | Review | Complete

## Overview
[1-2 sentence description of this domain's scope]

## Features
[Level-1 sub-features from the relevant ideation domain folder for this domain. Check `ideation-index.md` Structure Map for the correct folder path — folders are under `domains/` or `surfaces/{name}/`. Read the folder's `*-index.md` for the children table, then each child feature file. NOT architecture-level headlines. See /decompose-architecture-structure Step 5 for seeding instructions.]

## User Interactions
[To be filled during /write-architecture-spec]

## Data Model
[To be filled during /write-architecture-spec]

## Access Control
[To be filled during /write-architecture-spec]

## Accessibility

<!-- Filled by /write-architecture-spec-design Step 5.5 -->
<!-- For web/mobile/desktop surfaces: WCAG 2.1 AA requirements per interaction -->
<!-- For api/cli/extension only: "Not applicable — no visual surfaces" -->

## Edge Cases
[To be filled during /write-architecture-spec]

## Cross-Shard Dependencies
[List which other shards this one depends on or is depended upon by]

## Deep Dives Needed
[List any features complex enough to warrant a separate deep dive document]

## Changelog

| Date | Change | Workflow | Sections Affected |
|------|--------|----------|-------------------|
| [date] | Initial creation | /decompose-architecture-structure | All |
```

---

## IA Index

Create at `docs/plans/ia/index.md`:

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

- Every shard must define: features, user interactions, data model, access control, accessibility, edge cases
- Cross-shard dependencies must be bidirectional (if A references B, B must reference A)
- Complex features get a separate deep dive in `deep-dives/`
- Status: 🔲 Skeleton → 📝 Draft → 👀 Review → ✅ Complete
```

---

## BE Index Skeleton

Create at `docs/plans/be/index.md`:

```markdown
# BE Layer — Backend Specifications

> **IA Source**: [link to ia/index.md]

## Reading Order

Read cross-cutting specs first, then feature specs in numerical order.

## Conventions Template

Every BE spec MUST include:
- API Endpoints (method, path, description)
- Request/Response Contracts ({{CONTRACT_LIBRARY}} schemas)
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

---

## FE Index Skeleton

Create at `docs/plans/fe/index.md`:

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

---

## Master Index — Single-Surface

Create or update `docs/plans/index.md`:

```markdown
# [Project Name] — Specification Index

## Documents

| Document | Description | Status |
|----------|-------------|--------|
| [Ideation](ideation/ideation-index.md) | Problem, personas, features, constraints, domain map | ✅ |
| [Architecture Design](YYYY-MM-DD-architecture-design.md) | Tech stack, system design, security | ✅ |

## Specification Layers

| Layer | Index | Purpose | Specs |
|-------|-------|---------|-------|
| **IA** | [ia/index.md](ia/index.md) | Features, interactions, data models, access control | N shards |
| **BE** | [be/index.md](be/index.md) | API endpoints, contracts, database schemas, middleware | N specs |
| **FE** | [fe/index.md](fe/index.md) | Components, routing, state, interactions, a11y | N specs |
```

## Master Index — Multi-Surface

```markdown
# [Project Name] — Specification Index

## Documents

| Document | Description | Status |
|----------|-------------|--------|
| [Ideation](ideation/ideation-index.md) | Problem, personas, features, constraints, domain map | ✅ |
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
