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
  skills: [design-direction, technical-writer]
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

---

## 1. Read source documents

1. Read `docs/plans/vision.md` — extract the **Project Surfaces** section (which surfaces are in scope) and the feature inventory (all "Must Have" and "Should Have" features).
2. Read `.agent/skills/brand-guidelines/SKILL.md` — extract the confirmed `DESIGN_DIRECTION`.
3. Read `.agent/skills/design-direction/SKILL.md` — for reference on the direction's characteristics and anti-patterns.
4. Read `.agent/skills/technical-writer/SKILL.md` — for document writing conventions.
5. Note which surfaces are in scope from `## Project Surfaces`. The surface classification determines which navigation paradigms, layout grids, and archetypes are relevant.

---

## 2. Decision 1 — Navigation paradigm

Present surface-appropriate navigation options based on the confirmed design direction and project surfaces. Present only the options for surfaces in scope (from `vision.md` Project Surfaces). Include tradeoff framing — e.g., sidebar is good for complex apps with deep IA but bad for mobile-first or content-focused sites.

### Web surfaces

- **Sidebar + topnav** — Collapsible sidebar for section nav, top bar for global actions. Good for complex apps with deep IA; competes with content width on small screens.
- **Tab bar (app-style)** — Horizontal tab bar, web app feels like a native app. Limited to 5–7 top-level destinations; unfamiliar on traditional websites.
- **Full-page transitions** — Each section is a full-page view with navigation between pages. Poor for frequent cross-section navigation; high cognitive load for data-heavy apps.
- **Command palette primary** — Keyboard-first navigation with minimal visible chrome. High power-user efficiency; steep learning curve, requires discoverability affordances.
- **Minimal/none** — No persistent navigation; content-first with contextual links. Clean and focused; users may feel lost without orientation cues.

### Mobile surfaces

- **Bottom tab bar** — iOS/Android standard, 3–5 tabs at screen bottom. Limited to 5 top-level destinations; thumb-friendly.
- **Drawer + top header** — Slide-out drawer with a persistent top header bar. Supports many sections; discoverability issues — out of sight, out of mind.
- **Stack navigation only** — Linear forward/back navigation with no persistent tabs. No quick access to unrelated sections; relies on back button.
- **Tab bar + stack hybrid** — Bottom tabs for top-level sections, stack navigation within each tab. Combines discoverability with depth; tab count still limited.

### Desktop (native) surfaces

- **Menu bar + sidebar** — OS-native menu bar with sidebar panel. Platform-specific conventions differ (macOS vs Windows vs Linux).
- **Ribbon (Office-style)** — Grouped toolbar with tabbed ribbon. Heavy initial learning curve; takes vertical space.
- **Panel system** — Draggable/dockable panels with customizable layout. Window management complexity; steep learning curve.
- **Sidebar only** — Vertical sidebar as sole navigation element. No menu bar discoverability for infrequent actions.

> **Decision prompt**: "Which navigation pattern fits your app's usage pattern and audience?"

**Wait for explicit user confirmation before proceeding.**

On confirmation, write the `## Navigation Paradigm` section to `docs/plans/design-system.md` immediately.

---

## 3. Decision 2 — Layout grid

Ask the user about grid structure per breakpoint:

| Breakpoint | Range | Columns | Gutter | Margin |
|------------|-------|---------|--------|--------|
| Mobile | ≤768px | ? | ? | ? |
| Tablet | 769–1024px | ? | ? | ? |
| Desktop | ≥1025px | ? | ? | ? |

Also ask:
- **Max content width**: Fixed maximum (e.g., 1280px, 1440px) or fluid to viewport edge?
- **Grid type**: CSS Grid / Flexbox / Hybrid?
- **Gutter behavior**: Fixed gutter or responsive gutter that scales with viewport?

Provide a **default recommendation** based on the confirmed design direction:
- If direction is information-dense → 12-column, 24px gutter, 1440px max
- If direction is editorial/spacious → 12-column, 32px gutter, 1200px max
- If direction is mobile-first → 4/8/12 column progression, 16px gutter

**Wait for explicit user confirmation before proceeding.**

On confirmation, write the `## Layout Grid` table to `docs/plans/design-system.md`.

---

## 4. Decision 3 — Page archetypes

Based on the feature inventory from `vision.md`, propose a named archetype set. Each archetype defines named layout zones.

### Common archetypes to consider

