---
description: Patterns, decisions, and blockers written to memory every conversation — empty memory files mean the pipeline never learns
trigger: always_on
---

# Memory Capture

> Every conversation that involves a decision, correction, surprise, or blocker MUST record it before the conversation ends. Empty memory files mean the pipeline never learns.

## The Problem

The pipeline has three memory files (`memory/patterns.md`, `memory/decisions.md`, `memory/blockers.md`) — all empty. `workflow.md` Step 5 says "Learn (MANDATORY)" but no enforcement exists. This rule IS the enforcement.

## When to Write

| Trigger | What Happened | Target File | Format |
|---------|---------------|-------------|--------|
| User corrects me | "No, that's wrong" / "Don't do that" / "I told you to..." | `memory/patterns.md` | Anti-pattern (PAT-NNN) |
| User says "remember this" | Explicit instruction to retain information | `memory/decisions.md` | Decision (DEC-NNN) |
| Non-trivial decision made | Choice with ripple effects (see Protocol 06 triage) | `memory/decisions.md` | Decision (DEC-NNN) |
| Something blocks progress | External dependency, missing spec, tooling failure | `memory/blockers.md` | Blocker (BLOCKER-NNN) |
| Pattern emerges | Something works well or fails repeatedly | `memory/patterns.md` | Pattern (PAT-NNN) |

## How to Write

### Patterns (`memory/patterns.md`)

```markdown
### PAT-NNN: [Short description] (YYYY-MM-DD)
- **Type**: best-practice | anti-pattern
- **Confidence**: 0.5 (first occurrence) — increment by 0.1 on reuse, max 0.95
- **Context**: When/where this applies
- **Pattern**: What to do (or avoid)
- **Source**: What triggered this entry
```

### Decisions (`memory/decisions.md`)

```markdown
### DEC-NNN: [Decision summary] (YYYY-MM-DD)
- **Problem**: What needed deciding
- **Options considered**: At least 2
- **Decision**: What was chosen and why
- **Downstream**: What this affects
- **Reversibility**: High | Medium | Low
```

### Blockers (`memory/blockers.md`)

```markdown
### BLOCKER-NNN: [Description] (YYYY-MM-DD)
- **Status**: active | resolved
- **Impact**: What this blocks
- **Resolution**: How it was resolved (if resolved)
```

## When NOT to Write

- Routine/trivial tasks with nothing new learned — skip
- Isolated implementation decisions (variable names, file paths) — skip
- Repeating an existing pattern already logged — update confidence instead

## Pre-Completion Check

Before calling `notify_user` to report completion of ANY workflow or substantial task:

1. **Scan this conversation** for triggers in the table above
2. **If triggers found** → write entries to the appropriate memory files
3. **If no triggers** → explicitly confirm: "No new patterns, decisions, or blockers to log"

This check is **not skippable**. It applies to every pipeline stage, every conversation, every session.
