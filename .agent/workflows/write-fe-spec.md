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

## 1. Identify the target spec

Determine which FE spec to write. Match it to its BE spec and IA shard sources (if applicable).

If the BE spec was a multi-domain split (multiple BE specs from one IA shard), determine
which BE spec(s) this FE spec covers. An FE spec may correspond to:
- 1 BE spec (most common)
- N BE specs that share a UI surface (e.g., a dashboard page consuming multiple APIs)
- 0 BE specs (pure client-side, static content — rare but valid)

## 2. Classify the target

Not every FE spec maps 1:1 to a BE feature spec. Before writing anything, classify the target spec:

| Classification | Description | Source Inputs | How to Detect |
|---------------|-------------|----------------|---------------|
| **Feature spec** | Defines UI components, routing, and state for a specific product feature. | 1+ BE specs + 1 IA shard | Maps to a specific IA feature shard; consumes specific API endpoints. |
| **Cross-cutting** | Defines shared UI patterns, design tokens, layouts, or routing guards. | Tech stack conventions + global IA principles | Numbered `00-*`; no specific BE spec; content is about "how all UI works" not a specific feature. |

**Present the classification and source mapping to the user before proceeding.** Include:
- The classification and reasoning
- For feature specs: the BE spec(s) and IA shard it maps to
- For cross-cutting specs: confirmation that BE spec/IA shard mapping is skipped

## 3. Load skill bundle

Load skill bundle: [`{{FRONTEND_FRAMEWORK_SKILL}}`, `{{FRONTEND_DESIGN_SKILL}}`, `{{ACCESSIBILITY_SKILL}}`, `.agent/skills/error-handling-patterns/SKILL.md`, `.agent/skills/testing-strategist/SKILL.md`, `.agent/skills/technical-writer/SKILL.md`] — read each SKILL.md before proceeding.

### Ambiguity resolution

When writing the FE spec, if any requirement cannot be resolved from `vision.md`, `architecture-design.md`, `data-placement-strategy.md`, or upstream IA/BE specs, **do not guess**. Instead, load and follow `.agent/skills/resolve-ambiguity/SKILL.md` to systematically resolve the ambiguity before proceeding.

## 4. Read source documents

Read **all** of the following:

### 4a. Conventions and tech stack
Read the file at `docs/plans/fe/index.md` (conventions template) and the file at `docs/plans/index.md` (master index, tech stack).

### 4b. BE source spec(s) (if Feature spec)
Read the file at `docs/plans/be/[NN-spec-name].md` (BE source spec(s)). Pay special attention to:
- Request/Response contracts — these define the data shapes your components will consume
- Error codes — these define the error states your UI must handle
- Rate limits — these affect loading/retry UX patterns

### 4c. IA source shard (if Feature spec)
Read the file at `docs/plans/ia/[NN-shard-name].md` (IA source shard). The FE spec needs the IA shard **in addition to** the BE spec because the IA shard contains:
- **User flows** — step-by-step interaction sequences the UI must implement
- **Access model** — which account tiers see which features (drives conditional rendering)
- **Responsive behavior** — device strategy, breakpoints, mobile-specific behavior
- **Accessibility specifications** — WCAG requirements, keyboard navigation, screen reader behavior
- **Edge cases** — UX for error states, empty states, concurrent access scenarios
- **Junior/age-restricted rules** — content that must be hidden or gated per account type

These are frontend concerns that the BE spec doesn't fully capture.

**Accessibility extraction**: From the IA shard's accessibility specifications, extract every WCAG requirement, keyboard navigation pattern, and screen reader behavior. These MUST appear in the FE spec's component definitions — not as a separate section, but woven into each component's specification. If the IA shard lacks accessibility detail for a given interaction, flag it as a gap and resolve before proceeding.

