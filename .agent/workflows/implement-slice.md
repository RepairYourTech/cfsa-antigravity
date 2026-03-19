---
description: TDD vertical slice — Red→Green→Refactor across all four surfaces
pipeline:
  position: 7
  stage: implementation
  predecessors: [plan-phase]
  successors: [validate-phase]
  loop: true # repeats per slice within a phase
  skills: [clean-code, code-review-pro, minimalist-surgical-development, parallel-agents, parallel-debugging, parallel-feature-development, session-continuity, systematic-debugging, tdd-workflow, verification-before-completion]
  calls-bootstrap: true # may discover new dependencies during implementation
shards: [implement-slice-setup, implement-slice-tdd]
---

// turbo-all

# Implement Slice

Implement a single vertical slice using strict TDD: Red → Green → Refactor.

**Input**: A slice from the phase plan with acceptance criteria
**Output**: Working code across all surfaces with passing tests

---

## Shard Overview

| # | Shard | What It Does |
|---|-------|-------------|
| 1 | [`implement-slice-setup`](.agent/workflows/implement-slice-setup.md) | Checks progress state, loads skills, reads slice, checks for parallel mode, writes contracts |
| 2 | [`implement-slice-tdd`](.agent/workflows/implement-slice-tdd.md) | Executes Red→Green→Refactor, validates, updates all progress tracking files |

---

## Orchestration

### Step A — Run `.agent/workflows/implement-slice-setup.md`

Checks progress state and session continuity, loads all bundled skills, reads the slice acceptance criteria, determines if parallel mode applies, and writes the contract ({{CONTRACT_LIBRARY}} schema). If parallel mode is detected, dispatches agents for the TDD cycle.

### Step B — Run `.agent/workflows/implement-slice-tdd.md`

Executes the TDD cycle (RED: write failing tests → GREEN: implement → REFACTOR: improve quality), runs full validation, handles synthesis for parallel mode, and updates all 4 progress tracking targets (slice file, phase file, index, memory).

---

## Quality Gate

**BLOCKING GATE** — You may NOT call `notify_user` until ALL items pass:
- [ ] All tests pass (Test Cmd from surface stack map)
- [ ] Full validation passes (Validation Cmd from surface stack map)
- [ ] All 4 progress tracking files updated (slice, phase, index, memory)
- [ ] Each tracking file verified by re-reading after edit

## Completion Gate (MANDATORY)

Before reporting completion to the user:

1. **Memory check** — Apply rule `memory-capture`. Write any patterns, decisions, or blockers from this workflow to `.agent/progress/memory/`. If nothing to write, confirm: "No new patterns/decisions/blockers."
2. **Progress update** — Update `.agent/progress/` tracking files if they exist.
3. **Session log** — Write session entry to `.agent/progress/sessions/`.
