# Freebuff Skills

This directory contains all skills for the CFSA pipeline in Freebuff.

## Subdirectories

### Top-level workflow skill directories
Pipeline workflow skills now live directly under `.freebuff/skills/<workflow-name>/SKILL.md`. Parent workflows and shard workflows both use the same top-level directory pattern so Freebuff can resolve them as proper skills.

Examples:
- `.freebuff/skills/ideate/SKILL.md`
- `.freebuff/skills/create-prd/SKILL.md`
- `.freebuff/skills/write-fe-spec/SKILL.md`
- `.freebuff/skills/plan-phase/SKILL.md`
- `.freebuff/skills/validate-phase/SKILL.md`

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

Skills are invoked by Freebuff based on context, user request, or orchestration by other skills.

## Difference from Antigravity Workflows

Antigravity workflows are passive markdown files that agents read and follow. Freebuff skills are active, executable units that:

1. Accept parameters and return structured outputs
2. Can call other skills (composition)
3. Integrate with Freebuff's Tasks system
4. Maintain state across sessions via memory protocols

## See Also

- `.freebuff/instructions/workflow.md` — Mandatory execution sequence
- `.freebuff/rules/` — Always-active rules
- `.memory/` — Canonical shared state management and session continuity
