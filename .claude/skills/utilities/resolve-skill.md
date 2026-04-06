---
name: resolve-skill
description: Dynamic skill resolution using 4-tier chain (exact match → partial match → external discovery → human escalation)
parameters:
  - name: surface
    type: string
    required: true
    description: The surface to resolve skills for (e.g., "web", "api", "mobile")
  - name: category
    type: string
    required: true
    description: The skill category to resolve (e.g., "Languages", "Databases", "Unit Tests")
  - name: cross_cutting
    type: boolean
    required: false
    description: If true, resolve from Cross-Cutting Skills table instead of Per-Surface
---

## Overview

The resolve-skill utility implements CFSA's 4-tier skill resolution chain, ensuring that workflows can dynamically load skills based on the Surface Stack Map while maintaining fallback options for missing or incomplete skill definitions.

## Prerequisites

1. `.claude/instructions/tech-stack.md` must exist and be populated
2. Surface Stack Map must have at least one row
3. For Per-Surface resolution: surface must exist in the table
4. For Cross-Cutting resolution: category must exist in the Cross-Cutting table

## Step-by-Step

### Step 1 — Read Surface Stack Map

1. Open `.claude/instructions/tech-stack.md`
2. Parse the Per-Surface Skills table OR Cross-Cutting Skills table based on `cross_cutting` parameter
3. Locate the row for the specified surface (Per-Surface) or category (Cross-Cutting)
4. Extract the comma-separated skill list from the specified column

**Example extraction:**
```markdown
Surface: web
Category: Databases
Result: "supabase, surrealdb, pglite"
```

### Step 2 — 4-Tier Resolution Chain

For each skill in the comma-separated list, attempt resolution through each tier:

#### Tier 1: Exact Match

**Check**: Does `.claude/skills/{skill-name}/SKILL.md` exist?

- **Yes**: Load the skill, add to resolved list, proceed to next skill
- **No**: Proceed to Tier 2

#### Tier 2: Partial Match + Adequacy Check

**Check**: Does any skill in `.claude/skills/` partially match the name?

**Partial match criteria:**
- Name contains the skill name as a substring (case-insensitive)
- OR skill name tags/include the required category in its SKILL.md frontmatter

**Adequacy check:**
- Read the matched skill's SKILL.md
- Verify `category` field matches the requested category
- Verify `surface` field (if present) includes the requested surface

- **Pass**: Load the skill, add to resolved list with warning
- **Fail**: Proceed to Tier 3

#### Tier 3: External Discovery

**Check**: Can the skill be found in external sources?

**Discovery sources (in order):**
1. `.claude/skill-library/` — Check if skill template exists in library
2. Community skills — Search for skill in community repositories (if external search is enabled)
3. Framework documentation — Check if framework/docs provide skill definitions

**If found in skill-library:**
- Prompt user: "Found '{skill}' in skill library. Install and provision?"
- If yes: Call `setup-provision-skills` to install, then proceed to Tier 1
- If no: Proceed to Tier 4

#### Tier 4: Human Escalation

**All previous tiers failed — escalate to human with options.**

**Present to user:**
```
Skill '{skill}' for surface '{surface}', category '{category}' could not be resolved.

Options:
1. Provide a custom skill path — I'll use your skill file
2. Skip this skill — I'll proceed without it (may limit functionality)
3. Create a stub skill — I'll generate a basic skill template for you to customize
4. Choose an alternative — I'll show you available skills in this category

Which option would you like? (1-4)
```

**Handle user choice:**
- **Option 1**: Accept path, verify SKILL.md exists, load skill
- **Option 2**: Add to `missing` list in output, continue
- **Option 3**: Generate stub skill at `.claude/skills/{skill}/SKILL.md`, load it
- **Option 4**: List available skills, let user choose, restart resolution

### Step 3 — Return Resolution Result

After processing all skills in the comma-separated list, return:

```json
{
  "resolved": [
    ".claude/skills/supabase/SKILL.md",
    ".claude/skills/surrealdb/SKILL.md"
  ],
  "missing": ["pglite"],
  "warnings": [
    "Partial match found for 'surrealdb' — using 'surrealdb-postgres' instead",
    "Skill 'pglite' not found, skipped by user request"
  ],
  "surface": "web",
  "category": "Databases"
}
```

## Resolution Table

| Tier | Check | Success Action | Failure Action |
|------|-------|----------------|----------------|
| 1 | Exact path match exists | Load skill, continue | Proceed to Tier 2 |
| 2 | Partial match + adequate | Load with warning, continue | Proceed to Tier 3 |
| 3 | Found in skill-library | Offer to install | Proceed to Tier 4 |
| 4 | Human escalation | Present options, wait for choice | Block (requires user input) |

## Integration with Workflows

Workflows should call this utility via the Skill tool:

```
Call skill: `utilities/resolve-skill`
- Input: {surface: "web", category: "Databases"}
- Output: Use returned skill paths to load skills for current task
```

**Example workflow integration:**
```markdown
## workflow-write-be-spec.md

### Step 1 — Load Database Skills

Call skill: `utilities/resolve-skill`
- surface: web (from shard directory path)
- category: Databases

For each resolved skill:
1. Read SKILL.md
2. Extract database schema patterns
3. Apply to BE spec generation
```

## Error Handling

| Error Scenario | Handling |
|----------------|----------|
| Surface Stack Map missing | Fail with clear error — run setup-cfsa first |
| Surface not found in table | Fail with clear error — invalid surface |
| Category column empty | Return empty resolved list (not an error) |
| All tiers fail | Block on Tier 4 — human must decide |
| User cancels during Tier 4 | Add to missing list, continue with other skills |

## Completion Checklist

- [ ] Surface Stack Map read successfully
- [ ] All skills processed through 4-tier chain
- [ ] Resolution result returned with resolved/missing/warnings
- [ ] User informed of any warnings or missing skills
- [ ] Workflow can proceed with resolved skills

## Next Steps

After resolving skills:
- Load each resolved skill's SKILL.md
- Extract relevant patterns and commands
- Apply to current workflow task
- If critical skills are missing, prompt user to complete setup

## See Also

- `.claude/instructions/tech-stack.md` — Surface Stack Map source
- `.claude/skills/setup/setup-provision-skills.md` — Skill installation
- `.claude/skills/setup/setup-cfsa.md` — Initial setup workflow
