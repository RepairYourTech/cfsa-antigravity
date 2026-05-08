---
name: design-direction
description: >
  Design direction interview methodology — SUPERSEDED. The `impeccable` skill's
  `/impeccable teach` command now handles design direction discovery with a more
  comprehensive, multi-round interview that writes PRODUCT.md and DESIGN.md.
  This file is kept for pipeline backward compatibility — all new design work
  should use `/impeccable teach` instead.
triggers:
  - /create-prd-stack (Design Direction axis — delegates to impeccable)
---

# Design Direction — SUPERSEDED by `/impeccable teach`

> **⚠️ This skill is superseded.** The pipeline now uses the `impeccable` skill for all frontend design work. The `/impeccable teach` command provides a more comprehensive design discovery process: it runs a multi-round interview covering users, brand, tone, strategic principles, and visual identity, then writes PRODUCT.md and DESIGN.md files that all other `impeccable` commands consume.
>
> This file is retained for pipeline backward compatibility. When the pipeline triggers design direction discovery, delegate to `/impeccable teach`.

## Delegation Protocol

When this skill is invoked (e.g., during `/create-prd-stack`):

1. Run `/impeccable teach` to gather design context
2. Extract the confirmed design direction, color palette, typography, and motion philosophy from the resulting PRODUCT.md and DESIGN.md
3. Fire bootstrap with the extracted `DESIGN_DIRECTION`, `PRIMARY_COLOR`, `HEADING_FONT`, etc.
4. Do NOT run the legacy constraint questions or option table below

## Legacy Content (Reference Only)

The original design direction interview methodology is preserved below for reference. Do not use it — use `/impeccable teach` instead.

<details>
<summary>Original design-direction methodology (superseded)</summary>

### Constraint Questions

1. What is the emotional tone of the product? (professional/trustworthy, playful/approachable, premium/luxury, raw/technical, editorial/content-first)
2. Who is the primary audience? (developers, consumers, enterprise, creatives, general public)
3. Are there existing brand assets? (logo, colors, fonts)
4. What are the top 2–3 competitors' visual styles?
5. Are there hard constraints? (WCAG AA required, white-label needs, dark mode required, existing brand guidelines)

### Option Table

| Direction | What It Is | Pros | Cons | Best For |
|---|---|---|---|---|
| Minimal/Functional | Clean, whitespace-heavy, typography-led | Timeless, fast, accessible | Can feel cold or generic | SaaS tools, developer products |
| Editorial/Magazine | Strong typographic hierarchy, content-first | Distinctive | Complex to maintain | Media, blogs, knowledge platforms |
| Luxury/Refined | Restrained palette, premium materials feel | High perceived value | Can feel inaccessible | Premium SaaS, fintech |
| Playful/Expressive | Bold color, personality, illustration | Memorable | Can age quickly | Consumer apps, gaming, social |
| Technical/Brutalist | Raw, grid-exposed, monospace, data-dense | Authentic for technical audiences | Polarizing | Dev tools, dashboards |
| Hybrid | Combine elements from two directions | Best of both | Requires design discipline | When constraints pull two ways |

</details>
