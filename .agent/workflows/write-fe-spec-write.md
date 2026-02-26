---
description: Write FE spec, update indexes, run ambiguity gate, and check for new dependencies for the write-fe-spec workflow
parent: write-fe-spec
shard: write
standalone: true
position: 2
pipeline:
  position: 5b.2
  stage: specification
  predecessors: [write-fe-spec-classify]
  successors: [plan-phase]
  skills: [technical-writer, accessibility]
  calls-bootstrap: true
---

// turbo-all

# Write FE Spec — Write & Validate

Write the FE spec to `docs/plans/fe/`, update indexes, run quality checks, and present for review.

**Prerequisite**: Target must be classified and all source material read (from `/write-fe-spec-classify` or equivalent). The agent should have the classification, referenced material inventory, and cross-cutting specs available.

---

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

## Design Requirements
**Direction**: [from brand-guidelines — confirmed direction]
**Typography**: [which font/size/weight for each text element in this component]
**Colors**: [primary/secondary/accent usage for default, hover, active, disabled, error states]
**Motion**: [animation/transition behavior, or "none" if static]
**Anti-patterns**: [what AI slop looks like for this component and how to avoid it]

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
- [ ] Design Requirements section is filled from brand-guidelines (not left as placeholders)

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

## 11. Full ambiguity audit (mandatory when this is the last FE spec)

1. Read `docs/plans/fe/index.md`
2. Check if all FE specs show ✅

**More specs remain**: Proceed to the next spec. Do not propose `/plan-phase` yet — the FE layer is not complete.

**This is the last FE spec** (all specs show ✅): Run `/audit-ambiguity fe` now. This is **not optional** — it is a mandatory gate before any implementation planning begins.

**Hard gate**: Do NOT propose `/plan-phase` until `/audit-ambiguity fe` scores 0% ambiguity.

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
- **All FE specs complete** → "All FE specs complete and /audit-ambiguity fe has already run (mandatory Step 11 above). If it scored 0%, proceed to /plan-phase. If it found gaps, resolve them and re-run /audit-ambiguity fe as a fresh invocation before proceeding."
- **Cross-cutting FE patterns emerged** → Recommend updating `00-*` cross-cutting FE spec before proceeding

## 14. Navigation Completeness Check

> **This step only runs when ALL FE shards for the current phase are complete** — not per-shard. The agent must check `docs/plans/fe/index.md` to confirm all specs are ✅ before running this step.

1. Collect every route defined across all FE specs in `docs/plans/fe/`
2. For each route, verify at least one navigation element (nav link, button, redirect, deep link) points to it
3. Verify the navigation structure itself is specced (nav component, sidebar, mobile menu, etc.)
4. Flag any orphan routes (specced but unreachable) as spec gaps
5. If any orphan routes found → tell the user which FE specs need navigation wiring before `/plan-phase` can proceed. Do NOT propose `/plan-phase` until resolved.
6. If all routes are reachable → confirm navigation completeness and propose `/plan-phase`
