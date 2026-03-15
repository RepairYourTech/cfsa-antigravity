---
description: Add new features, requirements, or constraints mid-pipeline — classify the change, write it at the correct entry point, and cascade through downstream layers
pipeline:
  position: utility
  stage: quality-gate
  predecessors: [] # callable from any stage
  successors: [] # returns to caller
  skills: [brainstorming, prd-templates, resolve-ambiguity, session-continuity, technical-writer]
  calls-bootstrap: false
shards: [evolve-feature-classify, evolve-feature-cascade]
---

# Evolve Feature

Add genuinely new features, requirements, or constraints to the pipeline after work has already begun — classify the change, write it at the correct entry point, and cascade additions through all downstream layers that have existing content.

**Usage**: `/evolve-feature` — you'll be asked to describe what you want to add.

**Optional**: `/evolve-feature @file` — provide a document describing the new feature.

**When to use this**: Any time scope grows after pipeline work has begun — new features, new requirements on existing features, new technical constraints, or corrections to misunderstandings.

**When NOT to use this**: If you're correcting downstream documents to match an already-locked decision — use `/propagate-decision` instead. If you're starting fresh — use `/ideate`.

**Key distinction from `/propagate-decision`**: `/evolve-feature` adds genuinely new things that didn't exist before. `/propagate-decision` corrects documents that should have always reflected a locked decision.

---

## Shard Overview

| # | Shard | What It Does |
|---|-------|--------------|
| 1 | [`evolve-feature-classify`](.agent/workflows/evolve-feature-classify.md) | Captures the new thing, classifies it, identifies the entry point document, writes new content, determines cascade scope |
| 2 | [`evolve-feature-cascade`](.agent/workflows/evolve-feature-cascade.md) | Cascades through downstream layers, assesses implementation impact, runs consistency check, writes evolution record |

---

## Orchestration

### Step A — Run `.agent/workflows/evolve-feature-classify.md`

Captures the user's description of the new feature/requirement/constraint, classifies it into one of four categories, identifies the correct entry point document, writes the new content at the appropriate spec depth, and determines which downstream layers need updating.

### Step B — Run `.agent/workflows/evolve-feature-cascade.md`

Cascades the new content through each downstream layer with existing content (stopping at each layer for user approval), assesses implementation impact on phase plans, runs a consistency check, writes the evolution record, and proposes next steps.

---

## Key Principles

- **Scope growth is normal** — The pipeline is designed to evolve. New features mid-pipeline are expected, not exceptional.
- **Entry point matters** — The classification determines where new content enters the pipeline. Writing at the wrong layer creates inconsistency.
- **Cascade is ordered** — Architecture → IA → BE → FE → Phase plan. Never skip a layer.
- **User approval at each layer** — The user sees and approves additions at every layer before cascading further.
- **Implementation impact is assessed** — If phase plans exist, the workflow determines whether existing slices need revisiting or new slices are needed.
