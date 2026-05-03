# Codex Skills

This directory contains all skills for the CFSA pipeline in Codex.

## Subdirectories

### Top-level workflow skill directories
Pipeline workflow skills now live directly under `.codex/skills/<workflow-name>/SKILL.md`. Parent workflows and shard workflows both use the same top-level directory pattern so Codex can resolve them as proper skills.

Examples:
- `.codex/skills/ideate/SKILL.md`
- `.codex/skills/create-prd/SKILL.md`
- `.codex/skills/write-fe-spec/SKILL.md`
- `.codex/skills/plan-phase/SKILL.md`
- `.codex/skills/validate-phase/SKILL.md`

### `setup/`
Setup and bootstrap skills for initializing the CFSA pipeline:

- `setup-cfsa.md` — Main setup skill (equivalent to `/bootstrap-agents`)
- `setup-fill-placeholders.md` — Fill tech stack and placeholder values
- `setup-provision-skills.md` — Install skills from skill library
- `setup-verify.md` — Verify installation and readiness

### `utilities/`
Helper skills used throughout the pipeline:

- `resolve-skill.md` — Dynamic skill resolution with 4-tier chain

## Skill Structure

Each skill follows this format:

```yaml
---
name: skill-name
description: Human-readable description
parameters:
  - name: input
    type: string
    required: true
---

## Overview
[Brief description]

## Prerequisites
[Required conditions]

## Step-by-Step
### Step 1 — [Name]
[Detailed instructions]

## Completion Checklist
- [ ] Verification steps

## Next Steps
[Recommended next actions]
```

## Invocation

Skills are invoked by Codex based on context, user request, or orchestration by other skills.

## Difference from Antigravity Workflows

Antigravity workflows are passive markdown files that agents read and follow. Codex skills are active, executable units that:

1. Accept parameters and return structured outputs
2. Can call other skills (composition)
3. Integrate with Codex's Tasks system
4. Maintain state across sessions via memory protocols

## See Also

- `.codex/instructions/workflow.md` — Mandatory execution sequence
- `.codex/rules/` — Always-active rules
- `.memory/` — Canonical shared state management and session continuity
