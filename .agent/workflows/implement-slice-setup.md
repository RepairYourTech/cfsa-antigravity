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
  skills: [parallel-agents, parallel-feature-development, session-continuity]
  calls-bootstrap: true
---

# Implement Slice — Setup

Check progress state, load skills, read the slice, detect parallel mode, and write the contract.

**Prerequisite**: Phase plan must exist with slice acceptance criteria. If the phase plan file does not exist → **STOP**: tell the user to run `/plan-phase` first.

---

## -1. Placeholder verification (CRITICAL — run before anything else)

Scan the surface stack map in `.agent/instructions/tech-stack.md` for completeness before writing code.

Verify:
1. The slice's surface row has filled values for **all** required columns (Languages, Databases, BE Frameworks, FE Frameworks, ORMs, Unit Tests, E2E Tests, FE Design, State Mgmt)
2. Cross-cutting categories have filled values (Auth, Security, CI/CD, Hosting, Accessibility)
3. Commands section in `.agent/instructions/commands.md` has non-template values

Also scan these instruction files for any remaining template markers:
- `.agent/instructions/structure.md`
- `.agent/instructions/patterns.md`
- `.agent/instructions/tech-stack.md`

**If the map has empty cells for this slice's surface** → STOP. Tell user which cells are empty with remediation:

| Empty Cell | Remediation |
|---|---|
| Languages / Databases / Frameworks | Run `/create-prd-stack` first |
| Commands section | Run `/bootstrap-agents` |
| `structure.md` (project structure) | Run `/create-prd-compile` Step 9.5 |
| `patterns.md` (framework patterns) | Run `/bootstrap-agents-provision` |

Only proceed when the map is fully populated for this slice's surface.

---

## 0. Check progress state

Read `.agent/skills/session-continuity/protocols/01-session-resumption.md` and follow the **Session Resumption Protocol**. Also read `.agent/skills/session-continuity/SKILL.md` for cross-session tracking.

Verify previous slice was fully marked complete before starting this one.

## 0.5. Load bundled skills

Read these skill SKILL.md files: `tdd-workflow`, `error-handling-patterns`, `git-workflow`, `code-review-pro`, `testing-strategist`, `clean-code`, `logging-best-practices`, `minimalist-surgical-development`, `systematic-debugging`. All are in `.agent/skills/[name]/SKILL.md`.

Determine which surface this slice belongs to from the phase plan. Read the surface stack map.

Read `.agent/skills/prd-templates/references/skill-loading-protocol.md` and load skills for this slice's surface: Languages, Unit Tests, and conditionally ORMs (if BE tasks) and State Mgmt (if FE tasks).

Use `find-skills` to discover a test framework skill if needed.

If this slice introduces a new dependency, read `.agent/workflows/bootstrap-agents.md` and execute with the new value. **HARD GATE**: Follow the bootstrap verification protocol (`.agent/skills/prd-templates/references/bootstrap-verification-protocol.md`).

---

## 1. Read the slice

Read the slice's acceptance criteria from the phase plan.

## 1.25. Load spec context

For each acceptance criterion, trace its spec citation (e.g., `[BE §3.2]`, `[FE §LoginForm]`) back to the source spec:

1. Read the full §section from every cited BE spec — not just the contract shape, but the error handling, edge cases, access control rules, rate limits, and concurrency notes
2. Read the full §section from every cited FE spec — component props, states, interactions, responsive behavior, accessibility rules
3. Read any IA shard sections cited by the BE spec's Source Map — especially `## Edge Cases` and `## Access Control`

This context persists throughout the TDD cycle. The acceptance criteria define WHAT to test; the spec context defines HOW DEEP to test it.

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

Read `.agent/skills/parallel-agents/SKILL.md` and follow its TDD-Order Dispatch methodology for execution order and file isolation.

Log each dispatch phase to `.agent/progress/slices/phase-NN-slice-NN.md` `## Dispatch Log`.

---

## 2. Write the contract ({{CONTRACT_LIBRARY}} schema)

Before writing the schema, locate the BE endpoint(s) referenced by this slice's acceptance criteria. For each endpoint:
1. Read the BE spec section that defines it. Copy the typed {{CONTRACT_LIBRARY}} contract completely — every request field, response field, error code, and validation rule.
2. Read the slice's acceptance criteria. Add any additional request/response shapes required by behavioral assertions that are not already present in the BE contract (e.g., query parameters implied by filter behavior, UI-specific error payloads).
3. Verify the combined schema covers every acceptance criterion and every BE contract field. Flag any drift between the BE spec and the IA shard it implements.

Load the Languages skill(s) from this slice's surface row per the skill loading protocol.

Define request/response shapes as {{CONTRACT_LIBRARY}} schemas in the contracts directory (see `.agent/instructions/structure.md`). This is the source of truth.

### Next step

**STOP** — do NOT proceed to any other workflow. The only valid next step is `/implement-slice-tdd`.

> If invoked standalone, surface via `notify_user` and wait for user confirmation.