| Archetype | Description | Typical Layout Zones |
|-----------|-------------|---------------------|
| **Dashboard** | Data overview with cards/charts | Nav zone · Summary strip · Grid/card zone · Detail panel |
| **List → Detail** | Browse items, select to view/edit | Nav zone · Filter bar · List zone · Detail zone |
| **Form** | Multi-step or single-page data entry | Nav zone · Form zone · Action bar |
| **Content/Article** | Long-form reading with optional sidebar | Nav zone · Content zone · Sidebar/TOC zone |
| **Settings** | Tabbed or sectioned preference panels | Nav zone · Section nav · Settings zone |
| **Empty/Onboarding** | First-run or zero-data state | Nav zone · Illustration zone · CTA zone |
| **Auth** | Login/signup/password-reset | Centered card zone · Background zone |
| **Error** | 404/500/offline states | Nav zone · Error illustration zone · Recovery CTA |

For each proposed archetype, produce a simple ASCII wireframe showing layout zones:

```
┌─────────────────────────────────────┐
│              Nav Zone               │
├────────┬────────────────────────────┤
│        │       Summary Strip        │
│  Side  ├────────────────────────────┤
│  bar   │                            │
│  Zone  │       Content Zone         │
│        │                            │
├────────┴────────────────────────────┤
│            Action Bar               │
└─────────────────────────────────────┘
```

Present the proposed archetypes to the user. Ask whether any are missing or should be renamed. **Wait for explicit user confirmation before proceeding.**

On confirmation, write the `## Page Archetypes` section — including wireframes — to `docs/plans/design-system.md`.

---

## 5. Decision 4 — Component hierarchy

Derive the global component list from the confirmed navigation paradigm and page archetypes. Global components are those used across multiple archetypes or present on every page.

### Typical global components

- **Navigation components** — derived from the navigation paradigm (e.g., TopNav, Sidebar, BottomTabBar, Breadcrumb)
- **Layout components** — derived from archetypes (e.g., PageShell, ContentArea, Sidebar, ActionBar)
- **Feedback components** — Loading skeleton, Toast, ErrorBoundary, EmptyState
- **Form primitives** — Input, Select, Checkbox, Radio, TextArea, DatePicker, FileUpload
- **Data display** — Table, Card, Badge, Avatar, Stat, Chart container
- **Overlay components** — Modal, Drawer, Popover, Tooltip, ContextMenu
- **Action components** — Button, IconButton, Link, Dropdown menu

Present the derived list to the user. Ask:
1. Are any components missing?
2. Should any be feature-local instead of global?
3. Are there project-specific components not covered above?

**Wait for explicit user confirmation before proceeding.**

On confirmation, write the `## Global Component Inventory` section to `docs/plans/design-system.md`. This section serves as the **Component Inventory Seed** — all FE specs must consume (not re-invent) these global components.

---

## 6. Decision 5 — Motion language

Present the motion language options:

| Level | Description | Typical Durations | Use When |
|-------|-------------|-------------------|----------|
| **Instant** | No transitions — all state changes are immediate | 0ms | Performance-critical tools, terminal UIs, accessibility-first products |
| **Subtle** | Micro-transitions only — fades and opacity shifts | 100–150ms ease-out | Productivity tools, data-dense dashboards, professional/enterprise apps |
| **Balanced** | Purposeful transitions for navigation and state changes | 150–300ms ease-in-out | Most consumer apps, SaaS products, general-purpose UIs |
| **Rich** | Expressive animations — page transitions, element choreography, spring physics | 200–500ms spring/cubic-bezier | Marketing sites, creative tools, consumer apps where delight matters |

> **Mandatory regardless of level**: All motion must respect `prefers-reduced-motion: reduce`. When reduced motion is active, all animations collapse to instant (0ms) or opacity-only transitions (≤100ms).

Present a recommendation based on the confirmed design direction. **Wait for explicit user confirmation before proceeding.**

On confirmation, write the `## Motion Language` section to `docs/plans/design-system.md`.

---

## 7. Decision 6 — Data density philosophy

Present the data density options:

| Philosophy | Description | Best For | Characteristics |
|------------|-------------|----------|-----------------|
| **Compact** | Maximum information per viewport — tight spacing, smaller text, dense tables | Data-heavy dashboards, admin panels, developer tools | 12–14px body text, 4–8px element spacing, minimal whitespace |
| **Spacious** | Generous whitespace, larger text, breathing room between elements | Consumer apps, marketing, content-focused products | 16–18px body text, 16–24px element spacing, generous padding |
| **Hybrid** | Context-dependent — compact for data tables/lists, spacious for forms/content | Apps mixing data overview with detail editing | Defined rules for when each density applies |

If **Hybrid** is selected, ask the user to define the density rules:
- Which archetypes get compact density?
- Which archetypes get spacious density?
- What is the transition behavior between densities?

