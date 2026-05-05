---
name: design-anti-cliche
description: "Universal AI design correction rules. Always active. Prevents the agent from falling into common AI-generated design patterns that produce generic, indistinguishable output. Project-specific brand-guidelines can override any rule here."
---

# Design Anti-Cliché Rules

> **Scope**: These rules apply to ALL design work — ideation, spec writing, design system creation, and implementation. They correct universal AI tendencies, not project-specific preferences.

> **Override**: The `brand-guidelines` skill can override ANY rule below. If the user's confirmed brand direction contradicts a rule here (e.g., purple IS the brand color), `brand-guidelines` takes precedence.

---

## 1. Safe Harbor Forbidden Defaults

AI agents retreat to "safe" patterns from training data. These are **forbidden as defaults** — you may use them only if the user explicitly requests them or the design direction specifically calls for them.

| # | Forbidden Default | Why It's Banned | Use Only When |
|---|---|---|---|
| 1 | **Standard Hero Split** (left text / right image) | Most overused layout in AI output. Every SaaS site looks identical. | User explicitly requests split layout |
| 2 | **Bento Grids** as default landing page layout | Overused since Apple adopted it. Not every page is a dashboard. | Genuinely complex data that benefits from card-based organization |
| 3 | **Mesh / Aurora Gradients** as background decoration | Floating colored blobs scream "AI-generated." | Used purposefully as part of a confirmed design direction |
| 4 | **Glassmorphism** as "premium" indicator | Blur + thin border is the AI's go-to for "modern." It's a cliché. | Confirmed Glass design direction in brand-guidelines |
| 5 | **Fintech Blue / Deep Cyan** default palette | The "safe escape" color for any professional app. Zero personality. | User's industry genuinely warrants trust-signaling blue |
| 6 | **Generic Marketing Copy** | Buzzwords make every product indistinguishable | Never — always write specific, concrete copy |

### Banned Copy Words

Never use these in headlines, hero text, or primary CTAs unless the user's actual product documentation uses them:

`Orchestrate` · `Empower` · `Elevate` · `Seamless` · `Leverage` · `Synergize` · `Unlock` · `Supercharge` · `Game-changing` · `Next-generation` · `Cutting-edge` · `Revolutionary`

**Instead:** Describe what the product actually does in concrete terms. "Send invoices in 30 seconds" beats "Elevate your billing experience."

---

## 2. Purple Ban

Purple, violet, indigo, and magenta are the #1 AI design cliché. They are **banned as primary or brand colors** unless the user explicitly requests them.

### Banned Values

- **Hex codes**: `#8B5CF6`, `#A855F7`, `#9333EA`, `#7C3AED`, `#6D28D9`, `#A78BFA`, `#C4B5FD`, `#DDD6FE`, `#EDE9FE`
- **Tailwind classes**: `purple-*`, `violet-*`, `indigo-*`, `fuchsia-*` as primary/brand colors
- **CSS keywords**: `purple`, `violet`, `indigo`, `fuchsia`, `magenta`, `lavender` as primary/brand colors
- **Purple gradients** of any kind as hero or background treatment

### When Purple IS Allowed

- User explicitly says "I want purple" or "our brand is purple"
- `brand-guidelines` has purple in the confirmed color palette
- Used as a minor accent (not primary, not brand-defining)
- Data visualization where purple is part of a sequential/categorical scale

### Recommended Alternatives

When you'd reflexively reach for purple, try: **Teal**, **Emerald**, **Amber**, **Rose**, **Slate** — or ask the user what palette fits their brand.

---

## 3. Layout Diversification

Break the "Standard Split" habit. When designing hero sections or landing pages, choose from these alternative structures:

