---
name: brand-guidelines
description: "Apply the confirmed design direction to all visual surfaces. If `{{DESIGN_DIRECTION}}` still appears as a literal placeholder, the design direction has not been confirmed — run `/create-prd` first."
---

# {{PROJECT_NAME}} Brand Guidelines

> **Status**: {{#if DESIGN_DIRECTION}}Active{{else}}⚠️ UNFILLED — Run /create-prd to confirm design direction before using this skill{{/if}}

## Design Direction

- **Confirmed direction**: {{DESIGN_DIRECTION}}
- **Rationale**: {{DESIGN_DIRECTION_RATIONALE}}
- **Primary audience**: {{DESIGN_AUDIENCE}}

## Color Palette

| Role | Value | Usage |
|------|-------|-------|
| Primary | {{PRIMARY_COLOR}} | Main brand color — buttons, links, key UI elements |
| Secondary | {{SECONDARY_COLOR}} | Supporting color — secondary actions, accents |
| Accent | {{ACCENT_COLOR}} | Highlight color — notifications, badges, emphasis |
| Background | {{BACKGROUND_COLOR}} | Page/app background |
| Text | {{TEXT_COLOR}} | Primary text color |

## Typography

| Role | Font | Usage |
|------|------|-------|
| Heading | {{HEADING_FONT}} | Page titles, section headers, display text |
| Body | {{BODY_FONT}} | Paragraphs, descriptions, UI labels |
| Mono | {{MONO_FONT}} | Code blocks, terminal output, technical values |

## Motion Philosophy

{{MOTION_PHILOSOPHY}}

## Existing Brand Assets

{{EXISTING_BRAND_ASSETS}}

## What to Avoid

{{DESIGN_AVOID}}