**Wait for explicit user confirmation before proceeding.**

On confirmation, write the `## Data Density Philosophy` section to `docs/plans/design-system.md`.

---

## 8. Decision 7 — Global state design language

This is a two-part decision:

### Part A — Loading states

| Option | Description | Best For |
|--------|-------------|----------|
| **Skeleton screens** | Grey placeholder shapes matching the expected layout | Content-heavy pages where layout stability matters |
| **Spinner/shimmer** | Centered spinner or shimmer overlay | Simple actions, modals, inline operations |
| **Progressive** | Skeleton for page-level, spinner for component-level operations | Complex apps with mixed loading contexts |

### Part B — Error, empty, and recovery states

For each state type, present the options:

**Error states**:
- **Inline** — Error message appears near the failed element (forms, field validation)
- **Toast** — Transient notification for non-blocking errors (network retry, background sync)
- **Full-page** — Dedicated error page (404, 500, offline)
- **Error boundary** — Component-level fallback UI (prevents cascade, isolates failure)

**Empty states**:
- **Illustration + copy** — Custom illustration with descriptive text and CTA
- **Minimal** — Text-only with action link
- **Contextual** — Different empty states per archetype (empty dashboard vs. empty list)

**Copy tone for empty states**: Helpful / Playful / Neutral — must align with the confirmed design direction.

Present recommendations based on the confirmed design direction. **Wait for explicit user confirmation before proceeding.**

On confirmation, write the `## Global State Design Language` section to `docs/plans/design-system.md`.

---

## 9. Write and verify design-system.md

After all seven decisions are confirmed, verify that `docs/plans/design-system.md` was written progressively and is complete.

The final document must have this structure:

```markdown
# Design System

> **Confirmed Design Direction**: [confirmed direction from brand-guidelines]
> **Date**: [YYYY-MM-DD]
> **Status**: Locked

## Navigation Paradigm
[Confirmed paradigm with rationale]
[Surface-specific notes if multi-surface project]

## Layout Grid

| Breakpoint | Columns | Gutter | Max Width |
|------------|---------|--------|-----------|
| Mobile (≤768px) | [confirmed] | [confirmed] | [confirmed] |
| Tablet (769–1024px) | [confirmed] | [confirmed] | [confirmed] |
| Desktop (≥1025px) | [confirmed] | [confirmed] | [confirmed] |

**Grid type**: [confirmed]

## Page Archetypes

### [Archetype Name]
**Layout zones**: [nav] | [content] | [sidebar] | [action]
[Optional: ASCII wireframe for additional clarity]

[repeat for each confirmed archetype]

## Global Component Inventory
- `<ComponentName>` — [what it does / what it renders]
- `<ComponentName>` — [what it does / what it renders]
[repeat for each confirmed global component]

## Motion Language
**Style**: [confirmed style — Instant / Subtle / Balanced / Rich]
**Default duration**: [confirmed duration range]
**Default easing**: [confirmed easing function]
**Interaction transitions**: [confirmed interaction transition behavior]
**Reduced-motion policy**: All animations disabled when `prefers-reduced-motion: reduce` is active.

## Data Density Philosophy
**Default density**: [confirmed density — Compact / Spacious / Hybrid]
**Rules**: [when each density applies — per archetype if hybrid]

## Global State Design Language

### Loading States
- **Skeleton screens**: use when [confirmed rule]
- **Spinner/shimmer**: use when [confirmed rule]
- **Progressive**: use when [confirmed rule]

### Error States
- **Inline errors**: use when [confirmed rule — e.g., form field validation]
- **Toast errors**: use when [confirmed rule — e.g., non-blocking network errors]
- **Full-page errors**: use when [confirmed rule — e.g., 404, 500, offline]
- **Error boundaries**: use when [confirmed rule — e.g., component-level isolation]

### Empty States
**Illustration style**: [confirmed style]
**Copy tone**: [confirmed tone — must align with confirmed design direction]
**CTA**: Every empty state MUST include a primary call-to-action that guides the user toward populating the view.
[Per-archetype empty state rules if contextual]
```

Verify:
1. All seven sections are present and filled (no placeholders, no TBDs).
2. The **Global Component Inventory** serves as the Component Inventory Seed — it lists every global component with its category and archetype usage.
3. Every decision references the confirmed design direction for rationale consistency.

If any section is incomplete, loop back to the relevant decision step and resolve with the user.

---

### Propose next step

Design system decisions are locked. Next: Run `/create-prd-architecture` to design the system architecture and data strategy.

> If this shard was invoked standalone (not from `/create-prd`), surface this via `notify_user`.
