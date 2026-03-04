---
description: Progress check, skill loading, slice reading, parallel mode detection, and contract writing for the implement-slice workflow
parent: implement-slice
shard: setup
standalone: true
position: 1
pipeline:
  position: 7.1
  stage: implementation
  predecessors: [plan-phase]
  successors: [implement-slice-tdd]
  skills: [session-continuity, tdd-workflow, parallel-agents, parallel-feature-development]
  calls-bootstrap: true
---

# Implement Slice — Setup

Check progress state, load skills, read the slice, detect parallel mode, and write the contract.

**Prerequisite**: Phase plan must exist with slice acceptance criteria. If not, tell the user to run `/plan-phase` first.

---

## -1. Placeholder verification (CRITICAL — run before anything else)

Scan for unfilled placeholders before writing code. Read each file and scan for `{{`:

1. `AGENTS.md`
2. `GEMINI.md`
3. `.agent/instructions/workflow.md`
4. `.agent/instructions/commands.md`
5. `.agent/instructions/structure.md`
6. `.agent/instructions/patterns.md`
7. `.agent/instructions/tech-stack.md`

**If ANY `{{PLACEHOLDER}}` found** → STOP. Tell user which files contain unfilled placeholders with remediation:

| Unfilled pattern | Remediation |
|-----------------|-------------|
| `AGENTS.md`, `GEMINI.md`, `workflow.md`, `commands.md`, `tech-stack.md` | Run `/create-prd` |
| `structure.md` (`{{PROJECT_STRUCTURE}}`, `{{ARCHITECTURE_TABLE}}`) | Run `/create-prd-compile` Step 9.5 |
| `patterns.md` (`{{FRAMEWORK_PATTERNS}}`) | Run `/bootstrap-agents-provision` |

Only proceed when zero `{{` patterns remain in all seven files.

---

## 0. Check progress state

Read `.agent/skills/session-continuity/protocols/01-session-resumption.md` and follow the **Session Resumption Protocol**. Also read `.agent/skills/session-continuity/SKILL.md` for cross-session tracking.

Verify previous slice was fully marked complete before starting this one.

## 0.5. Load bundled skills

Read these skill SKILL.md files: `tdd-workflow`, `error-handling-patterns`, `git-workflow`, `code-review-pro`, `testing-strategist`, `clean-code`, `logging-best-practices`, `minimalist-surgical-development`, `systematic-debugging`. All are in `.agent/skills/[name]/SKILL.md`.

Read .agent/skills/{{LANGUAGE_SKILL}}/SKILL.md and follow its language conventions.
If this slice includes BE tasks: Read .agent/skills/{{ORM_SKILL}}/SKILL.md and follow its migration and schema conventions. Skip if no BE tasks or `{{ORM_SKILL}}` is not provisioned.
Read .agent/skills/{{UNIT_TESTING_SKILL}}/SKILL.md and follow its test writing conventions.
If this slice includes FE tasks: Read .agent/skills/{{STATE_MANAGEMENT_SKILL}}/SKILL.md and follow its state management conventions. Skip if no FE tasks or `{{STATE_MANAGEMENT_SKILL}}` is not provisioned.

Use `find-skills` to discover a test framework skill if needed.

If this slice introduces a new dependency, read `.agent/workflows/bootstrap-agents.md` and execute with the new value.

---

## 1. Read the slice

Read the slice's acceptance criteria from the phase plan.

## 1.5. Check for parallel mode

Scan the slice's tasks for surface tags (`BE`, `FE`, `QA`):

- **No tags found** → proceed sequentially (steps 2–7 in the tdd shard)
- **Tags found** → enter parallel mode:

### Parallel mode dispatch (TDD order)

Read `.agent/skills/parallel-agents/SKILL.md` and `.agent/skills/parallel-feature-development/SKILL.md` for dispatch protocol and file ownership rules.

| Phase | Agent | Responsibility | Depends On |
|-------|-------|---------------|------------|
| 0 | Orchestrator | Contracts/schemas (untagged tasks) | — |
| 1 | QA (RED) | Write comprehensive failing tests | Phase 0 |
| 2 | BE + FE (parallel) | Write code to make tests pass | Phase 1 |
| 3 | QA (GREEN) | Verify all tests pass, anti-cheat audit | Phase 2 |
| 4 | Orchestrator | Iterative correction loop if needed | Phase 3 |

> **Tests are the rock. Code is malleable.**

1. **Untagged tasks first** — Contract/schema work runs sequentially by orchestrator (step 2)
2. **QA-RED** — QA agent writes failing tests for ALL acceptance criteria. Read `.agent/skills/session-continuity/protocols/09-parallel-claim.md`. Tests MUST fail. Every contract field and error type covered.
3. **BE + FE parallel (GREEN)** — Code against tests and contracts. Annotate spec-gap decisions with `// DECISION: [what and why]`.
4. **QA-GREEN** — Re-verify, anti-cheat check, add integration tests.
5. **Correction loop** — If QA-GREEN fails, re-dispatch BE/FE → QA-GREEN until pass.
6. **All pass** → proceed to step 6.5 (Synthesis) in the tdd shard. Use the parallel-agents skill's workstream decomposition to confirm file isolation across agents.

Log each dispatch phase to `.agent/progress/slices/phase-NN-slice-NN.md` `## Dispatch Log`.

---

## 2. Write the contract (Zod schema)

Before writing the schema, locate the BE endpoint(s) referenced by this slice's acceptance criteria. For each endpoint:
1. Read the BE spec section that defines it. Copy the typed Zod contract completely — every request field, response field, error code, and validation rule.
2. Read the slice's acceptance criteria. Add any additional request/response shapes required by behavioral assertions that are not already present in the BE contract (e.g., query parameters implied by filter behavior, UI-specific error payloads).
3. Verify the combined schema covers every acceptance criterion and every BE contract field. Flag any drift between the BE spec and the IA shard it implements.

Read .agent/skills/{{LANGUAGE_SKILL}}/SKILL.md and follow its language conventions.

Define request/response shapes as Zod schemas in the contracts directory (see `.agent/instructions/structure.md`). This is the source of truth.

### Propose next step

Contract written. Next: `/implement-slice-tdd` for the Red→Green→Refactor cycle.

> If invoked standalone, surface via `notify_user`.
