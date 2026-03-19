---
description: Create or update Layer 1 architecture spec — interactions, contracts, data models, RBAC, event schemas
pipeline:
  position: 4
  stage: specification
  predecessors: [decompose-architecture]
  successors: [write-be-spec, write-fe-spec] # parallel fork
  skills: [accessibility, adversarial-review, architecture-mapping, brainstorming, code-review-pro, database-schema-design, error-handling-patterns, find-skills, prd-templates, resolve-ambiguity, security-scanning-security-hardening, session-continuity, spec-writing, technical-writer]
  calls-bootstrap: true # may introduce new contracts/patterns
shards: [write-architecture-spec-design, write-architecture-spec-deepen]
---

// turbo-all

# Write Architecture Spec (IA Shard)

Fill in a skeleton IA shard with full interaction details, data models, access control, and edge cases.

**Input**: A skeleton IA shard from `/decompose-architecture`
**Output**: Complete IA shard ready for BE spec writing

> **Process model**: This workflow is collaborative and iterative. Each section
> is drafted, presented to the user for discussion, and refined before moving on.
> After all sections are drafted, multiple deepening passes catch edge cases that
> only become visible in the context of the complete picture. The shard is not done
> until both the agent and the user agree it's deep enough for a developer to
> implement without asking a single clarifying question.

---

## Shard Overview

| # | Shard | What It Does |
|---|-------|-------------|
| 1 | [`write-architecture-spec-design`](.agent/workflows/write-architecture-spec-design.md) | Explores requirements, maps interactions, defines contracts, data models, access control, events, and edge cases |
| 2 | [`write-architecture-spec-deepen`](.agent/workflows/write-architecture-spec-deepen.md) | Runs iterative deepening passes, writes the spec, updates indexes, runs ambiguity gate, presents for review |

---

## Orchestration

### Step A — Run `.agent/workflows/write-architecture-spec-design.md`

Uses the brainstorming skill to clarify scope, then systematically designs all sections: interaction maps, contract shapes, data models, access control, event schemas, and edge cases. Each section is presented to the user for discussion and refinement.

### Step B — Run `.agent/workflows/write-architecture-spec-deepen.md`

Runs multiple deepening passes (cross-section consistency, "what if" scenarios, adversarial thinking), writes the completed spec to the IA directory, updates the IA index, runs the ambiguity gate, and presents for review.

---

## Quality Gate

**BLOCKING GATE** — Do NOT call `notify_user` or proceed to the next step until ALL items pass:

Read .agent/skills/code-review-pro/SKILL.md and apply its adversarial review discipline.

- [ ] Every interaction has a complete flow (action → call → mutation → response)
- [ ] Every contract has typed request, response, and error shapes
- [ ] Data model has all fields, relationships, indexes, and constraints
- [ ] Access control covers all roles and all interaction types
- [ ] Edge cases cover concurrent access, deletion cascades, and state conflicts
- [ ] Cross-shard dependencies are bidirectional

---

## Post-Completion: Mandatory Next Step

> [!CAUTION]
> After completing all IA shards, the **only** valid next step is `/write-be-spec`. Do NOT propose `/plan-phase` or `/implement-slice` — those require completed BE and FE specs. This applies to ALL project types: web apps, CLI tools, bash scripts, APIs, desktop apps. No project skips the BE/FE spec layers.

## Completion Gate (MANDATORY)

Before reporting completion to the user:

1. **Memory check** — Apply rule `memory-capture`. Write any patterns, decisions, or blockers from this workflow to `.agent/progress/memory/`. If nothing to write, confirm: "No new patterns/decisions/blockers."
2. **Progress update** — Update `.agent/progress/` tracking files if they exist.
3. **Session log** — Write session entry to `.agent/progress/sessions/`.

