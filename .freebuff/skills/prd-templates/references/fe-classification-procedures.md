# FE Classification — Accessibility & Conditional Rendering Procedures

Procedures used during `/write-fe-spec-classify` Step 4c to build accessibility inventories and conditional rendering matrices.

---

## Accessibility Extraction Gate

Build an accessibility inventory table for every interactive component or interaction in this feature:

| Component/Interaction | WCAG Req | Keyboard Nav | Screen Reader | IA Source |
|-----------------------|----------|-------------|--------------|-----------|
| [component name] | [WCAG level + criterion] | [key bindings + focus order] | [aria-label / role / live region] | [IA shard § section] |
| [interaction name] | [WCAG level + criterion] | [key bindings + focus order] | [aria-label / role / live region] | [IA shard § section] |

**Thin a11y coverage flag**: If an interactive feature has **< 3 accessibility specifications** in the IA shard (fewer than 3 rows in the inventory table for a feature with interactive elements), flag it:

> ⚠️ **Thin accessibility coverage** for [feature name]: only [N] a11y specs found in IA shard. Options:
> 1. Resolve now — add missing WCAG requirements to the IA shard before proceeding
> 2. Accept thin coverage — proceed with what exists and flag as tech debt

**Wait for the user's choice before proceeding.**

**Carry-forward instruction**: The accessibility inventory table becomes inline annotations in the `## Component Inventory` section during `/write-fe-spec-write`. Each component's specification must include its WCAG requirements, keyboard navigation, and screen reader behavior directly — not as a separate accessibility section.

---

## Conditional Rendering Enumeration (Step 4c.5)

Read the IA shard's `## Access Control` section. Build a **role × feature rendering matrix** for every feature-level component or interaction:

| Feature/Component | Free | Paid | Creator | Guardian | Junior | Business | Staff | Admin |
|-------------------|------|------|---------|----------|--------|----------|-------|-------|
| [component name] | [hidden/locked/read-only/full] | [hidden/locked/read-only/full] | [hidden/locked/read-only/full] | [hidden/locked/read-only/full] | [hidden/locked/read-only/full] | [hidden/locked/read-only/full] | [hidden/locked/read-only/full] | [hidden/locked/read-only/full] |

**Values**: `hidden` (not rendered), `locked` (visible but disabled with upgrade prompt), `read-only` (visible, non-interactive), `full` (full access).

**Variant mapping**: Every non-trivial cell (any value other than `full` for the majority role) becomes a **named variant** in the component's `variants` spec in the FE spec. For example, if `Creator` gets `read-only` access to a component while `Paid` gets `full`, the component spec must include a `readOnlyCreator` variant (or equivalent named variant).

**Unspecified role × feature combinations**: If the IA shard's `## Access Control` does not specify the rendering state for a particular role × feature combination, flag it explicitly:

> ⚠️ **Unspecified role × feature combination**: [component] × [role] is not defined in the IA shard's access control.
> Options:
> 1. Define it now — specify the rendering state
> 2. Apply closest-tier default — inherit from the nearest tier (e.g., Free inherits from the most restrictive, Admin inherits `full`)

**Do not assume.** Every cell must be explicitly defined or explicitly defaulted with user confirmation.
