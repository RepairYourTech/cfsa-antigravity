# Map Guard Protocol

**Purpose**: Enforce strict surface stack map verification before any workflow step that depends on tech stack decisions. No timing fallbacks. No conversation-confirmed values.

---

## Procedure

### 1. Read the Map

Read the surface stack map from `.agent/instructions/tech-stack.md`.

### 2. Check Required Cells

For the current workflow, verify that every cell the workflow depends on is filled (non-empty, no `{{PLACEHOLDER}}` literal).

Required cells vary by workflow — check the `requires_placeholders` frontmatter of the current workflow file, or the specific cells referenced in the workflow steps.

### 3. Hard Gate

**If ANY required cell is empty:**

> **HARD STOP** — The surface stack map has empty cells required by this workflow.
>
> | Empty Cell | Recovery |
> |---|---|
> | Languages / Databases / Frameworks | Run `/create-prd-stack` |
> | Auth / Security | Run `/create-prd-security` |
> | CI/CD / Hosting | Run `/create-prd-stack` (dev tooling axis) |
> | Commands section | Run `/bootstrap-agents` |
> | `structure.md` | Run `/create-prd-compile` Step 9.5 |
> | `patterns.md` | Run `/bootstrap-agents-provision` |
>
> Do NOT proceed. Do NOT use conversation-confirmed values. Do NOT apply timing fallbacks. If the cell should have been filled by a previous workflow step, the previous step has a bug — surface it.

---

## What This Replaces

This protocol replaces all instances of the timing fallback pattern:

> ~~"If a cell is empty but the value was just confirmed in the current conversation... proceed using the conversation-confirmed value"~~

That pattern is **permanently banned**. It creates an escape hatch that allows agents to bypass map guards entirely. If a cell is empty, the upstream workflow that should have filled it has a bug. Surface the bug, don't work around it.
