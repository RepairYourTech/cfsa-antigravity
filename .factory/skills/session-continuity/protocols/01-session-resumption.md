> **Framework context required**: This is a protocol excerpt. Before following these steps, read `.factory/skills/session-continuity/SKILL.md` for the complete framework — including the Adaptive Granularity Rule, Level Hierarchy Reference, Frozen Files concept, and Parallel Claim protocol. Protocol files are reference documents for specific steps, not standalone instructions.

# Protocol 1: Session Resumption

> Part of [Session Continuity](../SKILL.md) — read the index for overview, directory structure, and integration points.

**Invoked by**: Any workflow start, or `instructions/workflow.md` step 1

**Purpose**: Load cross-session context so the agent knows where to resume.

## Steps

1. **Check if `.memory/pipeline/progress/index.md` exists**
   - If no: this is a fresh project with no tracked progress. Skip resumption.
   - If yes: continue.

2. **Read `index.md`** — get overall status, phase progress percentages.

3. **Find in-progress items** — scan for `[/]` markers (in-progress) in phase files.
   - If found: this is the resumption point.
   - If none: find the next unchecked `[ ]` item.

4. **Read the latest session log** — `sessions/` directory, most recent file.
   - What was accomplished last session?
   - What was deferred and why?
   - What's the recommended starting point?

5. **Read `.memory/wiki/blockers.md`** — are there unresolved blockers?

6. **Read `.memory/wiki/decisions.md`** — load key decisions for context.

7. **Drift scan (mandatory — runtime-agnostic)**

   Before trusting the resumption point, run the cross-file consistency verifier:

   ```
   node scripts/check-progress-consistency.mjs
   ```

   - Exit 0 → progress files agree across slice/phase/index. Trust the resume point and continue to step 8.
   - Exit 1 → drift. A previous session (possibly in a different runtime — Claude, Antigravity, Codex, Factory) committed work but did not finish updating all four progress targets. **DO NOT silently re-do or skip past the affected slice.** Surface the verifier's full output to the user with this exact framing:

     ```
     Progress drift detected from a previous session. Before resuming, the following must be reconciled:
     <verifier output>

     Likely cause: another runtime completed work but did not finish updating all progress files (Protocol 3 steps 8–10 were skipped or interrupted).

     Recommended action: hand-edit the offending files to match the actual completion state on disk (check `git status`, slice's Completion Signature block, and test pass/fail), then re-run this check. I will not advance until the verifier returns 0.
     ```

   - Exit 2 → malformed progress files. **STOP**: report and ask the user before attempting repair.

   If `scripts/check-progress-consistency.mjs` does not exist in the project (older installation), note this and recommend `/sync-kit`, then fall back to manually opening `index.md` + the latest in-progress phase file + that phase's slice files and confirming the fractions and checkboxes match before resuming.

8. **Summarize for the current task**:
   ```
   Status: Phase 2 in progress — 3/7 slices complete (43%)
   Last session: Completed auth middleware slice, deferred rate limiting (blocked on Redis)
   Blockers: 1 active — Redis connection config needed
   Drift scan: clean (verifier exit 0)
   Resume at: Phase 2, Slice 4 — Rate limiting middleware
   ```
