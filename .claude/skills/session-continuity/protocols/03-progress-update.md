> **Framework context required**: This is a protocol excerpt. Before following these steps, read `.claude/skills/session-continuity/SKILL.md` for the complete framework — including the Adaptive Granularity Rule, Level Hierarchy Reference, Frozen Files concept, and Parallel Claim protocol. Protocol files are reference documents for specific steps, not standalone instructions.

# Protocol 3: Progress Update

> Part of [Session Continuity](../SKILL.md) — read the index for overview, directory structure, and integration points.

**Invoked by**: `/implement-slice` step 7

**Purpose**: Mark completed work, release claims, and propagate status changes upward.

## Steps

1. **Mark tasks and acceptance criteria `[x]`** in the slice's tracking location (use the exact files in the `.memory/pipeline/progress/` directory, NEVER guess the path):
   - If slice has its own file: update `.memory/pipeline/progress/slices/phase-NN-slice-NN.md`
   - If inline: update `.memory/pipeline/progress/phases/phase-NN.md`

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

5. **Update `.memory/pipeline/progress/index.md`** — recalculate overall progress:
   ```markdown
   **Overall**: 12/20 slices (60%)
   ```
   Update the phase row's status and progress count.

6. **Log implementation notes** (if slice file exists):
   - What approach was taken
   - Key files changed
   - Any deviations from the plan

7. **Log blockers** encountered during implementation to `.memory/wiki/blockers.md`:
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

8. **Read-back verification (mandatory — runtime-agnostic)**

   After every write in steps 1–6, immediately read each file back and confirm the change landed. This mirrors Protocol 8 step 6 and is required because different agent runtimes (Claude, Antigravity, Codex, Factory) all write to the same `.memory/pipeline/progress/` tree — a silent partial write here means the next session in any runtime will resume from stale state.

   For each of the four targets you wrote (slice file, phase file, index.md, plus blockers/decisions/patterns if touched):

   (a) Re-read the file with a fresh read.
   (b) Confirm the specific bytes you intended to write are present:
       - Slice file: `**Status**: complete` line is present.
       - Phase file: the `**Slice N**` row checkbox is `[x]`, and the `**Progress**: X/Y` header reflects the new count.
       - `index.md`: the phase row's status and `X/Y` cell match the phase file, and `**Overall**: X/Y` is recalculated.
   (c) If any check fails:
       - Log: `"Progress write-back failed for [file]: expected [value], saw [actual]"`
       - Retry the write **once**.
       - Re-read and re-verify.
       - If second attempt fails → **STOP**: `"Unable to update [file] after 2 attempts. Do not call notify_user. Do not advance the slice. Investigate before continuing."`
   (d) On success, log: `"Progress write-back verified: slice/phase/index all consistent."`

9. **Cross-file consistency check (mandatory — runtime-agnostic)**

   Run the verifier:

   ```
   node scripts/check-progress-consistency.mjs
   ```

   (If `scripts/check-progress-consistency.mjs` does not exist in the project — for example, an older installation that has not been synced — fall back to manual cross-checking: open all three files (slice, phase, index) side-by-side and verify the slice's status, the phase's `X/Y`, and the index's overall `X/Y` are all internally consistent. Then `/sync-kit` to pull the verifier in.)

   - Exit code 0 → consistent. Proceed.
   - Exit code 1 → drift. Read the script's output, fix every reported drift item by editing the affected file(s), and re-run the script until it returns 0. **STOP and do not call `notify_user` until the script returns 0.**
   - Exit code 2 → malformed file. The progress files are unreadable or missing required headers. **STOP**: report the malformed file and the reason; do not attempt repair without user confirmation, since malformed progress files usually indicate a deeper schema mismatch.

   This check exists because checkbox edits and fraction edits are easy to forget independently. The script catches the four most common drift patterns: phase fraction ≠ checkbox count, slice file status ≠ phase row checkbox, index overall ≠ sum of phases, index per-phase row ≠ phase file. It runs in any runtime with Node available.

10. **Stamp the slice with a completion signature** — append (or update) at the bottom of `slices/phase-NN-slice-NN.md`:

    ```markdown
    ## Completion Signature
    - Completed: <ISO date>
    - Runtime: <claude | antigravity | codex | factory | other>
    - Verifier: check-progress-consistency.mjs exit 0
    - Depth ratio: <ratio> (>= 1.0 required)
    ```

    The signature is what lets a different runtime opening the project later trust that the slice is genuinely done — not just that someone ticked a box.
