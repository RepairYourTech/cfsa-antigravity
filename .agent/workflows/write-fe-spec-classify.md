---
description: Classify FE target, load skills, and read all source material for the write-fe-spec workflow
parent: write-fe-spec
shard: classify
standalone: true
position: 1
pipeline:
  position: 5b.1
  stage: specification
  predecessors: [write-architecture-spec]
  successors: [write-fe-spec-write]
  skills: [resolve-ambiguity, accessibility]
  calls-bootstrap: false
---

// turbo-all

# Write FE Spec — Classify & Read Sources

Identify the target FE spec, classify it, load skills, and read all source material including BE spec, IA shard, cross-references, and deep dives.

**Prerequisite**: BE spec(s) for this feature must be complete (if applicable). Read `docs/plans/be/index.md` to verify.

---

## 0. Brand-guidelines prerequisite check

1. Read `.agent/skills/brand-guidelines/SKILL.md`.
2. Scan for any `{{PLACEHOLDER}}` values that are still unfilled. If any exist → stop and tell the user: _"Design direction hasn't been confirmed yet. Run `/create-prd` first to establish the design direction before writing FE specs."_
3. If all placeholders are filled → extract and store for this session: confirmed design direction, color palette, typography choices, motion philosophy, and anti-patterns. These become requirements for every component spec written in this session.

---

## 0.5. Design system prerequisite check

1. Check whether `docs/plans/design-system.md` exists.
2. If it does not exist → **stop** and tell the user: _"The design system has not been established yet. Run `/create-prd-design-system` to lock navigation paradigm, layout grid, page archetypes, and global state design language before writing FE specs."_
3. If it exists → read the file and extract all seven decision areas: Navigation Paradigm, Layout Grid, Page Archetypes, Global Component Inventory, Motion Language, Data Density Philosophy, and Global State Design Language.
4. The extracted decisions are **requirements** for this FE spec — any violation is a rubric failure under Dimension 11 (Design System Consistency).
5. **Fail-fast validation checks** — verify the following before proceeding. If any check fails, classification must **stop** and instruct the user to run `/create-prd-design-system` to resolve drift before continuing:
   - **Page archetype match**: At least one page archetype from `design-system.md` applies to the feature being classified. If no archetype matches, the design system is incomplete for this feature.
   - **Global component / navigation compliance**: The navigation paradigm and Global Component Inventory sections are populated (not empty or placeholder). Every navigation element the FE spec will use must exist in the inventory — re-inventing global components is a rubric failure.
   - **Global state design language compliance**: The Loading States, Error States, and Empty States sub-sections are populated with confirmed approaches. The FE spec must use these confirmed patterns — inventing loading/error/empty state patterns outside the design language is a rubric failure.

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

Read .agent/skills/{{LANGUAGE_SKILL}}/SKILL.md and follow its language conventions.
Read .agent/skills/{{FRONTEND_FRAMEWORK_SKILL}}/SKILL.md
Read .agent/skills/{{FRONTEND_DESIGN_SKILL}}/SKILL.md and follow its design methodology.
Read .agent/skills/{{ACCESSIBILITY_SKILL}}/SKILL.md
Read .agent/skills/{{STATE_MANAGEMENT_SKILL}}/SKILL.md and follow its state management conventions.
Read .agent/skills/error-handling-patterns/SKILL.md
Read .agent/skills/testing-strategist/SKILL.md
Read .agent/skills/technical-writer/SKILL.md

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

**Accessibility extraction gate** (Step 4c gate):

Read `.agent/skills/prd-templates/references/fe-classification-procedures.md` § **Accessibility Extraction Gate** and follow its procedure. Build the five-column accessibility inventory table, apply the thin a11y coverage flag (< 3 specs for an interactive feature triggers a user choice gate), and carry the inventory forward as inline annotations in `## Component Inventory` during `/write-fe-spec-write`.

### Step 4c.5 — Conditional rendering enumeration

Read `.agent/skills/prd-templates/references/fe-classification-procedures.md` § **Conditional Rendering Enumeration** and follow its procedure. Build the role × feature rendering matrix from the IA shard's `## Access Control`, map every non-trivial cell to a named component variant, and flag unspecified role × feature combinations with a "define or apply closest-tier default?" gate.

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

## 6. Present classification and request approval

Call `notify_user` presenting:
- The classification type and reasoning (from Step 2)
- The source mapping (which BE spec(s) and IA shard this FE spec covers)
- The brand-guidelines extraction summary (design direction, colors, typography, anti-patterns extracted in Step 0)
- **Design System Compliance Check**:
  - Which page archetype(s) from `design-system.md` this FE spec uses
  - Confirmation that global components are consumed from the Global Component Inventory (not re-invented)
  - Confirmation that loading/error/empty states follow the confirmed Global State Design Language

> **Do NOT proceed to `/write-fe-spec-write` until the user confirms the classification and source mapping.**

Once approved, run `/write-fe-spec-write`.

> **Seed the spec file**: After classification is approved, read `.agent/skills/prd-templates/references/fe-spec-template.md` for the **FE Spec Seed Stub** (under the `## FE Spec Seed Stub` heading at the bottom of the file). Also read `.agent/skills/prd-templates/references/be-spec-template.md` for the Referenced Material Inventory format. Create the spec file at `docs/plans/fe/[NN-feature-name].md` using the stub, filling in classification details, Referenced Material Inventory, and Design Requirements from above.

