# Architecture Design Template

Use this template when compiling `docs/plans/YYYY-MM-DD-architecture-design.md`.

```markdown
# [Project Name] — Architecture Design

> **Vision**: [link to vision.md]
> **Date**: YYYY-MM-DD
> **Status**: Draft | Review | Approved
> **Project Type**: [Single-surface: web/desktop/mobile/CLI/API | Multi-surface: list surfaces]

## Tech Stack
[Explicit decision for each applicable axis with rationale — not just the choice,
but WHY this choice over alternatives, what trade-offs were accepted, and what
constraints drove the decision. For multi-surface projects, organized by surface.]

## System Architecture
[Component diagram, data flow, deployment topology — every service named, every
communication path documented, every failure mode identified. For multi-surface:
include surface interconnection diagram and shared domain boundary.]

## Data Strategy
[Placement, schema design, query patterns, migrations — which data lives where
and why, what the hot paths are, how schema evolves. For multi-surface: data
ownership, sync protocol, conflict resolution.]

## Security Model
[Auth, authorization, validation, rate limits — every flow specified step-by-step,
every permission rule scoped, every error case handled]

## Compliance & Safety
[If applicable — full depth on minors/payments/health/regulated domains.
This section may be the largest in the document if compliance constraints
are significant. Every account type, every consent flow, every content filter,
every notification trigger, every audit requirement.]

## API Design
[Surface type, versioning, conventions — endpoint naming, request/response shapes,
error format, pagination strategy. For multi-surface: shared API contract format.]

## Integration Points
[External services, failure modes, fallbacks, cost models — for each: what it
provides, what happens when it's down, what the fallback is]

## Development Methodology
[Contract-first, TDD, vertical slices, spec layers, quality gates — the full
process, not just labels]

## Phasing
[Phase breakdown with feature allocation, dependency order, and timeline estimates.
Each phase has explicit entry/exit criteria. For multi-surface: per-surface or
cross-surface phasing strategy.]

## Directory Structure
[The approved source directory tree from Step 9.5, with one-line descriptions per directory.
Includes: contracts directory path, test layout, build output path, surface subtrees for multi-surface projects.]

## Architecture Separation
[The concern/location/runtime table from Step 9.5 — maps each architectural concern to its
directory and the runtime where it executes.]

## Installed Skills
[List of skills installed during this workflow with versions]

## Decisions Log
[Every decision made during this workflow with rationale — not just what was
decided, but what alternatives were considered and why they were rejected]

## Open Questions
[Anything needing resolution before decomposition — with owner and deadline]
```
