# Bootstrap Verification Protocol

**Purpose**: Every bootstrap invocation MUST be verified. This protocol replaces all inline "fire bootstrap" instructions with a hard-gated fire→verify→stop cycle.

---

## Procedure

### 1. Fire

Read `.agent/workflows/bootstrap-agents.md` and execute with the provided key(s).

### 2. Verify

After bootstrap returns, verify that the target was actually filled:

| Key Type | Where to Verify | How to Verify |
|----------|----------------|---------------|
| Language/Framework/DB/ORM | Surface stack map in `.agent/instructions/tech-stack.md` | The cell for the provided key's surface row is no longer empty |
| CI/CD, Hosting, Auth, Security | Cross-cutting section of surface stack map | The cell is no longer empty |
| Design direction | `.agent/skills/brand-guidelines/SKILL.md` | `{{DESIGN_DIRECTION}}` no longer appears as literal text |
| Project structure | `.agent/instructions/structure.md` | `{{PROJECT_STRUCTURE}}` no longer appears as literal text |
| Dev tooling | `.agent/instructions/commands.md` | Template values are replaced with real commands |
| New dependency skill | `.agent/skills/[skill-name]/SKILL.md` | The skill directory exists and `SKILL.md` is readable |

### 3. Hard Gate

> **HARD STOP** — If any verification check fails, do NOT proceed. Report to the user:
>
> "Bootstrap was invoked with `[KEY]=[VALUE]` but verification failed:
> - Expected `[target file]` cell `[cell name]` to contain `[VALUE]`
> - Actual: `[what was found — empty, still placeholder, etc.]`
>
> This is a bootstrap bug. Do not proceed until resolved."

### 4. Log

After successful verification, note in the current workflow step: `Bootstrap verified: [KEY]=[VALUE] → [target cell] confirmed filled.`

---

## When to Use

Any workflow step that says:
- "fire bootstrap"
- "invoke `/bootstrap-agents`"
- "execute bootstrap"
- "read bootstrap-agents.md and execute"

MUST follow this protocol. There are no exceptions. A bootstrap fire without verification is an enforcement failure.
