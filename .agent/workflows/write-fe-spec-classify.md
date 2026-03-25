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
  skills: [brand-guidelines, error-handling-patterns, find-skills, prd-templates, resolve-ambiguity, session-continuity, technical-writer, testing-strategist]
  calls-bootstrap: false
requires_placeholders: [LANGUAGE_SKILL, FRONTEND_FRAMEWORK_SKILL, FRONTEND_DESIGN_SKILL, ACCESSIBILITY_SKILL, STATE_MANAGEMENT_SKILL]
---

// turbo-all

# Write FE Spec — Classify & Read Sources

Identify the target FE spec, classify it, load skills, and read all source material including BE spec, IA shard, cross-references, and deep dives.

**Prerequisite**: BE spec(s) for this feature must be complete (if applicable). Read `docs/plans/be/index.md` to verify.

---

## 0. Placeholder guard

Before any skill reads, verify that the five placeholder values listed in `requires_placeholders` frontmatter have been filled by `/bootstrap-agents`. For each placeholder, check whether the literal characters `{{` still appear in the value. If **any** are unfilled, emit a **HARD STOP** and do not proceed to Step 0.5.

For the hard stop message format and recovery instructions, see `.agent/skills/prd-templates/references/placeholder-guard-template.md`. For placeholder-to-recovery mappings specific to this workflow, see `.agent/skills/session-continuity/protocols/10-placeholder-verification-gate.md`.

Only proceed to Step 0.5 when all five placeholders report no literal `{{` characters.

---

## 0.5. Brand-guidelines prerequisite check

1. Read `.agent/skills/brand-guidelines/SKILL.md`.
2. Scan for any `{{PLACEHOLDER}}` values that are still unfilled. If any exist → stop and tell the user: _"Design direction hasn't been confirmed yet. Run `/create-prd` first to establish the design direction before writing FE specs."_
3. If all placeholders are filled → extract and store for this session: confirmed design direction, color palette, typography choices, motion philosophy, and anti-patterns. These become requirements for every component spec written in this session.

---

## 0.75. Design system prerequisite check

Read `.agent/skills/prd-templates/references/design-system-prerequisite-check.md` and follow its procedure. Extract all seven decision areas from `docs/plans/design-system.md` and run the fail-fast validation checks. If any check fails → stop and instruct the user to run `/create-prd-design-system`.

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

Determine this shard's surface from its directory path (e.g., `docs/plans/fe/web/` → surface `web`; flat `docs/plans/fe/` → surface `shared` or the project's single surface).

Read `.agent/skills/prd-templates/references/skill-loading-protocol.md` and follow the **Skill Loading Protocol** for the `write-fe-spec-classify` workflow. Load all categories listed in its table for this workflow, plus these bundled skills:
- `.agent/skills/error-handling-patterns/SKILL.md`
- `.agent/skills/testing-strategist/SKILL.md`
- `.agent/skills/technical-writer/SKILL.md`

### Ambiguity resolution

When writing the FE spec, if any requirement cannot be resolved from `ideation-index.md`, `architecture-design.md`, `data-placement-strategy.md`, or upstream IA/BE specs, **do not guess**. Load and follow `.agent/skills/resolve-ambiguity/SKILL.md` to resolve it first.

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

## 5.5. Completion Gate (MANDATORY)

1. Scan this conversation for memory-capture triggers (see rule: `memory-capture`):
   - Patterns observed → write to `memory/patterns.md`
   - Non-trivial decisions made → write to `memory/decisions.md`
   - Blockers hit → write to `memory/blockers.md`
2. If no triggers found → confirm: "No new patterns, decisions, or blockers to log"

> **This step is not skippable.** Do not call `notify_user` until all items above are complete.

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

