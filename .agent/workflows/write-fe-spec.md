---
description: Write a frontend specification — resolves cross-references, consumes IA accessibility/responsive specs, maps BE contracts to components
pipeline:
  position: 5b
  stage: specification
  predecessors: [write-architecture-spec]
  successors: [plan-phase]
  parallel-with: [write-be-spec] # cross-shard only — see Parallelism Note below
  skills: [brand-guidelines, code-review-pro, error-handling-patterns, find-skills, prd-templates, resolve-ambiguity, session-continuity, spec-writing, technical-writer, testing-strategist, verification-before-completion]
  calls-bootstrap: true # may discover new frontend dependencies
shards: [write-fe-spec-classify, write-fe-spec-write]
---

// turbo-all

# Write Frontend Specification

**Input**: A complete BE spec (and its IA source shard)
**Output**: Full FE spec with components, routing, state, interactions, accessibility

> **Parallelism Note**: `parallel-with: [write-be-spec]` means BE and FE spec workflows can run **in parallel across different IA shards** (e.g., shard 01 BE + shard 02 FE simultaneously). For the **same IA shard**, BE spec must complete before FE spec starts — the FE classify shard requires a completed BE spec as input.

---

## Skill Bootstrap

Check installed skills for frontend-relevant coverage:
- Frontend framework skill (e.g., React, Astro, Svelte)
- Frontend design / UI/UX patterns skill
- Accessibility / WCAG skill
- CSS framework skills (e.g., `tailwind-css-patterns` for utilities, `tailwind-design-system` for tokens/CVA/theming)
- Web performance optimization skill
- i18n / localization skill (if needed)

If a needed skill is missing, check if a matching entry exists in `.agent/skill-library/MANIFEST.md`. Read `.agent/workflows/bootstrap-agents.md` and execute its utility instructions immediately with the appropriate stack key to install it. **HARD GATE**: Follow the bootstrap verification protocol (`.agent/skills/prd-templates/references/bootstrap-verification-protocol.md`). Confirm the matching skill is installed before proceeding.

---

## Shard Overview

| # | Shard | What It Does |
|---|-------|-------------|
| 1 | [`write-fe-spec-classify`](.agent/workflows/write-fe-spec-classify.md) | Classifies the target, loads skills, reads all source documents + cross-references + deep dives |
| 2 | [`write-fe-spec-write`](.agent/workflows/write-fe-spec-write.md) | Writes the FE spec, updates indexes, runs ambiguity gate, checks for new dependencies |

---

## Orchestration

### Step A — Run `.agent/workflows/write-fe-spec-classify.md`

Identifies the target FE spec, classifies it (feature spec / cross-cutting), loads the skill bundle, reads all source documents (BE spec, IA shard, cross-shard references, deep dives with FE implications), and reads cross-cutting FE specs.

### Step B — Run `.agent/workflows/write-fe-spec-write.md`

Writes the FE spec to `docs/plans/fe/`, updates the FE index, runs cross-reference checks and the ambiguity gate, checks for new dependencies (firing bootstrap if needed), and presents for review.

---

## Quality Gate

**BLOCKING GATE** — Do NOT call `notify_user` or proceed to the next step until ALL items pass:

Read .agent/skills/code-review-pro/SKILL.md and apply its adversarial review discipline to each checklist item.

- [ ] Every component has a props interface
- [ ] Every interactive element has defined behavior
- [ ] Every data field maps to a BE response field (if applicable)
- [ ] Loading, error, and empty states defined for every data-fetching view
- [ ] Accessibility requirements meet WCAG 2.1 AA
- [ ] Responsive behavior specified for all breakpoints
- [ ] IA shard's accessibility section fully consumed (not re-derived from BE spec)
- [ ] Source Map is complete — no FE spec section lacks a traceable source
