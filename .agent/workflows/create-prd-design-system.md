---
description: Navigation paradigm, layout grid, page archetypes, component hierarchy, motion, data density, state design language for the create-prd workflow
parent: create-prd
shard: design-system
standalone: true
position: 1.5
pipeline:
  position: 2.15
  stage: architecture
  predecessors: [create-prd-stack]
  successors: [create-prd-architecture]
  skills: [brand-guidelines, design-anti-cliche, design-direction, prd-templates, technical-writer]
  calls-bootstrap: false
---

// turbo-all

# Create PRD — Design System Decisions

Establish the structural UI architecture — navigation paradigm, layout grid, page archetypes, global component inventory, motion language, data density philosophy, and global state design language. Produces `docs/plans/design-system.md` which all FE specs must consume.

**Prerequisite**: Tech stack decisions must be locked (`/create-prd-stack` completed). Design direction must be confirmed in `.agent/skills/brand-guidelines/SKILL.md`.

---

## 0. Prerequisite check

1. Read `.agent/skills/brand-guidelines/SKILL.md`.
2. Scan for any `{{PLACEHOLDER}}` values that are still unfilled. If any exist → **stop** and tell the user: _"Design direction hasn't been confirmed yet. Run `/create-prd-stack` first to establish the design direction before designing the system."_
3. If all placeholders are filled → extract and store for this session: the confirmed `DESIGN_DIRECTION`, color palette, typography choices, motion philosophy, and anti-patterns.

Read `## Engagement Tier` from `docs/plans/ideation/ideation-index.md`.

Read the engagement tier protocol (`.agent/skills/prd-templates/references/engagement-tier-protocol.md`) — apply the tier behavior for design system decisions (all 7 decisions are product decisions).

1. Read `docs/plans/ideation/meta/constraints.md` — extract the **Project Surfaces** section. Read `docs/plans/ideation/ideation-index.md` — extract the feature inventory from the MoSCoW Summary.
2. Read `.agent/skills/brand-guidelines/SKILL.md` — extract the confirmed `DESIGN_DIRECTION`.
3. Read `.agent/skills/design-direction/SKILL.md` — for direction characteristics and anti-patterns.
4. Read `.agent/skills/technical-writer/SKILL.md` — for document writing conventions.
5. Read `.agent/skills/prd-templates/references/design-system-decisions.md` — all decision option menus and the output template for `docs/plans/design-system.md`.
6. Note which surfaces are in scope from `## Project Surfaces`.

### Ideation workflow context

> **Mandatory.** Navigation paradigms and page archetypes must be driven by actual user workflows, not abstract feature lists.

7. Read the `## Structure Map` in `ideation-index.md` — identify the **3 heaviest domains** (highest feature count / deepest nesting)
8. For each heavy domain: read `{domain}/{domain}-index.md` — extract the Children table to understand the user-facing workflows (what screens exist, what data users interact with, what actions they take)
9. If any heavy domain has deep dives → read them for workflow complexity that affects navigation and archetype decisions

---

## 2. Decision 1 — Navigation paradigm

Present surface-appropriate options from the **Navigation Paradigm Options** section of `design-system-decisions.md`. Present only the options for surfaces in scope. Include tradeoff framing — e.g., sidebar is good for complex apps with deep IA but bad for mobile-first or content-focused sites.

> **Decision prompt**: "Which navigation pattern fits your app's usage pattern and audience?"

**Tier-aware confirmation** *(applies to all 7 decisions in this shard)*:
- **Interactive/Hybrid** → "Wait for explicit user confirmation" means present and wait.
- **Auto** → auto-confirm with Deep Think reasoning. Write the decision with `[AUTO-CONFIRMED]` tag. The Auto Tier Review Checkpoint in `/ideate-validate` or the review in Step 9 is where the user can override.

**Wait for explicit user confirmation before proceeding** *(Interactive/Hybrid)* or auto-confirm with Deep Think *(Auto)*.

On confirmation, write the `## Navigation Paradigm` section to `docs/plans/design-system.md` immediately. Follow the write verification protocol (`.agent/skills/prd-templates/references/write-verification-protocol.md`).

---

## 3. Decision 2 — Layout grid

Ask the user about grid structure per breakpoint (mobile ≤768px, tablet 769–1024px, desktop ≥1025px): columns, gutter, max content width, grid type (CSS Grid / Flexbox / Hybrid).

