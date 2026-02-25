---
name: parallel-debugging
description: Dispatch parallel agents to debug multiple independent failures simultaneously using ACH methodology. Use when you have 2+ failures across different subsystems — each agent follows systematic-debugging individually.
---

# Parallel Debugging

## Overview

When a test suite or system has multiple independent failures, investigating them sequentially is wasteful. This skill dispatches one agent per failure domain, each following the `systematic-debugging` skill internally, then arbitrates results.

**Core principle:** This is an orchestration layer on top of `systematic-debugging`, not a replacement. Every agent follows the full four-phase debugging process. Parallelism is about scheduling, not shortcuts.

## When to Use

- 2+ test failures across **different files or subsystems**
- Multiple error types in logs from **independent components**
- Post-refactor breakage across **unrelated modules**
- Production incidents affecting **separate services**

## When NOT to Use

- **Related failures** — fixing one might fix others (investigate together first)
- **Shared state** — agents would interfere (same files, same DB tables, same cache)
- **Unknown scope** — you don't know what's broken yet (explore first, then parallelize)
- **Single root cause suspected** — one investigation is faster than three

**Decision test:** If fixing Bug A could possibly affect Bug B, they are NOT independent. Investigate sequentially.

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

### Phase 2: Parallel Dispatch

For each independent failure domain, dispatch an agent with:

```markdown
## Agent: Debug [Domain Name]

### Failures to Investigate
[List specific test names, error messages, stack traces]

### Skill to Follow
Follow `systematic-debugging` — complete all four phases:
1. Root Cause Investigation (read errors, reproduce, check changes, gather evidence)
2. Pattern Analysis (find working examples, compare)
3. Hypothesis and Testing (form single hypothesis, test minimally)
4. Implementation (create failing test, implement fix, verify)

### Scope Constraints
- ONLY modify files in: [explicit file list]
- Do NOT modify: [files owned by other agents]
- If you discover the root cause is in a shared file, STOP and report — do not fix

### Return
1. Root cause identified (with evidence)
2. Fix applied (with test)
3. Confidence level: HIGH / MEDIUM / LOW
4. Any discoveries that affect other domains
```

**Critical constraints per agent:**
- Each agent gets an explicit file ownership list
- No agent may modify files outside their list
- If root cause is in shared code → agent reports back, does NOT fix
- Every agent follows the full `systematic-debugging` four-phase process

### Phase 3: Result Arbitration

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

**Arbitration rules:**
1. **HIGH confidence + no cross-domain** → apply fix
2. **MEDIUM confidence** → review fix manually before applying
3. **LOW confidence** → escalate to human
4. **Cross-domain discovery** → create tracking issue, investigate sequentially

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

**Dispatch:** 3 agents, each following `systematic-debugging`

**Results:**
- Agent 1: Replaced arbitrary timeouts with event-based waiting
- Agent 2: Fixed event structure bug (`threadId` in wrong place)
- Agent 3: Added wait for async tool execution to complete

**Integration:** All fixes independent, no conflicts, full suite green.

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| Parallelizing related failures | One fix breaks another agent's assumptions | Independence test FIRST |
| Skipping systematic-debugging phases | Agents guess instead of investigating | Explicitly require all 4 phases |
| No file ownership boundaries | Agents edit same files, create conflicts | Explicit file lists per agent |
| Trusting LOW confidence fixes | Fragile fixes that break under different conditions | Escalate to human review |
| Skipping integration verification | Silent regressions from fix interactions | Full suite after merge |
