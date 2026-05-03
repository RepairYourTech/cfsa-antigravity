---
description: Patterns, decisions, and blockers written to memory every conversation — empty memory files mean the pipeline never learns
trigger: always_on
---

# Memory Capture

> Every conversation that involves a decision, correction, surprise, or blocker MUST record it before the conversation ends. Empty memory files mean the pipeline never learns.

## The Problem

The pipeline needs shared memory that survives across runtimes. The canonical project memory lives in `.memory/`, with `.memory/wiki/patterns.md`, `.memory/wiki/decisions.md`, and `.memory/wiki/blockers.md` as the human-readable compiled files. This rule enforces writing to that shared memory instead of letting learning fragment across runtime-local silos.

## When to Write

| Trigger | What Happened | Target File | Format |
|---------|---------------|-------------|--------|
| User corrects me | "No, that's wrong" / "Don't do that" / "I told you to..." | `.memory/wiki/patterns.md` | Anti-pattern (PAT-NNN) |
| User says "remember this" | Explicit instruction to retain information | `.memory/wiki/decisions.md` | Decision (DEC-NNN) |
| Non-trivial decision made | Choice with ripple effects (see Protocol 06 triage) | `.memory/wiki/decisions.md` | Decision (DEC-NNN) |
| Something blocks progress | External dependency, missing spec, tooling failure | `.memory/wiki/blockers.md` | Blocker (BLOCKER-NNN) |
| Pattern emerges | Something works well or fails repeatedly | `.memory/wiki/patterns.md` | Pattern (PAT-NNN) |

## How to Write

### Patterns (`.memory/wiki/patterns.md`)

```markdown
### PAT-NNN: [Short description] (YYYY-MM-DD)
- **Type**: best-practice | anti-pattern
- **Confidence**: 0.5 (first occurrence) — increment by 0.1 on reuse, max 0.95
- **Context**: When/where this applies
- **Pattern**: What to do (or avoid)
- **Source**: What triggered this entry
```

### Decisions (`.memory/wiki/decisions.md`)

```markdown
### DEC-NNN: [Decision summary] (YYYY-MM-DD)
- **Problem**: What needed deciding
- **Options considered**: At least 2
- **Decision**: What was chosen and why
- **Downstream**: What this affects
- **Reversibility**: High | Medium | Low
```

### Blockers (`.memory/wiki/blockers.md`)

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

## Native Memory Sync (Codex)

When running in Codex, memory capture is dual-write:

1. Write the CFSA entry to the unified project memory at `.memory/wiki/{patterns|decisions|blockers}.md` (or through the shared memory MCP tools when available)
2. Evaluate native-memory relevance and sync to Codex native memory store:
   - User correction/preference → `feedback`
   - User-specific preference/profile signal → `user`
   - Project decision/blocker context with downstream impact → `project`
   - External system pointer/where-to-look info → `reference`

If a trigger requires CFSA logging and native-memory relevance, both writes are required in the same conversation.

## Pre-Completion Check

Before calling `notify_user` to report completion of ANY workflow or substantial task:

1. **Scan this conversation** for triggers in the table above
2. **If triggers found** → write entries to `.memory/wiki/*` and sync relevant items to native memory
3. **If no triggers** → explicitly confirm: "No new patterns, decisions, or blockers to log"

This check is **not skippable**. It applies to every pipeline stage, every conversation, every session.
