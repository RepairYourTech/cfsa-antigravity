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
  skills: [prd-templates, session-continuity, spec-writing, technical-writer, testing-strategist, verification-before-completion]
  calls-bootstrap: true
---

// turbo-all

# Write FE Spec — Write & Validate

Write the FE spec to `.memory/wiki/specs/fe/`, update indexes, run quality checks, and present for review.

**Prerequisite**: Read the spec file at `.memory/wiki/specs/fe/[NN-feature-name].md`. The `## Classification` section, Referenced Material Inventory, and Design Requirements should be present from the classify shard. If the file lacks a `## Classification` section, run `/write-fe-spec-classify` first.

**Re-run detection**: If the spec file already has content beyond the classification stub (filled component sections, state definitions, routing rules):
- Present current state and ask: "This FE spec has existing content. **Continue** (skip filled sections) or **redo specific sections** (which ones)?"
- Wait for user response before proceeding.

---

## 6. Write the spec to `.memory/wiki/specs/fe/[NN-feature-name].md`

Read .agents/skills/technical-writer/SKILL.md and follow its methodology.
Read .agents/skills/spec-writing/SKILL.md and follow its completeness testing and cross-reference checking methodology.
Load the Accessibility skill(s) from the cross-cutting section per the skill loading protocol (`.agents/skills/prd-templates/references/skill-loading-protocol.md`).
Read .agents/skills/testing-strategist/SKILL.md and follow its methodology.

**Naming convention**: Numbered prefix matching feature position + kebab-case name (e.g., `01-auth-ui.md`). Cross-cutting: `00-` prefix.

**Split group tracking**: If this spec results from a split shard (letter suffix in filename), populate the `## Split Group` section in the spec with the split origin shard, companion spec filenames, and shared entity names. This is mandatory for split specs — it enables downstream implementation to discover sibling context.

Read `.agents/skills/prd-templates/references/fe-spec-template.md` for the document structure and quality gates checklist. Follow the conventions from `fe/index.md`.

Write decision to disk. Continue below.

### 6.5. Spec content completeness floor

Spec depth is enforced by **content completeness**, not line count. There is no upper bound on length.

For **every component, view, and form** in this spec, verify all of the following are explicitly present:

| Required item | What "present" means |
|---------------|---------------------|
| State enumeration | Every distinct state defined: `idle`, `loading`, `error` (per error class produced by the BE), `empty`, `success`, plus `optimistic-pending` and `optimistic-rollback` for any optimistic mutation. "Loading" is one state per data dependency, not one shared state. |
| Role variants | Every cell in the role × component matrix explicitly defined: `full`, `read-only`, `partial-hidden` (with which fields hidden), `disabled` (with which actions disabled), `not-rendered`. No empty cells. |
| Form fields | Every field with type, validation rules, error message text per rule, on-blur vs on-submit behavior, disabled conditions |
| Empty / loading / error UI | Concrete copy for empty state, loading skeleton structure, error message + retry affordance per error class |
| Responsive variants | Every breakpoint that changes interaction behavior (not just layout) listed with the specific behavior change |
| Accessibility inventory | Per interactive element: WCAG criterion satisfied, keyboard binding, focus order, screen-reader announcement text, ARIA attributes |
| Navigation behavior | Browser back, deep-link entry, bookmarkability, multi-tab, and unsaved-changes guard for every route |
| Network degradation | Loading-threshold (when does the loading UI promote to a slow-network UI), retry behavior, offline behavior |

**Hard gate**: If any cell is missing for any component, the spec is incomplete. Fill it in. Do **not** count missing items as "implicit," "obvious," or "covered by the design system" — every component must surface its full table even when it inherits from a shared pattern.

**Length is informational**: Report the line count for the spec in the index entry as metadata only. Splitting is justified only by component-group boundaries (e.g., entirely independent surface areas) — not by size.

## 7. Update the FE index

Change the spec's status from 🔲 to ✅ in `.memory/wiki/specs/fe/index.md`.

## 8. Update spec pipeline

Read `.agents/skills/session-continuity/protocols/08-spec-pipeline-update.md` and follow the **Spec Pipeline Update Protocol** (skip for cross-cutting specs).

## 8.5. Iterative deepening passes

Re-read the complete FE spec draft and run the following passes. Each pass may produce new content — repeat until a pass produces no meaningful additions.

### Pass 1: State synchronization

