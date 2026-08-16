# Accessibility Specification Checklist

> Part of [Accessibility](../SKILL.md) — use this checklist when writing accessibility specifications during IA spec design (Step 5.5 of `/write-architecture-spec-design`).

**Invoked by**: `/write-architecture-spec-design` Step 5.5

**Prerequisites**:
- `{{SURFACES}}` must be filled (determines applicability)
- User interactions must be documented (Step 2 of the workflow)

## Applicability

**Visual surfaces** (`web`, `mobile`, `desktop`): Follow the full checklist below.

**Non-visual surfaces** (`api`, `cli`, `extension` only): Write `"Not applicable — no visual surfaces"` in the `## Accessibility` section and skip.

## Per-Interaction Checklist

For each user interaction documented in the spec's `## User Interactions` section, document:

| Dimension | What to Document | Notes |
|-----------|-----------------|-------|
| **Keyboard navigation** | Tab order and focus management | How does the user complete this flow without a mouse? |
| **Screen reader semantics** | ARIA roles, labels, live regions | What announcements does a screen reader make at each step? |
| **Color contrast** | Requirements for visual states | Loading, error, empty, disabled — each needs contrast compliance |
| **Motion** | `prefers-reduced-motion` implications | Which animations/transitions need a reduced-motion alternative? |
| **Touch targets** | Minimum 44×44 px | Mobile surfaces only |

## Review Questions

Use these to validate the spec with the user:

1. "Any interactions in this domain that could be problematic for keyboard-only users?"
2. "Visual states (loading, error, empty, disabled) that need specific ARIA announcements?"
3. (Mobile only) "Do any touch targets fall below the 44×44 px minimum?"
