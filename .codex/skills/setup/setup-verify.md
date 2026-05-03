---
name: setup-verify
description: Verify Codex CFSA installation integrity, placeholder completion, and skill readiness
parameters:
  - name: strict
    type: boolean
    required: false
    description: If true, verification fails on warnings
---

## Overview

Runs post-bootstrap verification for the Codex port.

## Verification Gates

### Gate 1 — Required paths exist

Must exist:
- `.codex/instructions/`
- `.codex/rules/`
- `.codex/skills/`
- `.codex/instructions/tech-stack.md`
- `.codex/skills/utilities/resolve-skill.md`

### Gate 2 — Surface Stack Map validity

In `.codex/instructions/tech-stack.md`:
- At least one Per-Surface row exists
- `Languages` is non-empty for every surface row
- `Test Cmd` is non-empty for every surface row
- No `⚠️` unresolved cells remain

### Gate 3 — Placeholder completion

No unresolved placeholders in:
- `.codex/instructions/*.md`
- `.codex/rules/*.md`
- `AGENTS.md` and `GEMINI.md` (if present)

Allowed placeholders:
- None after setup completion

### Gate 4 — Skill install integrity

For every skill referenced in map tables:
- Installed skill folder exists under `.codex/skills/` OR
- Skill is intentionally marked `—`

### Gate 5 — Resolver smoke test

Run a smoke resolution check:
- Resolve one known category from one known surface
- Verify resolver returns a structured result with `resolved`, `missing`, `warnings`

## Output Format

```markdown
## Setup Verification Report

### Passed
- Gate 1: required paths
- Gate 2: map validity

### Failed
- Gate 3: unresolved placeholders in `.codex/instructions/commands.md`

### Warnings
- Partial-match resolution used for `xyz-skill`

### Status
❌ Verification failed (1 gate)
```

If all gates pass:

```markdown
### Status
✅ Verification passed — pipeline ready

Next step: run `/ideate`.
```

## Completion Checklist

- [ ] All 5 gates evaluated
- [ ] Failures listed with exact file paths
- [ ] Warnings listed with rationale
- [ ] Final status returned with next step