For each component that consumes data from an API:
- When the underlying data changes (via another component, another tab, or another user), how does this component learn about it? Polling? WebSocket? Manual refresh?
- If component A mutates data that component B displays, is the update path defined? Does B re-fetch, or does A broadcast?
- If multiple components share the same data, is the source of truth defined? (Global store? Prop drilling? Context?)
- After a mutation fails, does the component roll back optimistic updates? Is the rollback state defined?

Add any new state management rules, re-fetch triggers, or optimistic update rollback specifications.

### Pass 2: Degraded network behavior

For each data-fetching view:
- What does the component show when the API returns in 3+ seconds? (Loading state is specced — but is the threshold defined?)
- What does the component show when the API returns a network error vs a 500 vs a 4xx?
- What happens to in-progress form submissions if the network drops mid-request?
- Are there any retry behaviors? If so, how many retries, at what interval, with what user feedback?

Add any new loading thresholds, retry specifications, or network error differentiation.

### Pass 3: User flow sequencing

Trace each multi-step user flow across pages/views:
- Can a user navigate backward mid-flow (browser back button, breadcrumbs)? What state is preserved?
- Can a user open the same flow in two browser tabs? What happens on submission in both?
- Can a user bookmark or deep-link to a mid-flow page? What happens on direct navigation?
- If the user leaves a form and returns, is the data persisted? In local storage? Session storage? Not at all?

Add any new navigation guard rules, state persistence decisions, or deep-link handling.

### Pass 4: Responsive interaction gaps

For each component with responsive breakpoints defined:
- At mobile breakpoint, do hover-dependent interactions have touch equivalents?
- At tablet breakpoint, do side-by-side layouts still allow sufficient touch target sizing?
- Do modal/dialog components have appropriate mobile behavior (full-screen vs overlay)?
- Are swipe gestures defined for mobile where drag-and-drop exists on desktop?

Add any new touch interaction specs or mobile-specific behavior.

**Pass loop guard**: Track total pass count.
- Passes 1-7 → mandatory.
- Passes 8+ → optional, run if prior pass produced significant additions.
- **After pass 10** → **STOP**: "10 deepening passes completed. Present remaining gaps to user: continue deepening or accept current spec depth?"

### Pass 5: State enumeration completeness

For each component that consumes data:
- List every distinct state the component can be in. At minimum: `idle`, `loading`, `error` (one per BE error class returned), `empty`, `success`, `optimistic-pending` (if mutating), `optimistic-rollback` (if mutating), `disabled` (if any role removes interaction), `degraded` (if network slowness has a separate UI).
- For each state, define: visual treatment, available interactions, transition triggers in/out, and whether it persists across navigation.
- For each error state, define the user-visible message text per error class, the retry affordance, and whether the user must take action to clear the state.
- Empty states must include the empty copy + the affordance to leave the empty state (e.g., "Create your first entity").

Flag any component where states were collapsed (e.g., all errors share one "something went wrong" message). Spec must enumerate per-class behavior unless the spec explicitly states uniform handling is the design choice.

### Pass 6: Role-conditional rendering exhaustion

Build a role × component matrix for this spec. Every cell must be one of: `full`, `read-only`, `partial-hidden`, `disabled`, `not-rendered`. No empty cells, no "tbd," no "see other doc."

For every `partial-hidden` cell, list which fields/actions are hidden.
For every `read-only` cell, list which controls become non-interactive.
For every `disabled` cell, list which actions are disabled and the user-visible explanation (tooltip, badge, inline message).
For every `not-rendered` cell, specify whether the layout slot collapses or shows a placeholder.

### Pass 7: Accessibility edge-case enumeration

For every interactive component:
- **Keyboard**: Tab order, focus trap behavior in modals, escape behavior, arrow-key navigation in composite widgets (menus, tabs, listboxes), enter/space activation.
- **Screen reader**: Announcement text for state changes (loading start, loading complete, error appeared, success), live-region usage (`polite` vs `assertive`), label-vs-description distinction.
- **Focus management**: Where focus moves on modal open/close, on route change, on form submit, on async error.
- **Color and contrast**: Required contrast ratios per element, behavior under high-contrast mode, behavior when color alone conveys state.
- **Motion**: Respect for `prefers-reduced-motion`, alternative non-animated affordances for motion-conveyed information.

If the spec inherits from a design-system accessibility doc, cite the section explicitly per component — do not leave it implicit.

## 9. Cross-reference check

Verify:
- [ ] New spec links back to its BE source spec(s) (if applicable)
- [ ] New spec links back to its IA source shard (if applicable)
- [ ] Related FE specs are cross-referenced
- [ ] Cross-shard referenced material is cited with file + section + line numbers

