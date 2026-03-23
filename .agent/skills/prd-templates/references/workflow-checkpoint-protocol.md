# Workflow Checkpoint Protocol

> Survive context truncation. When process memory is lost, this file tells the next context exactly where you are and what to do next.

## When to use

Every `/create-prd` shard workflow writes and reads this checkpoint. It lives at `docs/plans/prd-working/workflow-state.md`.

## Checkpoint file format

The checkpoint is a markdown file with YAML-style key-value pairs. Agents must parse it on shard start and update it at every write trigger.

```markdown
# Workflow Checkpoint

active_shard: .agent/workflows/create-prd-stack.md
current_step: per-axis-flow
current_item: Frontend Framework (STK-04)
items_completed: [Hosting (STK-01), Database (STK-02), Auth (STK-03)]
next_action: Read ideation files for Frontend Framework axis, write synthesis
pending_reads:
  - docs/plans/ideation/domains/dashboard/dashboard-deep-dive.md
  - docs/plans/ideation/domains/diagnostics/diagnostics-deep-dive.md
  - docs/plans/ideation/ideation-cx.md
synthesis_written: false
last_user_output: Confirmed Auth Provider as Supabase Auth (STK-03)
```

### Field definitions

| Field | Type | Purpose |
|-------|------|---------|
| `active_shard` | filepath | Which workflow file to `view_file` to recover process |
| `current_step` | string | Step identifier within the shard |
| `current_item` | string | Axis name, decision name, or section being worked on |
| `items_completed` | list | Already-completed items (decisions, sections, axes) |
| `next_action` | string | Exact next thing the agent should do |
| `pending_reads` | list | Files that MUST be read before next user-facing output |
| `synthesis_written` | bool | Whether synthesis was written for current item |
| `last_user_output` | string | Summary of last thing shown to the user |

## Write triggers

Update the checkpoint file at these moments:

1. **Shard start** — initialize with shard filepath, first step, empty completed list
2. **After reading ideation files** — update `pending_reads` to empty, note files were read
3. **After writing synthesis** — set `synthesis_written: true`
4. **After each item completion** — move item to `items_completed`, set next item, reset `synthesis_written: false`, populate `pending_reads` for next item from the Ideation Relevance Index
5. **Before user-facing output** — update `last_user_output` with summary of what was presented
6. **Shard completion** — update `current_step: complete`, `next_action: proceed to [next shard]`

## Read triggers — Resumption

At the start of every shard, check if `docs/plans/prd-working/workflow-state.md` exists.

### If it exists and `active_shard` matches this shard:

1. **Re-read the shard workflow**: `view_file` the path in `active_shard` — recover the full process
2. **Load completed items**: Skip already-completed axes/decisions
3. **Check `synthesis_written`**: If `false` → the agent was interrupted before writing synthesis. Read `pending_reads` files and write synthesis before doing anything else
4. **Resume from `next_action`**: Execute exactly what the checkpoint says

### If it exists and `active_shard` is a DIFFERENT shard:

The previous shard finished or a different shard is running. Check `current_step`:
- If `complete` → previous shard finished cleanly. Initialize fresh checkpoint for this shard
- If not `complete` → previous shard was interrupted. **STOP**: "Previous shard `{active_shard}` was interrupted at `{current_item}`. Resume that shard first or confirm skip."

### If it does not exist:

Fresh start. Initialize the checkpoint.

## Synthesis verification gate (HARD)

> This gate enforces `source-before-ask`. It is not optional.

**Before presenting ANY Tier 2 question, option table, or recommendation to the user:**

1. Read the checkpoint file
2. Check `synthesis_written` for the current item
3. If `synthesis_written: false` → **STOP**. Do not present anything to the user. Read the files in `pending_reads`, write the synthesis to the appropriate synthesis file, update `synthesis_written: true` in the checkpoint, THEN proceed
4. If `synthesis_written: true` → proceed with user-facing output

This gate catches the exact failure mode: context truncation drops the synthesis step, the agent pattern-matches "STK-04 is next" from the summary, and jumps straight to asking the user generic questions.

## Shard-specific checkpoint patterns

### create-prd-stack

- `current_item` format: `{Axis Name} (STK-{NN})`
- `items_completed` tracks each axis
- `pending_reads` populated from Ideation Relevance Index per-axis
- Checkpoint updated at per-axis flow step 9 (move to next axis)

### create-prd-design-system

- `current_item` format: `{Decision Name} (DS-{NN})`
- 7 decisions tracked: Navigation Paradigm, Layout Grid, Page Archetypes, Component Hierarchy, Motion System, Data Density, State Design Language
- `pending_reads` populated from heavy domain files

### create-prd-architecture / security / compile

- `current_item` format: `{Section Name}`
- Tracks major sections (e.g., "System Components", "Data Strategy", "Security Model")
- `pending_reads` populated from relevant ideation domains per section

## Cleanup

The parent orchestrator (`create-prd.md`) deletes or archives the checkpoint file after Step E (quality gate) passes. The file is a process artifact — once the PRD is compiled, it has no further value.

The synthesis files in `prd-working/` are kept as audit trail.
