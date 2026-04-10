---
name: setup-fill-placeholders
description: Fill {{PLACEHOLDER}} values in Surface Stack Map, instructions, rules, and root config files
parameters:
  - name: values
    type: object
    required: true
    description: Key-value pairs of placeholders to fill (e.g., {"PROJECT_NAME": "MyApp", "DATABASE": "supabase"})
  - name: surface
    type: string
    required: false
    description: Surface name for Per-Surface table updates (omit for global/cross-cutting)
  - name: column
    type: string
    required: false
    description: Column name in Per-Surface table (e.g., "Databases", "FE Frameworks")
---

## Overview

This skill surgically fills `{{PLACEHOLDER}}` values across the Claude Code kit. It is idempotent — already-filled placeholders are not overwritten, and new values are only applied where explicitly provided.

Equivalent to Antigravity's `bootstrap-agents-fill.md` shard 1.

## Principles

1. **Surgical** — Only fill placeholders for keys explicitly provided
2. **Idempotent** — Already-filled values are not touched
3. **Append-mode** — For table cells, new values are appended to existing (comma-separated)
4. **Never-destructive** — No placeholder is cleared without a replacement

## Step-by-Step

### Step 1 — Classify Incoming Values

For each key-value pair in the input `values`, classify it:

| Key Pattern | Target |
|------------|--------|
| `PROJECT_NAME`, `DESCRIPTION`, `TECH_STACK_SUMMARY`, `SURFACES`, `ARCHITECTURE_DOC` | Global Settings table |
| `AUTH`, `CI_CD`, `HOSTING`, `SECURITY`, `API_DESIGN`, `ACCESSIBILITY`, `CONTRACT_LIBRARY` | Cross-Cutting Skills table |
| `CONTRACT_LIBRARY` (also fills `.factory/skills/tdd-contract-first/SKILL.md`) | Rule templates |
| `VALIDATION_COMMAND` | `.factory/instructions/commands.md`, root configs |
| `FRAMEWORK_PATTERNS` | `.factory/instructions/patterns.md` |
| `PROJECT_STRUCTURE`, `ARCHITECTURE_TABLE` | `.factory/instructions/structure.md` |
| Surface + column (e.g., `web→Databases=supabase`) | Per-Surface Skills table |
| `INSTALLED_SKILLS` | tech-stack.md, root configs |

### Step 2 — Fill Per-Surface Skills Table

**Target**: `.factory/instructions/tech-stack.md`

For each surface + column combination:

1. **Row exists, cell has value** → Append new value with `, ` separator if not already present
   - Example: cell `supabase` + new `surrealdb` → `supabase, surrealdb`
2. **Row exists, cell is `—`** → Replace with new value
3. **Row exists, cell is `⚠️...`** → Replace with new value
4. **Row doesn't exist** → Add new row, fill provided columns, use `—` for others

**Example table manipulation:**
```markdown
Before:
| Surface | Databases | ORMs |
|---------|-----------|------|
| web | supabase | drizzle |

After adding web→Databases=surrealdb:
| Surface | Databases | ORMs |
|---------|-----------|------|
| web | supabase, surrealdb | drizzle |
```

### Step 3 — Fill Cross-Cutting Skills Table

**Target**: `.factory/instructions/tech-stack.md` → Cross-Cutting Skills table

For each cross-cutting key:
1. **Category exists with value** → Append (skip duplicates)
2. **Category exists, empty/placeholder** → Set value
3. **Category doesn't exist** → Add new row

### Step 4 — Fill Global Settings Table

**Target**: `.factory/instructions/tech-stack.md` → Global Settings table

Direct replacement for each key. If key is already filled with a different value, warn the user before overwriting.

### Step 5 — Fill Instruction Templates

For each instruction template:

**`.factory/instructions/commands.md`:**
```markdown
## [Surface] Commands

| Command | Value |
|---------|-------|
| Package Manager | [from map] |
| Dev | [from map] |
| Test | [from map] |
| Lint | [from map] |
| Build | [from map] |
| Validation | [from map] |
```

Single-surface → flat table, no surface header.

**`.factory/instructions/workflow.md`:**
- Fill `{{VALIDATION_COMMAND}}` with primary surface's validation command

**`.factory/instructions/patterns.md`:**
- Replace `{{FRAMEWORK_PATTERNS}}` if provided

**`.factory/instructions/structure.md`:**
- Replace `{{PROJECT_STRUCTURE}}`, `{{ARCHITECTURE_TABLE}}` if provided

### Step 6 — Fill Rule Templates

Scan `.factory/skills/*/SKILL.md` for `{{PLACEHOLDER}}` values:
- `tdd-contract-first.md` → `{{CONTRACT_LIBRARY}}`
- `security-first.md` → `{{CONTRACT_LIBRARY}}`

Replace each with the resolved value.

### Step 7 — Fill Root Agent Config Files

If `AGENTS.md` and `GEMINI.md` exist at project root, replace in both:
- `{{PROJECT_NAME}}`
- `{{DESCRIPTION}}`
- `{{TECH_STACK_SUMMARY}}`
- `{{VALIDATION_COMMAND}}`
- `{{ARCHITECTURE_DOC}}`
- `{{CONTRACT_LIBRARY}}`
- `{{INSTALLED_SKILLS}}` (if provided)

Keep both files in sync.

### Step 8 — Fill Skill Templates

Scan all `.factory/skills/*/SKILL.md` for `{{PLACEHOLDER}}` values and fill matches:

| Placeholder | Found In |
|------------|----------|
| `{{VALIDATION_COMMAND}}` | fix-bug, main-workflow, deploy, refactor |
| `{{PACKAGE_MANAGER}}` | refactor, security-audit |
| `{{TEST_COVERAGE_COMMAND}}` | refactor |
| `{{BUILD_COMMAND}}` | deploy |
| `{{DEPLOY_COMMAND}}` | deploy |
| `{{BUILD_OUTPUT_DIR}}` | deploy |

### Step 9 — Report Results

Return:
```markdown
## Placeholder Fill Results

### Map Cells Filled
- Per-Surface: web→Databases = "supabase, surrealdb"
- Cross-Cutting: Auth = "lucia-auth"

### Instruction Templates Updated
- commands.md: Added web commands section
- workflow.md: Filled validation command

### Rule Templates Updated
- tdd-contract-first.md: Filled contract library = "zod"

### Remaining Placeholders
- tech-stack.md: {{SURFACE_ROW}} (no surfaces confirmed yet)
- tech-stack.md: {{INSTALLED_SKILLS}} (pending provision step)

### Warnings
- None
```

## Idempotency Contract

| Scenario | Behavior |
|----------|----------|
| Placeholder already filled with same value | No-op, skip silently |
| Placeholder already filled with different value | Warn user, ask before overwriting |
| Placeholder is `{{PLACEHOLDER}}` | Fill with value |
| Placeholder is `—` | Replace with value |
| Key not provided | Leave as-is, no warning |
| Table cell already has value, same key appended | Skip duplicate |

## See Also

- `setup-cfsa.md` — Main setup that calls this skill
- `setup-provision-skills.md` — Skill provisioning (fires after fill)
- `resolve-skill.md` — 4-tier skill resolution
