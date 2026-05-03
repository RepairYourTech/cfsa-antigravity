# Ideation Index — {{PROJECT_NAME}}

> **Pipeline key file.** All downstream workflows read this index to locate ideation documents.
> This file is the entry point for `/create-prd`, `/decompose-architecture`, `/audit-ambiguity ideation`, and all other workflows that consume ideation output.

## Project Overview

**Problem**: _One-sentence problem statement — who has it, why it matters._

**One-liner**: _Elevator pitch — what the product does in ≤15 words._

## Expansion Mode

- Type: [full | vertical | horizontal | cross-cutting | combination | as-is]
- Targets: [list of domains/features to focus on, if applicable]
- Cross-cut Detection: always-on
- Deep Think Protocol: active

## Structural Classification

- **Project Shape**: [single-surface | multi-surface-shared | multi-product-hub | multi-product-peer]
- **Hub Surface** _(hub-and-spoke only)_: [surface name that owns shared domains]
- **Surfaces**: [list of identified surfaces, e.g., "Web (Astro/React), Desktop (Rust/Tauri), Mobile (React Native)" — or "N/A" for single-surface]
- **Classification Basis**: [how this was determined — "detected from document", "user interview", "inferred from one-liner"]

> **Project Shapes:**
> - `single-surface` — One platform. Domains are top-level children of `ideation/`.
> - `multi-surface-shared` — 2+ platforms, same stack, >80% shared logic. Domains at top level with surface annotations.
> - `multi-product-hub` — 2+ platforms, one is the central platform/API. Hub owns shared domains. Spokes reference via CX.
> - `multi-product-peer` — 2+ platforms, no primary. `shared/` folder as a peer for cross-surface domains.

## Progress Summary

| Metric | Value |
|--------|-------|
| Total surfaces | _N_ |
| Total domains | _N_ |
| Total leaf features | _N_ |
| Max depth reached | _N_ |
| Leaf nodes at [SURFACE] | _N_ |
| Leaf nodes at [DEEP] | _N_ |
| Leaf nodes at [EXHAUSTED] | _N_ |
| CX entries confirmed | _N_ |
| Deep Think hypotheses confirmed | _N_ |
| Deep Think hypotheses rejected | _N_ |

## Document Map

> Downstream workflows: read this table to find the specific file you need.

### Meta Documents

| Document | Path | Status |
|----------|------|--------|
| Problem Statement | [problem-statement.md](meta/problem-statement.md) | _status_ |
| Personas | [personas.md](meta/personas.md) | _status_ |
| Competitive Landscape | [competitive-landscape.md](meta/competitive-landscape.md) | _status_ |
| Constraints | [constraints.md](meta/constraints.md) | _status_ |

### Global Cross-Cuts

| Document | Path |
|----------|------|
| Global Cross-Cuts | [ideation-cx.md](ideation-cx.md) |

### Structure Map

> **For single-surface projects**, domains are listed directly below.
> **For multi-product projects**, expand each surface section.
> Every domain below is a FOLDER containing: `{domain}-index.md`, `{domain}-cx.md`, and child features/sub-domains.

#### _{Surface Name or "Top-Level Domains" for single-surface}_

| # | Domain | Path | Status | Children | Depth | Deep Think |
|---|--------|------|--------|----------|-------|------------|
| 01 | _Domain Name_ | [01-slug/](./01-slug/) | `[SURFACE]` | _N children_ | _N levels_ | _N hypotheses_ |

_Repeat surface sections for multi-product projects._

#### Hub-Owned Shared Domains _(hub-and-spoke only)_

_Shared domains live inside the hub surface's domain tree. Listed here for visibility._

| # | Domain | Hub Path | Consumed By | Status |
|---|--------|----------|-------------|--------|
| NN | _Domain Name_ | [web/NN-slug/](surfaces/web/NN-slug/) | Desktop, Mobile | `[SURFACE]` |

## Decision Log

Numbered decisions with source references.

| # | Decision | Source | Domain |
|---|----------|--------|--------|
| D-01 | _Decision description_ | _Discussion context_ | [domain-index.md](./path) |

## MoSCoW Summary

> Features reference their fractal path. Path format: `{surface}/{domain}.{sub-domain}.{feature}`

### Must Have
- _Feature 1_ → `web/01.02.01` ([link](./path/01.02.01-feature.md))
- _Feature 2_ → `desktop/01.01.03` ([link](./path/01.01.03-feature.md))

### Should Have
- _Feature 3_ → `web/02.01` ([link](./path))

### Could Have
- _Feature 4_ → `desktop/01.03.02.04` ([link](./path))

### Won't Have (Now)
- _Feature 5_ — Reason for exclusion
