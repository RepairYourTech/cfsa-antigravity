---
name: brand-guidelines
description: "Apply the confirmed design direction to all visual surfaces. This skill now bridges the pipeline's placeholder system with the `impeccable` skill's PRODUCT.md and DESIGN.md files. If `{{DESIGN_DIRECTION}}` still appears as a literal placeholder, run `/impeccable teach` to establish design context."
---

# {{PROJECT_NAME}} Brand Guidelines

> **Status**: {{#if DESIGN_DIRECTION}}Active{{else}}⚠️ UNFILLED — Run `/impeccable teach` to establish design direction before using this skill{{/if}}
>
> **Bridge mode**: This file now reads from the `impeccable` skill's context files. When `PRODUCT.md` and `DESIGN.md` exist at the project root (written by `/impeccable teach` and `/impeccable document`), values from those files take precedence over the placeholder slots below. Run `node .agents/skills/impeccable/scripts/load-context.mjs` to load the current design context.

## Design Direction

- **Confirmed direction**: {{DESIGN_DIRECTION}}
- **Rationale**: {{DESIGN_DIRECTION_RATIONALE}}
- **Primary audience**: {{DESIGN_AUDIENCE}}

> When `PRODUCT.md` exists, extract direction/audience from its Users and Product Purpose sections.

## Color Palette

| Role | Value | Usage |
|------|-------|-------|
| Primary | {{PRIMARY_COLOR}} | Main brand color — buttons, links, key UI elements |
| Secondary | {{SECONDARY_COLOR}} | Supporting color — secondary actions, accents |
| Accent | {{ACCENT_COLOR}} | Highlight color — notifications, badges, emphasis |
| Background | {{BACKGROUND_COLOR}} | Page/app background |
| Text | {{TEXT_COLOR}} | Primary text color |

> When `DESIGN.md` exists, extract colors from its Colors section (OKLCH or hex).

## Typography

| Role | Font | Usage |
|------|------|-------|
| Heading | {{HEADING_FONT}} | Page titles, section headers, display text |
| Body | {{BODY_FONT}} | Paragraphs, descriptions, UI labels |
| Mono | {{MONO_FONT}} | Code blocks, terminal output, technical values |

> When `DESIGN.md` exists, extract fonts from its Typography section.

## Motion Philosophy

{{MOTION_PHILOSOPHY}}

> When `DESIGN.md` exists, extract motion philosophy from its Motion section.

## Existing Brand Assets

{{EXISTING_BRAND_ASSETS}}

## What to Avoid

{{DESIGN_AVOID}}

> The `impeccable` skill's anti-pattern rules (27 deterministic + 12 LLM critique) automatically apply. No need to duplicate them here.
