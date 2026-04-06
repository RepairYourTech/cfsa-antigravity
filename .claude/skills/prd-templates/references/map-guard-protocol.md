# Map Guard Protocol

**Purpose**: Enforce strict surface stack map verification before any workflow step that depends on tech stack decisions. Auto-recover when possible, hard stop when not.

---

## Procedure

### 1. Read the Map

Read the surface stack map from `.agent/instructions/tech-stack.md`.

### 2. Check Required Cells

For the current workflow, verify that every cell the workflow depends on is filled (non-empty, no `{{PLACEHOLDER}}` literal).

Required cells vary by workflow — check the `requires_placeholders` frontmatter of the current workflow file, or the specific cells referenced in the workflow steps.

### 3. Classify Empty Cells

**If ALL required cells are filled** → proceed. No action needed.

**If ANY required cell is empty** → classify each empty cell:

| Empty Cell | Recovery Action | Auto-Recoverable? |
|---|---|---|
| Languages / Frameworks / Databases / ORMs | Run `/bootstrap-agents` with confirmed values from `architecture-draft.md` | **YES** — auto-invoke |
| Auth / Security | Run `/bootstrap-agents` with confirmed values from `architecture-draft.md` | **YES** — auto-invoke |
| CI/CD / Hosting | Run `/bootstrap-agents` with confirmed values from `architecture-draft.md` | **YES** — auto-invoke |
| Commands section | Run `/bootstrap-agents` | **YES** — auto-invoke |
| `patterns.md` | Run `/bootstrap-agents-provision` | **YES** — auto-invoke |
| `structure.md` | Run `/create-prd-compile` Step 9.5 | **NO** — hard stop |
| Cells requiring decisions not yet made | Run `/create-prd-stack` | **NO** — hard stop |

### 4. Auto-Recovery (for YES cells)

If the empty cells are auto-recoverable:

1. **Read `docs/plans/architecture-draft.md`** — extract confirmed tech stack decisions (languages, frameworks, databases, ORMs, hosting, auth, CI/CD)
2. **Build the bootstrap key set** from confirmed decisions
3. **Execute `/bootstrap-agents`** with those keys — read `.agent/workflows/bootstrap-agents.md` and run BOTH shards (fill + provision)
4. **Re-read the surface stack map** after bootstrap completes
5. **Re-check the required cells** — if now filled → proceed. If still empty → escalate to hard stop (Step 5)

> This auto-recovery fires silently. Do NOT ask the user "should I run bootstrap?" — just run it. Bootstrap is idempotent and safe.

### 5. Hard Stop (for NO cells or failed auto-recovery)

> **HARD STOP** — The surface stack map has empty cells that cannot be auto-recovered.
>
> | Empty Cell | Required Action |
> |---|---|
> | [cell name] | [what needs to happen] |
>
> Do NOT proceed. Do NOT use conversation-confirmed values. Do NOT apply timing fallbacks.

---

## What This Replaces

This protocol replaces all instances of the timing fallback pattern:

> ~~"If a cell is empty but the value was just confirmed in the current conversation... proceed using the conversation-confirmed value"~~

That pattern is **permanently banned**. It creates an escape hatch that allows agents to bypass map guards entirely. If a cell is empty and auto-recovery fails, the upstream workflow that should have filled it has a bug. Surface the bug, don't work around it.