## 10. Ambiguity gate

Read `.agents/skills/session-continuity/protocols/ambiguity-gates.md` and run:

- **Micro**: Walk each component, prop, interaction, state transition, responsive breakpoint, and a11y rule. Would an implementer need to guess? Fix it now.
- **Macro**: Would an implementer running `/implement-slice` need to guess anything from this spec? Fix it now.
- **Two-implementer test**: Would two developers reading only this spec make the same decision? If not — fix it now.
- **Devil's advocate pass**: "What would a junior developer get wrong?" Fix any revealed gaps.

## 11. Full ambiguity audit (mandatory when last FE spec)

1. Read `.memory/wiki/specs/fe/index.md`
2. Check if all FE specs show ✅

**More specs remain**: Proceed to the next spec.

**This is the last FE spec**: Run `/audit-ambiguity fe` now. **Hard gate**: Do NOT propose `/plan-phase` until `/audit-ambiguity fe` scores 0%.

## 12. Check for new dependencies

If this FE spec introduces a new technology:
1. Identify the technology (e.g., chart library, map SDK, i18n framework)
2. Read `.agents/skills/bootstrap-agents/SKILL.md` and invoke `/bootstrap-agents PIPELINE_STAGE=write-fe-spec` + the new dependency key
3. **HARD GATE**: Follow the bootstrap verification protocol (`.agents/skills/prd-templates/references/bootstrap-verification-protocol.md`). Confirm the matching skill is installed before proceeding.

## 12.5. Update feature tracking ledger

If `.memory/wiki/specs/feature-ledger.md` exists, read `.agents/skills/prd-templates/references/feature-ledger-protocol.md` and follow **Step 4 — FE Coverage**. Match the components in this spec to Feature IDs and populate the FE Spec and FE Status columns.

## 12.7. Completion Gate (MANDATORY)

1. **Verify pipeline tracker** — Read `.memory/pipeline/progress/spec-pipeline.md` and confirm the FE column for this shard shows `complete`. If it does not → **STOP**: "Pipeline tracker was not updated in Step 8. Go back and run Protocol 08 now before proceeding."
2. **Verify spec graph refresh** — Confirm Protocol 08 called `memory_compile` and that the compile succeeded. If graph refresh did not run → **STOP**: "Spec graph was not refreshed after tracker update. Run `memory_compile` before proceeding."
3. Scan this conversation for memory-capture triggers (see rule: `memory-capture`):
   - Patterns observed → write to `.memory/wiki/patterns.md`
   - Non-trivial decisions made → write to `.memory/wiki/decisions.md`
   - Blockers hit → write to `.memory/wiki/blockers.md`
4. If no triggers found → confirm: "No new patterns, decisions, or blockers to log"
5. Read `.agents/skills/session-continuity/protocols/05-session-close.md` and write a session close log

> **This step is not skippable.** Do not call `notify_user` until all items above are complete.

## 13. Request review and propose next steps

Read .agents/skills/verification-before-completion/SKILL.md and follow its methodology.

Use `notify_user` presenting:
1. **Spec created** (link)
2. **Cross-reference verification**
3. **Ambiguity Gate confirmation**
4. **Pipeline State** — read `.memory/pipeline/progress/spec-pipeline.md` and propose the next step from the **ONLY** permitted options below:

- **More FE specs remain** → "Next: Run `/write-fe-spec` for shard [next-shard-number]"
- **All FE specs complete** → "All FE specs complete and `/audit-ambiguity fe` has already run (mandatory Step 11 above). If it scored 0% and the Navigation Completeness Check passes (Step 14 below), proceed to `/plan-phase`. If gaps remain, resolve them first."
- **Self-audit found unresolvable issues** → Present the issues for discussion before proposing next step

> [!IMPORTANT]
> `/plan-phase` is valid ONLY from this workflow, and ONLY when all FE specs show ✅, `/audit-ambiguity fe` scores 0%, and the Navigation Completeness Check (Step 14) passes.

## 14. Navigation Completeness Check

> Runs only when ALL FE shards for the current phase are complete (all ✅ in index).

1. Collect every route across all FE specs
2. Verify each is reachable from at least one navigation element
3. Verify navigation structure itself is specced
4. Flag orphan routes (specced but unreachable) — these block `/plan-phase`

**Orphan route resolution**: If orphan routes are found:
- List each orphan route with its spec source
- For each, ask: "Add to navigation (where?), remove from spec, or defer to a later phase?"
- Update the relevant FE spec immediately based on user decision
- Re-run the completeness check until 0 orphans remain
