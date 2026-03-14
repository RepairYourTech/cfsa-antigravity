---
name: frontend-verification
description: "Automated UX audit scanner with 75+ design quality checks. Runs as a gate during /implement-slice (per-slice) and /validate-phase (full scan). Covers psychology laws, typography, visual effects, color systems, animation, motion graphics, and accessibility."
---

# Frontend Verification (UX Audit Gate)

> **When to use:** Automatically during frontend implementation. This skill provides a **blocking gate** — issues must be resolved before proceeding.

## What This Skill Contains

### Audit Script (`scripts/ux_audit.py`)

A 750-line Python scanner with 75+ automated checks across 11 categories:

| Category | Checks | Examples |
|---|---|---|
| Psychology Laws | 5 | Hick's Law (nav items), Fitts' Law (target sizes), Miller's Law (form fields) |
| Emotional Design | 3 | Visceral appeal, behavioral feedback, reflective identity |
| Trust Building | 3 | Security signals, social proof, authority indicators |
| Cognitive Load | 3 | Progressive disclosure, visual noise, familiar patterns |
| Persuasive Design | 4 | Smart defaults, anchoring, social proof numbers, progress indicators |
| Typography System | 9 | Font pairing, line length, line height, letter spacing, weight contrast |
| Visual Effects | 10 | Glassmorphism, neomorphism, shadow hierarchy, gradients, overlays |
| Color System | 6 | 60-30-10 rule, dark mode, WCAG contrast, color psychology |
| Animation Guide | 6 | Duration, easing, micro-interactions, loading states |
| Motion Graphics | 7 | Lottie, GSAP memory leaks, 3D transforms, scroll animations |
| Accessibility | 3 | Alt text, reduced motion, form labels |

> **Note:** Purple Ban is handled by the `design-anti-cliche` core skill, not this scanner.

## Pipeline Integration — TWO Gate Points

### Gate 1: Per-Slice (during `/implement-slice-tdd`)

After implementing a frontend slice, run the audit on **changed files only**:

```bash
python .agent/skills/frontend-verification/scripts/ux_audit.py src/components/NewFeature/ --json
```

**Exit codes:**
- `0` = PASS — proceed to next step
- `1` = ISSUES — **must fix before proceeding** (blocking gate)
- `2` = WARNINGS — review, fix if reasonable, proceed if justified

For slice-level scans, you may skip categories unrelated to the current work:

```bash
python .agent/skills/frontend-verification/scripts/ux_audit.py src/components/Chart/ \
  --skip-psychology --skip-typography
```

### Gate 2: Full Scan (during `/validate-phase`)

At phase validation, run the audit on the **entire frontend source**:

```bash
python .agent/skills/frontend-verification/scripts/ux_audit.py src/ --json
```

**Validation threshold:**
- Zero issues required (exit code `0`)
- All warnings must be reviewed — document any intentional suppressions

## CLI Reference

```
usage: ux_audit.py [-h] [--json] [--skip-psychology] [--skip-typography]
                   [--skip-visual] [--skip-color] [--skip-animation]
                   [--skip-motion] [--skip-accessibility] path

positional arguments:
  path                   File or directory to audit

options:
  --json                 Output as JSON
  --skip-psychology      Skip psychology law checks
  --skip-typography      Skip typography checks
  --skip-visual          Skip visual effects checks
  --skip-color           Skip color system checks
  --skip-animation       Skip animation checks
  --skip-motion          Skip motion graphics checks
  --skip-accessibility   Skip accessibility checks
```

## File Extensions Scanned

`.tsx`, `.jsx`, `.html`, `.vue`, `.svelte`, `.css`

## Directories Excluded

`node_modules`, `.git`, `dist`, `build`, `.next`

## JSON Report Format

```json
{
  "files_checked": 12,
  "issues": ["[Hick's Law] Navbar.tsx: 9 nav items (Max 7)"],
  "warnings": ["[Typography] Hero.tsx: No line length constraint"],
  "passed_checks": 8,
  "compliant": false
}
```

## Important Notes

- **This is a gate, not advisory.** Exit code `1` (issues) blocks the pipeline.
- **Warnings are not blockers** but must be reviewed and justified if not fixed.
- **Category skipping** is allowed for per-slice scans to reduce noise, but the full-scan gate at `/validate-phase` must run all categories.
