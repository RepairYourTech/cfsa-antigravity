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

## 6. Present classification and request approval

Call `notify_user` presenting:
- The classification type and reasoning (from Step 2)
- The source mapping (which BE spec(s) and IA shard this FE spec covers)
- The brand-guidelines extraction summary (design direction, colors, typography, anti-patterns extracted in Step 0)

> **Do NOT proceed to `/write-fe-spec-write` until the user confirms the classification and source mapping.**

Once approved, run `/write-fe-spec-write`.

