---
name: setup-provision-skills
description: Provision skills from the shared skill library using the Surface Stack Map and 4-tier resolution
parameters:
  - name: surfaces
    type: array
    required: true
    description: Surfaces to provision for (e.g. ["web", "api"])
  - name: strict
    type: boolean
    required: false
    description: If true, fail when any required skill is unresolved
---

## Overview

This skill provisions Codex skills from `.codex/skill-library/` (shared via symlink to `.codex/skill-library/`) based on `.codex/instructions/tech-stack.md`.

Equivalent to Antigravity's `bootstrap-agents-provision.md` shard.

## Step-by-Step

### 1) Load map and manifest

1. Read `.codex/instructions/tech-stack.md`
2. Read `.codex/skill-library/MANIFEST.md`
3. Collect all referenced skill names from:
   - Per-Surface Skills table for the requested surfaces
   - Cross-Cutting Skills table

### 2) Resolve each skill

For each referenced skill name, resolve with:

1. **Tier 1 (exact):** `.codex/skills/{name}/SKILL.md` exists or exact manifest mapping exists
2. **Tier 2 (partial):** partial name match + adequacy check against surface/category
3. **Tier 3 (external):** discover additional match from skill library taxonomy
4. **Tier 4 (human):** unresolved → ask user to pick custom path / skip / alternative

Use `.codex/skills/utilities/resolve-skill.md` for resolution behavior.

### 3) Provision

For each resolved library path:

1. Copy library directory into `.codex/skills/{installed-name}/`
2. Skip copy if already installed (idempotent)
3. Fill placeholders in copied `SKILL.md` when matching values are available

### 4) Update installed skills list

Write installed skills summary into:
- `.codex/instructions/tech-stack.md` (`{{INSTALLED_SKILLS}}`)
- `AGENTS.md` and `GEMINI.md` (if present)

Use sections:
- Default Skills
- Stack Skills (Per-Surface)
- Stack Skills (Cross-Cutting)
- Surface Skills

### 5) Report

Return:
- Provisioned skills (new)
- Already installed skills (skipped)
- Resolved by partial match (warnings)
- Unresolved skills (`⚠️`) and required user action

## Idempotency

- Re-running does not duplicate skills
- Existing installs are preserved
- New map values add only missing skills

## Completion Checklist

- [ ] Loaded tech stack map and manifest
- [ ] Resolved all referenced skills via 4-tier chain
- [ ] Provisioned all resolvable skills
- [ ] Updated installed-skills lists
- [ ] Returned unresolved list with action guidance
