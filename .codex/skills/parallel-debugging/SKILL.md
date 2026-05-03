---
name: parallel-debugging
description: Leverage concurrent terminal background processes to debug multiple independent failures simultaneously using ACH methodology. Use when you have 2+ failures across different subsystems.
---

# Parallel Debugging via Concurrent Streams

## Overview

When a test suite or system has multiple independent failures, investigating them sequentially in a single terminal is slow. This skill teaches you to spawn multiple concurrent workstreams (e.g. background bash processes) per failure domain, investigating them simultaneously.

**Core principle:** This is a concurrency layer on top of `systematic-debugging`, not a replacement. You must still follow the full four-phase debugging process for each stream.

## When to Use

- 2+ test failures across **different files or subsystems**
- Multiple error types in logs from **independent components**
- Post-refactor breakage across **unrelated modules**
- Production incidents affecting **separate services**

## When NOT to Use

- **Related failures** — fixing one might fix others (investigate together first)
- **Shared state** — concurrent terminal commands might interfere (e.g. mutating the same database table)
- **Unknown scope** — you don't know what's broken yet (explore first, then go concurrent)
- **Single root cause suspected** — one investigation is faster

**Decision test:** If fixing Bug A could possibly affect Bug B, they are NOT independent. Investigate sequentially to avoid tool tool conflict.

## The Protocol

### Phase 1: Hypothesis Generation (ACH)

Before dispatching agents, generate competing hypotheses:

1. **List all failures** with their error messages, stack traces, and last-known-good state
2. **Group by domain** — which failures share files, state, or call paths?
3. **Independence test** — for each group, ask: "Could fixing group A change group B's behavior?"
   - **Yes** → merge into one investigation
   - **No** → independent, can parallelize

```markdown
## Failure Analysis

| # | Failure | Domain | Files | Independent? |
|---|---------|--------|-------|-------------|
| 1 | `auth.test.ts` — token expired | Auth | `src/auth/*` | ✅ |
| 2 | `api.test.ts` — 500 on /users | API handler | `src/api/users.ts` | ✅ |
| 3 | `api.test.ts` — 500 on /users/me | API handler | `src/api/users.ts` | ❌ shares files with #2 |
| 4 | `db.test.ts` — connection refused | Database | `src/db/*` | ✅ |

→ Dispatch: 3 agents (merge #2 + #3)
```

### Phase 2: Concurrent Investigation

For each independent failure domain, start a concurrent investigation stream:

1. **Background Terminals**: Use your `WaitMsBeforeAsync` flag to run `npm run test -- path/to/failing.test.ts` in the background. Do this simultaneously for each independent domain.
2. **Concurrent Analysis**: Check the status of all background commands concurrently. Read the logs side-by-side.

**Constraint per stream:**
- Mentally partition your execution space: Workstream 1 only looks at Files A and B. Workstream 2 only looks at Files C and D.
- Do NOT try to `replace_file_content` without strict certainty that the files don't overlap.
- Every stream still requires the full `systematic-debugging` methodology: gather evidence, find patterns, form hypothesis, test minimally.

### Phase 3: Result Synthesis

After all agents complete:

```markdown
## Debug Synthesis

### Results
| Agent | Domain | Root Cause | Fix | Confidence | Cross-Domain? |
|-------|--------|-----------|-----|------------|---------------|
| 1 | Auth | Expired token TTL config | Updated config | HIGH | No |
| 2+3 | API | Missing null check on user.email | Added guard | HIGH | No |
| 4 | Database | Connection pool exhausted | Increased pool size | MEDIUM | Possible |

### Cross-Domain Discoveries
[Agent 4 noted: connection pool exhaustion could cause API timeouts under load.
This may be related to #2+3 under different conditions. Monitor after fix.]

### Integration Verification
- [ ] All agent fixes applied
- [ ] No file conflicts between agents
- [ ] Full test suite passes (not just fixed tests)
- [ ] Cross-domain discoveries documented as issues
```

**Synthesis rules:**
1. **HIGH confidence + no cross-stream overlap** → apply fixes concurrently using batched `replace_file_content` calls.
2. **MEDIUM confidence** → apply sequentially and test between each.
3. **Cross-stream discovery** → stop concurrent execution, investigate sequentially.

### Phase 4: Integration Verification

**Non-negotiable after merging all fixes:**

1. Run full test suite (not just the tests each agent fixed)
2. Check for new failures introduced by fixes
3. Verify no files were modified by multiple agents
4. Document cross-domain discoveries as issues for future investigation

## Example: Real Session

**Scenario:** 6 failures across 3 files after refactoring

| File | Failures | Domain |
|------|----------|--------|
| `agent-tool-abort.test.ts` | 3 (timing issues) | Abort logic |
| `batch-completion.test.ts` | 2 (tools not executing) | Batch processing |
| `race-conditions.test.ts` | 1 (execution count = 0) | Race condition handling |

**Independence test:** Abort logic, batch processing, and race conditions are separate subsystems. ✅

**Dispatch:** Start 3 concurrent `run_command` tests in the background using `WaitMsBeforeAsync`, each tracing their subsystem. Check `command_status` concurrently for all 3.

**Results:**
- Stream 1: Replaced arbitrary timeouts with event-based waiting
- Stream 2: Fixed event structure bug (`threadId` in wrong place)
- Stream 3: Added wait for async tool execution to complete

**Integration:** All fixes independent, applied via batched `multi_replace_file_content` calls, full suite tested and green.

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| Parallelizing related failures | One fix breaks another stream's assumptions | Independence test FIRST |
| Mismatched file edits | `replace_file_content` fails with hash mismatched | Ensure file scopes are 100% independent |
| Skipping systematic-debugging phases | Guessing instead of investigating | Run the actual tests concurrently |
| Running tests on shared DB | State leaks between background tests | Mock DB or run sequentially |
| Skipping integration verification | Silent regressions from fix interactions | Full suite after merge |
