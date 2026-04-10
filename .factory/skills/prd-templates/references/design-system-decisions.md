# Design System Decision Options & Output Template

Reference material for the `/create-prd-design-system` workflow. Contains option menus for all seven decisions and the canonical output template for `docs/plans/design-system.md`.

---

## Navigation Paradigm Options

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

---

## Page Archetype Options

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

### Example wireframe (Dashboard archetype)

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

---

## Global Component Categories

- **Navigation components** — derived from the navigation paradigm (e.g., TopNav, Sidebar, BottomTabBar, Breadcrumb)
- **Layout components** — derived from archetypes (e.g., PageShell, ContentArea, Sidebar, ActionBar)
- **Feedback components** — Loading skeleton, Toast, ErrorBoundary, EmptyState
- **Form primitives** — Input, Select, Checkbox, Radio, TextArea, DatePicker, FileUpload
- **Data display** — Table, Card, Badge, Avatar, Stat, Chart container
- **Overlay components** — Modal, Drawer, Popover, Tooltip, ContextMenu
- **Action components** — Button, IconButton, Link, Dropdown menu

---

## Motion Language Options

| Level | Description | Typical Durations | Use When |
|-------|-------------|-------------------|----------|
| **Instant** | No transitions — all state changes are immediate | 0ms | Performance-critical tools, terminal UIs, accessibility-first products |
| **Subtle** | Micro-transitions only — fades and opacity shifts | 100–150ms ease-out | Productivity tools, data-dense dashboards, professional/enterprise apps |
| **Balanced** | Purposeful transitions for navigation and state changes | 150–300ms ease-in-out | Most consumer apps, SaaS products, general-purpose UIs |
| **Rich** | Expressive animations — page transitions, element choreography, spring physics | 200–500ms spring/cubic-bezier | Marketing sites, creative tools, consumer apps where delight matters |

> **Mandatory regardless of level**: All motion must respect `prefers-reduced-motion: reduce`. When reduced motion is active, all animations collapse to instant (0ms) or opacity-only transitions (≤100ms).

---

## Data Density Options

| Philosophy | Description | Best For | Characteristics |
|------------|-------------|----------|-----------------|
| **Compact** | Maximum information per viewport — tight spacing, smaller text, dense tables | Data-heavy dashboards, admin panels, developer tools | 12–14px body text, 4–8px element spacing, minimal whitespace |
| **Spacious** | Generous whitespace, larger text, breathing room between elements | Consumer apps, marketing, content-focused products | 16–18px body text, 16–24px element spacing, generous padding |
| **Hybrid** | Context-dependent — compact for data tables/lists, spacious for forms/content | Apps mixing data overview with detail editing | Defined rules for when each density applies |

If **Hybrid** is selected, ask the user to define the density rules:
- Which archetypes get compact density?
- Which archetypes get spacious density?
- What is the transition behavior between densities?

---

## Global State Design Language Options

### Loading states

| Option | Description | Best For |
|--------|-------------|----------|
| **Skeleton screens** | Grey placeholder shapes matching the expected layout | Content-heavy pages where layout stability matters |
| **Spinner/shimmer** | Centered spinner or shimmer overlay | Simple actions, modals, inline operations |
| **Progressive** | Skeleton for page-level, spinner for component-level operations | Complex apps with mixed loading contexts |

### Error states

- **Inline** — Error message appears near the failed element (forms, field validation)
- **Toast** — Transient notification for non-blocking errors (network retry, background sync)
- **Full-page** — Dedicated error page (404, 500, offline)
- **Error boundary** — Component-level fallback UI (prevents cascade, isolates failure)

### Empty states

- **Illustration + copy** — Custom illustration with descriptive text and CTA
- **Minimal** — Text-only with action link
- **Contextual** — Different empty states per archetype (empty dashboard vs. empty list)

**Copy tone**: Helpful / Playful / Neutral — must align with the confirmed design direction.

---

## design-system.md Output Template

The final `docs/plans/design-system.md` must have this exact structure:

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
