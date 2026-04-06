> **Framework context required**: This is a protocol excerpt. Before following these steps, read `.agent/skills/session-continuity/SKILL.md` for the complete framework — including the Adaptive Granularity Rule, Level Hierarchy Reference, Frozen Files concept, and Parallel Claim protocol. Protocol files are reference documents for specific steps, not standalone instructions.

# Protocol 3: Progress Update

> Part of [Session Continuity](../SKILL.md) — read the index for overview, directory structure, and integration points.

**Invoked by**: `/implement-slice` step 7

**Purpose**: Mark completed work, release claims, and propagate status changes upward.

## Steps

1. **Mark tasks and acceptance criteria `[x]`** in the slice's tracking location (use the exact files in the `.agent/progress/` directory, NEVER guess the path):
   - If slice has its own file: update `.agent/progress/slices/phase-NN-slice-NN.md`
   - If inline: update `.agent/progress/phases/phase-NN.md`

2. **Release any claimed tasks** — if the completed task had `[!]`:
   - Change status from `[/]` to `[x]`
   - Remove the `[!]` flag from the task line
   - Remove the `files:` block under the task (lock released)
   ```markdown
   # Before (during parallel work)
   - [/] `BE` API endpoints for user profile [!]
     - files: src/api/users/[id].ts, src/db/queries/user.ts
     - [x] GET endpoint
     - [x] PUT endpoint

   # After (task complete)
   - [x] `BE` API endpoints for user profile
     - [x] GET endpoint
     - [x] PUT endpoint
   ```

3. **Mark the slice itself `[x]`** in the phase file (only when ALL tasks are `[x]`):
   ```markdown
   - [x] **Slice 3**: Auth middleware (M) ✅ 2026-02-15
   ```

4. **Update phase progress** in the phase file header:
   ```markdown
   **Status**: in-progress
   **Progress**: 4/7 slices
   ```

5. **Update `.agent/progress/index.md`** — recalculate overall progress:
   ```markdown
   **Overall**: 12/20 slices (60%)
   ```
   Update the phase row's status and progress count.

6. **Log implementation notes** (if slice file exists):
   - What approach was taken
   - Key files changed
   - Any deviations from the plan

7. **Log blockers** encountered during implementation to `memory/blockers.md`:
   ```markdown
   ## Active Blockers

   ### BLK-003: Redis config missing (2026-02-15)
   - **Slice**: Phase 2, Slice 4 — Rate limiting
   - **Impact**: Cannot implement rate limiter without Redis connection
   - **Needs**: VPS Redis setup or config from user

   ## Resolved Blockers

   ### BLK-002: Firebase admin SDK version conflict (2026-02-14)
   - **Resolution**: Pinned to v12.0.0, added to package.json overrides
   - **Resolved**: 2026-02-14
   ```
