---
name: design-direction
description: >
  Design direction interview methodology — constraint-first discovery of visual
  direction for web, desktop, and mobile surfaces. Covers 5 constraint questions,
  6 direction options, and CLI-surface variant.
triggers:
  - /create-prd-stack (Design Direction axis)
---

# Design Direction

Constraint-first discovery of visual direction for all visual surfaces (web, desktop, mobile). For CLI-only projects, use the CLI variant at the end.

## Constraint Questions

Ask these five questions first:

1. What is the emotional tone of the product? (professional/trustworthy, playful/approachable, premium/luxury, raw/technical, editorial/content-first)
2. Who is the primary audience? (developers, consumers, enterprise, creatives, general public)
3. Are there existing brand assets? (logo, colors, fonts — if yes, the direction must work within them)
4. What are the top 2–3 competitors' visual styles?
5. Are there hard constraints? (WCAG AA required, white-label needs, dark mode required, existing brand guidelines)

## Option Table

Present 5 options + Hybrid:

| Direction | What It Is | Pros | Cons | Best For |
|---|---|---|---|---|
| Minimal/Functional | Clean, whitespace-heavy, typography-led | Timeless, fast, accessible | Can feel cold or generic | SaaS tools, developer products |
| Editorial/Magazine | Strong typographic hierarchy, content-first | Distinctive, great for content-heavy products | Complex to maintain | Media, blogs, knowledge platforms |
| Luxury/Refined | Restrained palette, premium materials feel, subtle motion | High perceived value | Can feel inaccessible | Premium SaaS, fintech, professional services |
| Playful/Expressive | Bold color, personality, illustration, animation | Memorable, high engagement | Can age quickly | Consumer apps, gaming, social |
| Technical/Brutalist | Raw, grid-exposed, monospace, data-dense | Authentic for technical audiences | Polarizing | Dev tools, dashboards, data products |
| Hybrid | Combine elements from two directions | Best of both | Requires design discipline | When constraints pull in two directions |

## Per-Axis Flow

1. Ask constraint questions
2. Present filtered option table with recommendation based on constraints
3. Wait for user confirmation
4. Fire bootstrap with `DESIGN_DIRECTION=[confirmed direction]`

> **CLI surfaces**: For CLI-only projects, replace the visual direction options with CLI-appropriate ones: output verbosity philosophy (terse vs. informative), color usage (minimal/semantic vs. rich), information density (compact vs. spacious), personality (friendly vs. utilitarian).
