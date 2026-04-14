---
name: setup-cfsa
description: Main setup workflow for Claude Code CFSA pipeline — gather project info, fill placeholders, provision skills, verify installation
parameters:
  - name: project_name
    type: string
    required: true
    description: Project name
  - name: description
    type: string
    required: true
    description: Project description
  - name: surfaces
    type: array
    required: true
    description: List of surfaces (e.g., ["web"], ["web", "api"], ["desktop"])
  - name: tech_preferences
    type: object
    required: false
    description: Optional tech stack preferences
---

## Overview

The setup-cfsa skill is the main entry point for configuring the CFSA pipeline in Claude Code. It gathers project information, fills global placeholders, provisions skills from the skill library, and verifies the installation is ready for pipeline execution.

This is the Claude Code equivalent of Antigravity's `/bootstrap-agents` workflow.

## Prerequisites

1. Claude Code is installed and project is open
2. `.factory/` directory structure exists (created by `cfsa-antigravity init --agent factory`)
3. User has project idea and tech stack preferences ready

## Step-by-Step

### Step 1 — Gather Project Information

If not provided as parameters, ask the user for:

1. **Project name** — What should we call this project?
2. **Description** — One-sentence summary of what this project does
3. **Surfaces** — Which surfaces does this project have?
   - Single-surface: `["web"]`, `["api"]`, `["desktop"]`, `["mobile"]`
   - Multi-surface: `["web", "api"]`, `["desktop", "api"]`, `["web", "mobile"]`
4. **Tech stack preferences** (optional) — Any framework/database preferences?

**Example response:**
```
Project: TaskFlow
Description: AI-powered task management with multi-agent orchestration
Surfaces: ["web", "api"]
Preferences: Next.js for frontend, Supabase for database, TypeScript everywhere
```

### Step 2 — Initialize Global Placeholders

Call skill: `setup/setup-fill-placeholders`
- Input: `{project_name, description, surfaces, tech_preferences}`
- Output: Global placeholders filled in root config files

**What gets filled:**
- `{{PROJECT_NAME}}` → Project name
- `{{DESCRIPTION}}` → Project description
- `{{SURFACES}}` → Comma-separated surface list
- `{{TECH_STACK_SUMMARY}}` → Auto-generated summary from preferences

### Step 3 — Fill Surface Stack Map

Call skill: `setup/setup-fill-placeholders`
- Surface: Each surface from Step 1
- Category: All categories (Languages, BE Frameworks, etc.)
- Input: Tech stack preferences from Step 1

**What gets filled:**
- Per-Surface Skills table in `.factory/instructions/tech-stack.md`
- Cross-Cutting Skills table (Auth, CI/CD, Hosting, etc.)
- Global Settings table

**Handling preferences:**
- If user provided preferences → Fill those cells
- If no preferences → Leave cells as `⚠️` (not yet resolved)
- Prompt user to confirm or provide values for each empty cell

### Step 4 — Provision Skills from Library

Call skill: `setup/setup-provision-skills`
- Input: Surface Stack Map from Step 3
- Output: Skills installed from skill library

**Provisioning process:**
1. Read Surface Stack Map
2. For each skill name in every cell:
   - Attempt 4-tier resolution (exact → partial → external → human)
   - Install matching skills from `.factory/skill-library/`
   - Fill skill-internal placeholders
3. Update `{{INSTALLED_SKILLS}}` list
4. Report results

### Step 5 — Verify Installation

Call skill: `setup/setup-verify`
- Input: Filled Surface Stack Map + Installed skills
- Output: Installation verification report

**Verification checks:**
- [ ] All required directories exist
- [ ] Surface Stack Map has at least one row
- [ ] All cells are either filled or marked `—` (not applicable)
- [ ] No `⚠️` cells remain (unresolved)
- [ ] All referenced skills are installed
- [ ] Skill resolver can resolve test case
- [ ] Root config files have no remaining `{{PLACEHOLDER}}` values

**If verification fails:**
- Report specific failures
- Prompt user to fix issues
- Re-run verification until all checks pass

### Step 6 — Create Initial Progress Tracking

After successful verification, initialize progress tracking:

1. Create master progress file at `.factory/progress/spec-pipeline.md`
2. Set initial state: "Ready to start ideation"
3. Create session log for today
4. Recommend next step: `/ideate`

**Progress file structure:**
```markdown
# CFSA Pipeline Progress

## Project: {{PROJECT_NAME}}

## Current Stage: ideate
Last Updated: [ISO timestamp]

## Pipeline Gates
- [ ] ideate — Discovery phase
- [ ] create-prd — Architecture and tech stack
- [ ] decompose-architecture — Shard structure
- [ ] write-architecture-spec — Interaction specs
- [ ] write-be-spec — Backend contracts
- [ ] write-fe-spec — Frontend components
- [ ] plan-phase — Implementation slices
- [ ] setup-workspace — Project scaffold
- [ ] implement-slice — TDD implementation
- [ ] validate-phase — Quality gates

## Sessions
- [2026-04-05] — Initial setup completed
```

## Completion Checklist

- [ ] All parameters collected from user
- [ ] Global placeholders filled in root configs
- [ ] Surface Stack Map filled with no `⚠️` cells
- [ ] All skills provisioned from library
- [ ] Installation verification passed
- [ ] Progress tracking initialized
- [ ] User informed of next steps

## Next Steps

After setup completion, inform the user:

```
✅ CFSA Pipeline is ready for Claude Code!

Your project has been configured with:
- Surfaces: {{SURFACES}}
- Tech stack: {{TECH_STACK_SUMMARY}}
- Installed skills: {{INSTALLED_SKILLS_COUNT}}

Next steps:
1. Run /ideate to start the discovery phase
2. Or run /status to check your installation status

Documentation:
- .factory/README.md — Claude Code version guide
- docs/ — Project documentation directory
```

## Error Handling

| Error | Handling |
|-------|----------|
| User cancels during Step 1 | Save partial progress, offer to resume |
| Surface Stack Map can't be read | Fail with clear error — run `cfsa-antigravity init --agent factory` |
| Skill library missing | Use 4-tier resolution without manifest, warn user |
| Verification fails | Report specific failures, prompt fixes, don't proceed |
| Progress tracking already exists | Ask to overwrite or resume existing pipeline |

## See Also

- `.factory/skills/setup-fill-placeholders/SKILL.md` — Surface Stack Map filling
- `.factory/skills/setup-provision-skills/SKILL.md` — Skill provisioning
- `.factory/skills/setup-verify/SKILL.md` — Installation verification
- `.factory/skills/resolve-skill/SKILL.md` — 4-tier resolution chain