### 4d. Resolve cross-shard references
If the IA shard references other shards for UI-relevant content (e.g., "navigation behavior
defined in shard 04", "shared component patterns in shard 12"), read those sections. Build a
Referenced Material Inventory the same way the BE skill does:
```
Primary: 09-playground.md (full shard)
BE Source: 09a-chat-api.md, 09b-agent-flow-api.md
Cross-refs:
  - 04-navigation.md § Dashboard Sidebar (lines 45–60)
  - 12-resources-settings.md § Appearance & Accessibility (lines 332–347)
```

### 4e. Read deep dives with FE implications
Some IA deep dives contain frontend architectural decisions (component phasing, performance
budgets, UX patterns). Check the BE spec's IA Source Map for referenced deep dives and read
any that contain FE-relevant decisions.

## 5. Check cross-cutting FE specs

Read any completed cross-cutting FE specs — feature specs must follow their patterns. List the files matching `docs/plans/fe/00-*.md` (cross-cutting specs).

## 6. Write the spec to `docs/plans/fe/[NN-feature-name].md`

**Naming convention**: Use a numbered prefix matching the feature's position in the UI surface ordering, followed by a kebab-case feature name (e.g., `01-auth-ui.md`, `05-directory-ui.md`). For cross-cutting specs, use the `00-` prefix (e.g., `00-design-system.md`).

Write the new UI specification. Follow the conventions from `fe/index.md`. Every FE spec MUST include:

```markdown
# [Feature] — Frontend Specification

> **BE Source**: [link to BE spec(s), or N/A for cross-cutting]
> **IA Source**: [link to IA shard, or N/A for cross-cutting]
> **Status**: Draft | Review | Complete

## Source Map

| FE Spec Section | Source | Section/Lines |
|-----------------|--------|---------------|
| Component Inventory | [be-spec.md or conventions] | § Response Contracts |
| Page/Route Definitions | [ia-shard.md or conventions] | § User Flows |
| Interactions | [ia-shard.md or conventions] | § User Flows + § Edge Cases |
| Accessibility | [ia-shard.md or conventions] | § Accessibility (lines N–M) |
| Responsive Behavior | [ia-shard.md or conventions] | § Device Strategy |
| Data Mapping | [be-spec.md or conventions] | § Request/Response Contracts |

## Component Inventory
[Tree with props interfaces]

## Page/Route Definitions
[URL patterns, guards, redirects]

## State Management
[Server state, client state, URL state, loading/error/empty]

## Interaction Specification
[Click, hover, keyboard, form validation matching Zod]

## Responsive Behavior
[Breakpoints, component behavior per breakpoint]

## Accessibility
[ARIA roles, keyboard nav, screen reader, WCAG compliance]

## Data Mapping
[Which BE response fields map to which component props]

## Open Questions
```

### Quality gates:
- [ ] Every component has a props interface
- [ ] Every interactive element has defined behavior
- [ ] Every data field maps to a BE response field (if applicable)
- [ ] Loading, error, and empty states defined for every data-fetching view
- [ ] Accessibility requirements meet WCAG 2.1 AA
- [ ] Responsive behavior specified for all breakpoints
- [ ] IA shard's accessibility section fully consumed (not re-derived from BE spec)
- [ ] IA shard's user flows reflected in interaction specification
- [ ] Account-tier conditional rendering rules from IA access model included
- [ ] Source Map is complete — no FE spec section lacks a traceable source

## 7. Update the FE index

Change the spec's status from 🔲 to ✅ in `docs/plans/fe/index.md`.

## 8. Update spec pipeline

Read `.agent/skills/session-continuity/protocols/08-spec-pipeline-update.md` and follow the **Spec Pipeline Update Protocol**
to mark this shard's FE column as complete in `.agent/progress/spec-pipeline.md` (skip for cross-cutting specs).

## 9. Cross-reference check

Verify:
- [ ] New spec links back to its BE source spec(s) (if applicable)
- [ ] New spec links back to its IA source shard (if applicable)
- [ ] Related FE specs are cross-referenced
- [ ] Cross-shard referenced material is cited with file + section + line numbers

## 10. Ambiguity gate

Read `.agent/skills/session-continuity/protocols/ambiguity-gates.md` and run the **Ambiguity Gates**:

- **Micro**: Walk each component, prop, interaction, state transition, responsive
  breakpoint, and a11y rule. Would an implementer need to guess about any of them?
  If yes — fix it now.
- **Macro**: Would an implementer running `/implement-slice` need to guess anything
  from this FE spec? If yes — fix it now. The spec is not done until the downstream
  phase can work from it without assumptions.

## 11. Optional: Full ambiguity audit

For a comprehensive scored report across the completed FE layer, run `/audit-ambiguity`.
This is optional but recommended before moving to implementation.

## 12. Check for new dependencies

If this FE spec introduces a technology not already in the project's tech stack:

1. Scan the spec for any new technology, library, or service not already in the tech stack
2. Identify the stack category (e.g., CHARTS, ANIMATION, MAPS, STATE_MANAGEMENT)
3. Read `.agent/workflows/bootstrap-agents.md` and fire bootstrap with:
   - `PIPELINE_STAGE=write-fe-spec`
   - The specific key-value pair (e.g., `CHARTS=Chart.js`, `ANIMATION=Framer Motion`)
4. Confirm the matching skill was installed (if one exists in the skill library)

## 13. Request review and propose next steps

You may only notify the user of completion if you have completed the Cross-Reference check and the Ambiguity gate.

Use `notify_user` to present the new FE spec and updated index for review. Your message MUST include:
1. **The spec created** (link to the file)
2. **Cross-reference verification** (confirmation that links are bidirectional)
3. **Ambiguity Gate confirmation** (confirmation that no implementer would need to guess)
4. **The Pipeline State** (propose the next task from the options below)

Read `.agent/progress/spec-pipeline.md` to determine the pipeline state, then propose the appropriate next step:

- **More BE specs need FE specs** → "Next: Run `/write-fe-spec` for spec [next-spec-number]"
- **All FE specs complete** → "Next: Run `/audit-ambiguity fe` to validate the full FE layer before moving to implementation planning"
- **Cross-cutting FE patterns emerged** → Recommend updating `00-*` cross-cutting FE spec before proceeding
