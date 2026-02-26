---
description: Write a frontend specification — resolves cross-references, consumes IA accessibility/responsive specs, maps BE contracts to components
pipeline:
  position: 5b
  stage: specification
  predecessors: [write-architecture-spec]
  successors: [plan-phase]
  parallel-with: [write-be-spec] # can run in parallel
  skills: [resolve-ambiguity, accessibility, error-handling-patterns, testing-strategist, technical-writer]
  calls-bootstrap: true # may discover new frontend dependencies
shards: [write-fe-spec-classify, write-fe-spec-write]
---

// turbo-all

# Write Frontend Specification

**Input**: A complete BE spec (and its IA source shard)
**Output**: Full FE spec with components, routing, state, interactions, accessibility

---

## Skill Bootstrap

Check installed skills for frontend-relevant coverage:
- Frontend framework skill (e.g., React, Astro, Svelte)
- Frontend design / UI/UX patterns skill
- Accessibility / WCAG skill
- CSS framework skills (e.g., `tailwind-css-patterns` for utilities, `tailwind-design-system` for tokens/CVA/theming)
- Web performance optimization skill
- i18n / localization skill (if needed)

If a needed skill is missing, check if a matching entry exists in `.agent/skill-library/MANIFEST.md`. Read `.agent/workflows/bootstrap-agents.md` and execute its utility instructions immediately with the appropriate stack key to install it.

---

## Shard Overview

| # | Shard | What It Does |
|---|-------|-------------|
| 1 | [`write-fe-spec-classify`](write-fe-spec-classify.md) | Classifies the target, loads skills, reads all source documents + cross-references + deep dives |
| 2 | [`write-fe-spec-write`](write-fe-spec-write.md) | Writes the FE spec, updates indexes, runs ambiguity gate, checks for new dependencies |

---

## Orchestration

### Step A — Run `.agent/workflows/write-fe-spec-classify.md`

Identifies the target FE spec, classifies it (feature spec / cross-cutting), loads the skill bundle, reads all source documents (BE spec, IA shard, cross-shard references, deep dives with FE implications), and reads cross-cutting FE specs.

### Step B — Run `.agent/workflows/write-fe-spec-write.md`

Writes the FE spec to `docs/plans/fe/`, updates the FE index, runs cross-reference checks and the ambiguity gate, checks for new dependencies (firing bootstrap if needed), and presents for review.

---

## Quality Gate

Before presenting to the user, verify:
- [ ] Every component has a props interface
- [ ] Every interactive element has defined behavior
- [ ] Every data field maps to a BE response field (if applicable)
- [ ] Loading, error, and empty states defined for every data-fetching view
- [ ] Accessibility requirements meet WCAG 2.1 AA
- [ ] Responsive behavior specified for all breakpoints
- [ ] IA shard's accessibility section fully consumed (not re-derived from BE spec)
- [ ] Source Map is complete — no FE spec section lacks a traceable source
