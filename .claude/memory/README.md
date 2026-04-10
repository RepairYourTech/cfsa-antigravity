# CFSA Memory

This directory contains CFSA-specific memory protocols for maintaining state across sessions and tracking pipeline progress.

## Memory Files

### `decisions.md`
Locked decisions log with timestamp, stage, decision, rationale, and dependencies. Each locked decision is recorded here to prevent contradictions in downstream stages.

**Format:**
```markdown
## [YYYY-MM-DD] [Decision Title]

**Type**: product | architecture | implementation
**Stage**: ideate | create-prd | write-*-spec | plan-phase
**Decision**: [Decision description]
**Rationale**: [Why this decision was made]
**Dependencies**: [Prerequisite decisions]
**Locked At**: [ISO timestamp]
```

### `patterns.md`
Reusable patterns extracted from completed work, scored by confidence (1-5). Patterns are extracted via the Pattern Extraction Protocol after each workflow/slice completion.

**Format:**
```markdown
## [Pattern Name]

**Confidence**: 1-5
**Source**: [Workflow/slice where discovered]
**Pattern**: [Reusable approach]
**When to Apply**: [Conditions]
**Caveats**: [Limitations]
```

### `blockers.md`
Active and resolved blockers that prevent progress. Blockers are logged when encountered and updated when resolved.

**Format:**
```markdown
## [Active/Resolved] [Blocker Title]

**Type**: technical | decision | external
**Status**: active | resolved
**Description**: [What's blocking progress]
**Attempted Solutions**: [What's been tried]
**Resolution**: [How it was resolved, if applicable]
**Opened**: [Date]
**Resolved**: [Date, if applicable]
```

## `sessions/` Directory

Session logs for cross-session continuity. Each session log records:

- Work completed during the session
- Decisions made
- Next steps for resumption
- Checkpoints for long-running workflows

**Format:** `sessions/YYYY-MM-DD.md`

```markdown
# Session: [YYYY-MM-DD]

## Context
[Why this session started]

## Work Completed
- [Workflow/skill completed]
- [Files created/modified]
- [Decisions made]

## Session End
**Status**: [complete | incomplete | blocked]
**Next Steps**: [What to do next]
**Checkpoint**: [Current state for resumption]
```

## Memory Protocols

The following skills manage this memory directory:

1. **memory-protocol** — Main skill for decision logging, pattern extraction, session management
2. **progress-tracking** — Integrates with Claude Code Tasks, updates memory files
3. **session-resumption** — Loads context from sessions/ on startup

## Integration with Claude Code

This memory system complements Claude Code's built-in features:

- **Tasks**: Progress tracking uses Claude Code Tasks, memory stores metadata
- **Memory**: Decision/blocker/pattern tracking is CFSA-specific, stored here
- **Sessions**: Session logs provide richer context than Claude Code's history

## Native Memory Bridge (Required)

When running in Claude Code, memory capture is dual-write:

1. Write CFSA operational memory to `.claude/memory/*`
2. Also sync durable collaboration memory to Claude native memory store using the native memory types

### Mapping Rules

- `patterns.md` entries map to native **feedback** memory when they reflect user corrections/preferences
- `decisions.md` entries map to native **project** memory for project decisions; map to **user** memory when the decision is actually a user preference
- `blockers.md` entries map to native **project** memory when they affect ongoing work context
- External system pointers discovered while logging decisions/blockers map to native **reference** memory

### Source of Truth

- `.claude/memory/*` remains the pipeline execution log
- Native memory remains the long-lived collaboration memory across sessions
- Do not replace one with the other; keep them synchronized when trigger conditions are met

### What Not To Sync

- Trivial implementation details (file names, one-off variable choices)
- Routine entries with no future value
- Any codebase facts directly derivable from files or git history

### Trigger

On any memory-capture trigger (decision/correction/pattern/blocker), evaluate whether a native memory entry should also be written and sync it in the same conversation.

## Cleanup

Session logs are automatically cleaned during template build, keeping only README.md. Decision, pattern, and blocker logs persist across installations.

## See Also

- `.claude/skills/utilities/memory-protocol.md` — Memory management skill
- `.claude/skills/utilities/progress-tracking.md` — Task integration
- `.claude/progress/` — Antigravity's equivalent markdown-based tracking
