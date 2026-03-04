---
name: parallel-agents
description: Orchestrate concurrent analysis or implementation across independent domains. Use when a task can be decomposed into independent workstreams (e.g., via simultaneous tool calls or background processes) — spec writing, code review, security audit, feature implementation.
---

# Parallel Agents & Concurrent Tool Execution

## Overview

Some tasks are naturally parallelizable — they have independent domains that don't share state. As a highly-capable agent, you can drastically cut wall-clock time by leveraging **concurrent tool execution** (e.g., running multiple `view_file` calls, `grep_search` calls, or background terminal commands simultaneously) instead of investigating sequentially.

**Core principle:** Parallelism is a scheduling optimization, not a quality shortcut. Every concurrent workstream follows the same quality standards as a sequential task.

## When to Use

- **Multi-surface implementation** — A slice has independent surfaces (DB, API, UI, admin) that don't share implementation logic
- **Multi-domain analysis** — Security audit + performance review + accessibility audit on the same codebase
- **Spec writing** — Multiple IA shards need specs written from the same architecture doc
- **Code review** — Large PR touches independent subsystems
- **Debugging** — Multiple independent failures (see `parallel-debugging` skill for the full protocol)

## When NOT to Use

- Tasks share mutable state or edit the same files
- Later tasks depend on output of earlier tasks (use sequential pipeline instead)
- You don't fully understand the task decomposition yet (investigate first)
- Simple task that one agent handles in < 5 minutes

## The Protocol

### 1. Decompose

Break the task into independent domains. Each domain must satisfy ALL of:

| Requirement | Why |
|-------------|-----|
| **Independent files** — workstreams do not mutate the same file | Prevents race conditions and tool call hash mismatches |
| **Independent state** — no shared mutable resources (DB tables, caches) | Prevents race conditions |
| **Self-contained context** — stream can run without waiting on another's output | Prevents blocking |
| **Clear deliverable** — you can verify the stream's work in isolation | Prevents integration surprises |

If any requirement fails → that domain can't be parallelized. Run it sequentially.

### 2. Define Workstream Profiles

Instead of giving yourself a single massive objective, explicitly define the scope for each concurrent stream conceptually:

```markdown
## Workstream: [Domain Name]
### Scope
[Exactly what this stream owns — files, features, concerns]

### Context
[Everything needed — paste relevant code, specs, error messages]

### Constraints
- Do NOT mutate files outside the defined scope
- Follow rule: boundary-not-placeholder for cross-stream dependencies
```

**Scope quality rules:**
- ✅ **Focused** — one clear problem domain
- ✅ **Constrained** — explicit file/scope boundaries
- ❌ **Shared Mutable State** — running `replace_file_content` on the same file concurrently will fail or corrupt data.

### 3. Concurrent Execution

Launch the workstreams simultaneously using your concurrent tool execution capabilities.
For example, if testing and formatting code, you might run `npm run test` in one background terminal and `npx prettier --write` in another, checking the statuses of both instead of waiting for one to finish before starting the other.
When making file edits, batch disjoint `replace_file_content` tool calls in the same turn.

### 4. Synthesize

After ALL concurrent streams yield results, synthesize them into a single coherent picture before proceeding:

```markdown
## Concurrent Synthesis

### Task Summary
[What was accomplished across all workstreams]

### Findings by Domain
| Domain | Finding/Result |
|--------|----------------|
| Stream 1 | [what was found] |
| Stream 2 | [what was found] |

### Consolidated Actions
1. **Critical**: [From Stream X]
2. **Important**: [From Stream Y]

### Integration Verification
- [ ] No file conflicts during concurrent editing
- [ ] Full test suite passes
- [ ] Changes reviewed for consistency
```

### 5. Verify Integration

**Non-negotiable:** After merging all agent outputs:
1. Run the full validation suite (not just individual agent tests)
2. Check for contradictions between agent recommendations
3. Verify no files were modified by multiple agents
4. Spot-check agent work — agents can make systematic errors

## Task Decomposition Archetypes

These are suggested ways to slice concurrent workstreams:

| Archetype | Domain Focus | Typical Sub-Skills |
|-----------|--------------|-------------------|
| **Security Review** | Vulnerabilities, RBAC, input validation | security-scanning, code-review |
| **Test Quality** | Test coverage, edge cases | tdd-workflow |
| **Backend Implementation** | API design, data layer | rest-api-design, surrealdb-expert |
| **Frontend Implementation** | UI components, accessibility | frontend-design, accessibility |
| **Performance Audit** | Bottlenecks, bundle size | web-performance-optimization |
| **Documentation** | API docs, architecture docs | — |
| **ACH Debugging** | Root cause investigation | systematic-debugging, parallel-debugging |

## Integration with Kit

- **With `parallel-feature-development`:** When making concurrent file edits, use the strict file ownership protocol to prevent tool call conflicts (e.g. failing `replace_file_content` because the file hash changed).
- **With `session-continuity` Protocol 9:** When you claim both a `BE` and `FE` task concurrently, the `files:` blocks are your guarantee that you can execute edits simultaneously safely.
- **With `boundary-not-placeholder`:** If a concurrent stream hits a missing dependency, use `// BOUNDARY:` stubs. Don't block the stream indefinitely.

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| Concurrent edits to same file | Overwrites, hash mismatches | One stream per file strictly |
| No synthesis step | Contradictory logic | Always synthesize before committing changes |
| Shared dependencies not frozen | Build breaks unexpectedly | Use interface contracts first |

## TDD-Order Dispatch (Slice Implementation)

### Triggering Condition

Enter parallel mode when the slice's tasks contain surface tags (`BE`, `FE`, `QA`). Proceed sequentially when no tags are found.

### Core Principle

> **Tests are the rock. Code is malleable.** Tests encode the acceptance criteria and must be comprehensive. Code adapts to pass tests, never the reverse.

### 5-Phase Dispatch Table

| Phase | Agent | Responsibility | Depends On |
|-------|-------|----------------|------------|
| 0 | Orchestrator | Contracts/schemas (untagged tasks) | — |
| 1 | QA (RED) | Write comprehensive failing tests | Phase 0 |
| 2 | BE + FE (parallel) | Write code to make tests pass | Phase 1 |
| 3 | QA (GREEN) | Verify all tests pass, anti-cheat audit | Phase 2 |
| 4 | Orchestrator | Iterative correction loop if needed | Phase 3 |

### Dispatch Instructions

1. **Untagged tasks first** — Contract/schema work runs sequentially by orchestrator (Phase 0) before any tagged dispatch.
2. **QA-RED** — QA agent writes comprehensive failing tests for ALL acceptance criteria. Tests MUST fail. Read `.agent/skills/session-continuity/protocols/09-parallel-claim.md`. Every contract field and error type covered.
3. **BE + FE parallel** — Code against tests and contracts simultaneously. Annotate spec-gap decisions with `// DECISION: [what and why]`.
4. **QA-GREEN** — Re-verify all tests pass, anti-cheat check, add integration tests.
5. **Iterative loop rule** — If QA-GREEN fails → re-dispatch BE/FE → QA-GREEN again → repeat until all pass.
6. **File independence check** — Verify no two tagged tasks touch the same files before dispatching (prevents tool call hash mismatches).

### Progress Logging

Log each dispatch phase to `.agent/progress/slices/phase-NN-slice-NN.md` under `## Dispatch Log`.
