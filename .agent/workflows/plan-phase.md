---
description: Create TDD vertical slices for one phase, with acceptance criteria per item
pipeline:
  position: 6
  stage: planning
  predecessors: [write-be-spec, write-fe-spec] # join point — waits for both
  successors: [implement-slice]
  skills: [concise-planning, cross-layer-consistency, parallel-agents, prd-templates, session-continuity, technical-writer, testing-strategist]
  calls-bootstrap: true
---

// turbo-all

# Plan Phase

Break a phase into TDD vertical slices, each spanning all four surfaces (contract, test, implementation, UI).

> **Every slice ships production-grade code.** Slices are ordered by dependency,
> not by quality tier. The first slice and the last slice meet the same bar.

**Input**: Approved specs (IA + BE + FE) and the phasing section from architecture design
**Output**: Phase plan with ordered slices and acceptance criteria

---

## Shard 1: Pre-flight — `/plan-phase-preflight`

Phase sequencing gate, skill loading, completeness audit, cross-layer consistency check, and draft continuity.

Run `.agent/workflows/plan-phase-preflight.md`.

---

## Shard 2: Write — `/plan-phase-write`

Slice identification, dependency ordering, acceptance criteria, progress file generation, and bootstrap completeness gate.

Run `.agent/workflows/plan-phase-write.md`.