Provide a **default recommendation** based on the confirmed design direction:
- Information-dense → 12-column, 24px gutter, 1440px max
- Editorial/spacious → 12-column, 32px gutter, 1200px max
- Mobile-first → 4/8/12 column progression, 16px gutter

**Wait for explicit user confirmation before proceeding.**

On confirmation, write the `## Layout Grid` table to `docs/plans/design-system.md`. Follow the write verification protocol (`.agent/skills/prd-templates/references/write-verification-protocol.md`).

---

## 4. Decision 3 — Page archetypes

Based on the feature inventory from `ideation-index.md`, propose a named archetype set using the **Page Archetype Options** from `design-system-decisions.md` as a starting point. Each archetype defines named layout zones. For each proposed archetype, produce a layout zones line (pipe-separated) and optionally an ASCII wireframe.

Present the proposed archetypes to the user. Ask whether any are missing or should be renamed. **Wait for explicit user confirmation before proceeding.**

On confirmation, write the `## Page Archetypes` section to `docs/plans/design-system.md`. Follow the write verification protocol (`.agent/skills/prd-templates/references/write-verification-protocol.md`).

---

## 5. Decision 4 — Component hierarchy

Derive the global component list from the confirmed navigation paradigm and page archetypes. Use the **Global Component Categories** from `design-system-decisions.md` as a seed. Global components are those used across multiple archetypes or present on every page.

Present the derived list. Ask: (1) Are any components missing? (2) Should any be feature-local instead of global? (3) Are there project-specific components not covered?

**Wait for explicit user confirmation before proceeding.**

On confirmation, write the `## Global Component Inventory` section to `docs/plans/design-system.md`. Follow the write verification protocol (`.agent/skills/prd-templates/references/write-verification-protocol.md`). This serves as the **Component Inventory Seed** — all FE specs must consume (not re-invent) these global components.

---

## 6. Decision 5 — Motion language

Present the options from the **Motion Language Options** in `design-system-decisions.md`. Present a recommendation based on the confirmed design direction. **Wait for explicit user confirmation before proceeding.**

On confirmation, write the `## Motion Language` section to `docs/plans/design-system.md`. Follow the write verification protocol (`.agent/skills/prd-templates/references/write-verification-protocol.md`).

---

## 7. Decision 6 — Data density philosophy

Present the options from the **Data Density Options** in `design-system-decisions.md`. If **Hybrid** is selected, ask the user to define per-archetype density rules. **Wait for explicit user confirmation before proceeding.**

On confirmation, write the `## Data Density Philosophy` section to `docs/plans/design-system.md`. Follow the write verification protocol (`.agent/skills/prd-templates/references/write-verification-protocol.md`).

---

## 8. Decision 7 — Global state design language

Two-part decision. Present the loading state, error state, and empty state options from the **Global State Design Language Options** in `design-system-decisions.md`. Present recommendations based on the confirmed design direction. **Wait for explicit user confirmation before proceeding.**

On confirmation, write the `## Global State Design Language` section to `docs/plans/design-system.md`. Follow the write verification protocol (`.agent/skills/prd-templates/references/write-verification-protocol.md`).

---

## 9. Write and verify design-system.md

After all seven decisions, verify that `docs/plans/design-system.md` was written progressively and is complete. Use the **design-system.md Output Template** from `design-system-decisions.md` as the canonical structure.

Verify:
1. All seven sections are present and filled (no placeholders, no TBDs).
2. The **Global Component Inventory** serves as the Component Inventory Seed.
3. Every decision references the confirmed design direction for rationale consistency.

If any section is incomplete, loop back to the relevant decision step and resolve with the user.

**Completeness loop guard**: If the same section fails completeness 2 times → **STOP**: present the incomplete section to the user with what's missing and ask: "Provide the missing content directly, or accept this section as-is with a note?"

---

## Completion Gate (MANDATORY)

Before reporting completion or proceeding to next shard:

1. **Memory check** — Apply rule `memory-capture`. Write any patterns, decisions, or blockers from this shard to `.agent/progress/memory/`. All 7 design system decisions should be reviewed for `DEC-NNN` entries. If nothing to write, confirm: "No new patterns/decisions/blockers."
2. **Progress update** — Update `.agent/progress/` tracking files if they exist.
3. **Session log** — Write session entry to `.agent/progress/sessions/`.

---

### Next step

**STOP** — do NOT proceed to any other workflow. The only valid next step is `/create-prd-architecture`.

> If invoked standalone, surface via `notify_user` and wait for user confirmation.
