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

- **Project Shape**: [single-surface | multi-surface-shared | multi-product]
- **Surfaces**: [list of identified surfaces, e.g., "Web (Astro/React), Desktop (Rust/Tauri), Mobile (React Native)" — or "N/A" for single-surface]
- **Classification Basis**: [how this was determined — "detected from document", "user interview", "inferred from one-liner"]

## Progress Summary

| Metric | Value |
|--------|-------|
| Total domains | _N_ |
| SURFACE | _N_ |
| BREADTH | _N_ |
| DEEP | _N_ |
| EXHAUSTED | _N_ |
| Cross-cut pairs confirmed | _N_ |
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

### Domain Documents

> **Path convention:** For single-surface projects, domains live in `domains/NN-slug.md`.
> For multi-product projects, surface-exclusive domains live in `surfaces/{surface}/NN-slug.md`
> and shared domains live in `domains/NN-slug.md`.

| # | Domain | Surface | Path | Status | Sub-areas | Deep Think |
|---|--------|---------|------|--------|-----------|------------|
| 01 | _Domain Name_ | _surface or shared_ | [01-domain-slug.md](domains/01-domain-slug.md) | `[SURFACE]` | _N_ sub-areas | _N_ hypotheses |

_For multi-product projects, group domains by surface:_

#### Surface: _Surface Name_

| # | Domain | Path | Status | Sub-areas | Deep Think |
|---|--------|------|--------|-----------|------------|
| 01 | _Domain Name_ | [01-slug.md](surfaces/{surface}/01-slug.md) | `[SURFACE]` | _N_ | _N_ |

#### Shared Domains

| # | Domain | Consumed By | Path | Status | Sub-areas | Deep Think |
|---|--------|-------------|------|--------|-----------|------------|
| 01 | _Domain Name_ | _surface list_ | [01-slug.md](domains/01-slug.md) | `[SURFACE]` | _N_ | _N_ |

### Cross-Cut Ledger

| Document | Path |
|----------|------|
| Cross-Cut Ledger | [cross-cut-ledger.md](cross-cuts/cross-cut-ledger.md) |

## Domain Map

Visual status of all domains with sub-area breakdowns:

```
Domain 01: [Domain Name] [STATUS]
  ├── Sub-area A [STATUS] — N sub-topics
  ├── Sub-area B [STATUS] — N sub-topics
  └── Sub-area C [STATUS] — N sub-topics

Domain 02: [Domain Name] [STATUS]
  ├── ...
  └── ...
```

Status markers: `[SURFACE]` → `[BREADTH]` → `[DEEP]` → `[EXHAUSTED]`

## Decision Log

Numbered decisions with source references. Each decision links to the domain file where it was made.

| # | Decision | Source | Domain |
|---|----------|--------|--------|
| 1 | _Decision description_ | _Discussion context_ | [domain-file.md](domains/NN-domain.md) |

## MoSCoW Summary

### Must Have
- _Feature 1_ → Domain NN
- _Feature 2_ → Domain NN

### Should Have
- _Feature 3_ → Domain NN

### Could Have
- _Feature 4_ → Domain NN

### Won't Have (Now)
- _Feature 5_ — Reason for exclusion
