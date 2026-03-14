---
name: design-reference-data
description: "Searchable reference database of 58 design styles, color palettes, typography pairings, chart styles, and UX patterns. Use during /create-prd-design-system to provide data-backed design recommendations after the direction interview."
---

# Design Reference Database

> **When to use:** During `/create-prd-design-system`, after the user has selected a design direction via the `design-direction` skill. Query this database to ground your design system recommendations in concrete, researched data rather than relying on training data defaults.

## What This Skill Contains

### Data Files (`data/`)

| File | Records | What It Contains |
|---|---|---|
| `styles.csv` | 58 | Design styles with colors, effects, accessibility, framework compat, complexity, best-for/don't-use-for |
| `colors.csv` | — | Color palettes organized by mood, industry, and design style |
| `typography.csv` | — | Font pairings by style category with usage guidance |
| `charts.csv` | — | Chart and data visualization style patterns |
| `ux-guidelines.csv` | — | UX patterns and interaction design reference |
| `landing.csv` | — | Landing page design patterns and conversion strategies |

### Search Scripts (`scripts/`)

| Script | Purpose |
|---|---|
| `search.py` | CLI entry point — accepts queries, routes to core |
| `core.py` | BM25 search engine — loads CSVs, scores matches |
| `design_system.py` | Generates complete design system recommendations from search results |

## Pipeline Integration

### When in the Pipeline

```
/create-prd-design-system
  ├── Step 1: design-direction interview (5 questions)
  ├── Step 2: User picks direction
  ├── ★ Step 3: Query this database ← YOU ARE HERE
  ├── Step 4: brand-guidelines locks with data-backed values
  └── Step 5: design-system.md output
```

### How to Use

After the user confirms their design direction, run these searches to get concrete reference data:

#### 1. Find matching design styles

```bash
python .agent/skills/design-reference-data/scripts/search.py \
  "<direction + project context>" \
  --domain style --max-results 5
```

Example: `"modern dark mode SaaS dashboard"` or `"warm friendly wellness app"`

#### 2. Find specific color palettes

```bash
python .agent/skills/design-reference-data/scripts/search.py \
  "<mood + industry>" \
  --domain color --max-results 3
```

Example: `"professional trust-building fintech"` or `"vibrant playful consumer"`

#### 3. Find typography pairings

```bash
python .agent/skills/design-reference-data/scripts/search.py \
  "<style + readability needs>" \
  --domain typography --max-results 3
```

Example: `"clean serif editorial"` or `"modern sans-serif technical"`

#### 4. Generate full design system recommendation

```bash
python .agent/skills/design-reference-data/scripts/search.py \
  "<project description>" \
  --design-system -p "ProjectName"
```

This returns a comprehensive recommendation covering style, colors, typography, and effects.

### Using the Results

Search results include:
- **Primary/Secondary Colors** — exact hex values
- **Effects & Animation** — specific CSS patterns and timing recommendations
- **Best For / Don't Use For** — context-appropriate usage guidance
- **Framework Compatibility** — scores for Tailwind, Bootstrap, MUI, etc.
- **Accessibility Rating** — WCAG compliance level
- **Performance Rating** — render cost assessment
- **Complexity** — Low/Medium/High implementation effort

Feed these results into the `brand-guidelines` skill to lock specific, researched values instead of AI-generated guesses.

## Important Notes

- **This is a reference, not a mandate.** The user's design direction (from `design-direction` skill) always takes priority. Use this data to provide concrete options within their chosen direction.
- **Cross-reference with `design-anti-cliche`** — if search results return a style that matches a Safe Harbor forbidden default (e.g., glassmorphism), note the conflict and present alternatives.
- **The database is curated, not exhaustive.** If the user's vision doesn't map to any style here, don't force-fit. Use the data as inspiration, not constraint.