| Layout | Description | Best For |
|---|---|---|
| **Massive Typographic Hero** | Headline at 300px+, visual behind or inside the letters | Bold brands, creative agencies |
| **Center-Staggered** | Each element (H1, P, CTA) has different horizontal alignment | Modern, editorial feel |
| **Layered Depth (Z-axis)** | Visuals overlap text, creating depth | Immersive, premium products |
| **Vertical Narrative** | No "above the fold" hero — story starts immediately with flowing fragments | Story-driven, content-first |
| **Extreme Asymmetry (90/10)** | Everything compressed to one edge, 90% negative space | Luxury, high-end, artistic |
| **Full-Bleed Media** | Image/video fills the entire viewport, text overlaid | Photography, portfolio, lifestyle |

> **Rule:** If you're about to use "left text / right image," stop. Pick one of the above or invent something new.

---

## 4. UI Library Default Ban

Never automatically use a component library without asking the user. These are AI favorites from training data, not the user's choice:

- ❌ shadcn/ui (overused AI default)
- ❌ Radix UI (AI favorite for "accessible" claim)
- ❌ Chakra UI (common AI fallback)
- ❌ Material UI / MUI (generic corporate look)

**Always ask:** "Which UI approach do you prefer?" and offer options:
1. Pure CSS / Tailwind — custom components, no library
2. shadcn/ui — if the user explicitly wants it
3. Headless UI — unstyled, accessible primitives
4. Radix — if the user explicitly wants it
5. Custom components — maximum control
6. Other — the user's choice

---

## 5. Corner Radius Rule

The "safe boredom zone" of `4px–8px` (`rounded-md`) is the AI default for everything. It produces visually indistinct interfaces.

**Rule:** Make a deliberate choice. Don't sit in the middle.

| Intent | Radius | Examples |
|---|---|---|
| **Sharp / Technical / Luxury** | `0px–2px` | Brutalist, minimalist, professional |
| **Balanced / Modern** | `8px–12px` | SaaS dashboards, productivity tools |
| **Soft / Friendly / Playful** | `16px–32px` | Social apps, lifestyle, consumer |
| **Pill / Expressive** | `9999px` / `full` | Tags, badges, feature cards |

> The chosen radius should be consistent across the design system — don't mix sharp cards with pill buttons unless the design direction explicitly calls for contrast.

---

## 6. Maestro Self-Check

Before delivering any design work (specs, mockups, or implementations), answer these questions internally. If any answer is "yes" to the bad pattern, revise before presenting.

| # | Question | Bad Answer |
|---|---|---|
| 1 | Does this look like something an AI would generate? | Yes → revise |
| 2 | Could I swap the brand name and this would fit any other product? | Yes → not specific enough |
| 3 | Am I using purple/indigo because it "feels modern"? | Yes → Purple Ban violation |
| 4 | Is the layout "left text / right image" or a bento grid? | Yes without explicit request → Safe Harbor violation |
| 5 | Would a designer at a top agency present this to a client? | No → raise the bar |
| 6 | Is every animation serving a purpose, or just decoration? | Decoration → remove it |

---

## 7. Modern Cliché Scan

Run this scan before committing to any design approach:

```
🔍 CLICHÉ SCAN:
├── Am I defaulting to "Left Text / Right Visual"? → BETRAY IT
├── Am I using Bento Grids to organize content safely? → BREAK THE GRID
├── Am I using "safe" SaaS fonts and color pairs? → DISRUPT THE PALETTE
├── Am I using purple/indigo because it "feels techy"? → REPLACE IT
├── Am I writing "Empower your team" copy? → WRITE SOMETHING REAL
└── Will I remember this design in a year? → If no, push harder
```

---

## 8. Override Protocol

These rules are **universal defaults**. They can be overridden by:

1. **`brand-guidelines` skill** — If the confirmed design direction uses a forbidden element (purple brand, glassmorphism direction, etc.), the brand guideline takes precedence
2. **Explicit user request** — If the user says "I want a bento grid layout," use it
3. **Design reference data** — If the searchable design database returns a style that uses a forbidden element and the user confirms it, use it

**Override hierarchy:** User request > brand-guidelines > design-anti-cliche defaults

When overriding, acknowledge the override:
```
Using glassmorphism per confirmed "Glass" design direction — 
anti-cliché default overridden by brand-guidelines.
```
