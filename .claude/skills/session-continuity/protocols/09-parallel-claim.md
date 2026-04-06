> **Framework context required**: This is a protocol excerpt. Before following these steps, read `.agent/skills/session-continuity/SKILL.md` for the complete framework — including the Adaptive Granularity Rule, Level Hierarchy Reference, Frozen Files concept, and Parallel Claim protocol. Protocol files are reference documents for specific steps, not standalone instructions.

# Protocol 9: Parallel Claim

> Part of [Session Continuity](../SKILL.md) — read the index for overview, directory structure, and integration points.

**Invoked by**: `/implement-slice` step 1.5 (parallel dispatch)

**Purpose**: Coordinate parallel agent ownership of tasks using claim markers
and file-level locks. Prevents two agents from modifying the same files.

## Concepts

| Concept | Description |
|---------|-------------|
| **Surface tag** | `BE`, `FE`, or `QA` prefix on a task, determines which agent type handles it |
| **Claim flag `[!]`** | Appended to a task line — means an agent owns this task and all subtasks |
| **`files:` block** | Listed directly under a claimed task — hard lock on those files |
| **Frozen files** | Files no parallel agent may touch — see Frozen Files list below |

### Frozen Files

Files no parallel agent may touch:

- `package.json` (or equivalent dependency manifest for the project's package manager)
- `{{PACKAGE_MANAGER}}` lock file (e.g., `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`)
- `{{FRONTEND_FRAMEWORK}}` config file (e.g., `astro.config.mjs`, `next.config.js`, `vite.config.ts`)
- `{{CONTRACTS_DIR}}` (e.g., `src/contracts/*`)
- Language config file (e.g., `tsconfig.json` for TypeScript, `pyproject.toml` for Python)
- `.env`

## Claiming a Task

When an agent is dispatched to a surface-tagged task:

1. **Change status** from `[ ]` to `[/]`
2. **Append `[!]`** to the end of the task line
3. **Write `files:` block** directly under the task line, listing every file the agent will modify:
   ```markdown
   - [/] `BE` API endpoints for user profile [!]
     - files: src/api/users/[id].ts, src/db/queries/user.ts
     - [ ] GET /api/users/:id
     - [ ] PUT /api/users/:id
   ```
4. **Subtasks inherit the claim** — the agent owns all nested items under the claimed task

## Collision Check

Before dispatching agents, the orchestrator must verify no file overlap:

1. **Collect `files:` lists** from all tasks about to be claimed
2. **Check intersection** — if any file appears in more than one list:
   - **Same tag** → merge tasks (shouldn't happen if planned well)
   - **Different tags** → cannot parallelize. Run sequentially, assign to
     whichever tag owns the majority of files
3. **Check frozen files** — if any agent's `files:` list includes a frozen file,
   reject the claim and require a `// BOUNDARY:` stub approach instead
4. **Empty intersection** → ✅ safe to dispatch in parallel

## Releasing a Task

When an agent completes all subtasks under a claimed task:

1. **Change status** from `[/]` to `[x]`
2. **Remove `[!]`** from the task line
3. **Remove the `files:` block** (lock released)
4. All subtasks should be `[x]`

See [Protocol 3: Progress Update](03-progress-update.md) step 2 for the exact format.

## Dependency Rules (TDD Order)

> **Tests are the rock. Code is malleable.** If tests fail, the code changes —
> never the tests. Shallow or simplified tests that force passing results are
> the single greatest failure mode. Comprehensive tests are non-negotiable.

The dependency chain follows strict TDD: Red → Green → Verify.

| Phase | Tag | What Happens | Depends On |
|-------|-----|-------------|------------|
| 1. Contract | (untagged) | Orchestrator writes {{CONTRACT_LIBRARY}} schemas | Nothing |
| 2. QA-RED | `QA` | Write comprehensive failing tests from acceptance criteria | Contract `[x]` |
| 3. BE + FE | `BE`, `FE` | Implement in parallel to make tests pass | QA-RED `[x]` |
| 4. QA-GREEN | `QA` | Second pass — verify all tests pass, check for cheating, add integration/E2E | BE `[x]` + FE `[x]` |

## Iterative Correction Loop

If QA-GREEN finds failures:

1. **Never weaken or simplify tests** — tests encode the acceptance criteria
2. **Report failures** to orchestrator with specific test names and error output
3. **Orchestrator re-dispatches** `BE` and/or `FE` agents to fix failing code
4. **QA-GREEN runs again** — repeat until all tests pass
5. **Only the orchestrator may terminate the loop** — agents cannot declare "good enough"

```
Contract → QA-RED → BE+FE (parallel) → QA-GREEN
                                           ↓
                                     Tests pass? ──Yes──→ Slice complete
                                           ↓ No
                                     Re-dispatch BE/FE → QA-GREEN (repeat)
```

## Stale Lock Recovery

If an agent crashes mid-task (leaving `[!]` without completing):

1. **Manual cleanup**: User or orchestrator resets the task from `[/]` to `[ ]`,
   removes `[!]` and `files:` block
2. **Subtask state preserved**: Any subtasks already marked `[x]` remain — the
   new agent picks up from the first `[ ]` subtask
3. **Prevention**: Agents should update subtask status incrementally, not batch
   at the end

## Level Hierarchy Reference

```
Level 1: Phase       [ ] [/] [x]         — no tags, no [!]
Level 2: Slice       [ ] [/] [x]         — no tags, no [!]
Level 3: Task        [ ] [/] [x] + [!]   — has BE/FE/QA tag, claimable
Level 4+: Subtask    [ ] [/] [x]         — no [!], owned by parent task's agent
```
