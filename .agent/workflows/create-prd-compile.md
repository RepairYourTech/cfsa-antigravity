---
description: Development methodology, phasing, and document compilation for the create-prd workflow
parent: create-prd
shard: compile
standalone: true
position: 4
pipeline:
  position: 2.4
  stage: architecture
  predecessors: [create-prd-security]
  successors: [decompose-architecture]
  skills: [performance-budgeting, pipeline-rubrics, prd-templates, tdd-workflow, technical-writer]
  calls-bootstrap: true
requires_map_columns: [Unit Tests, E2E Tests, CI/CD]
---

// turbo-all

# Create PRD — Compile

Document the development methodology and phasing strategy. Compile the architecture design document and engineering standards.

**Prerequisite**: Security model and integration points must be defined (from `/create-prd-security`). All tech stack decisions, system architecture, data strategy, and security model must be complete.

---

## 0. Map guard

Read the surface stack map from `.agent/instructions/tech-stack.md`. Check the following columns/categories for filled values:

| Map Location | Column/Category | Recovery | Why this matters |
|---|---|---|---|
| Per-Surface (any) | Unit Tests | Run `/create-prd-stack` to confirm unit testing framework, then bootstrap. | Development methodology (Step 8) needs framework-specific TDD patterns. |
| Per-Surface (any) | E2E Tests | Run `/create-prd-stack` to confirm E2E testing framework, then bootstrap. | Development methodology (Step 8) needs E2E-specific test conventions. |
| Cross-Cutting | CI/CD | Run `/create-prd-stack` to confirm CI/CD platform, then bootstrap. | Phasing strategy (Step 9) needs platform-specific pipeline patterns. |

> **Timing fallback**: During `/create-prd`, the map may be partially populated. If a cell is empty but the value was just confirmed in the current conversation (from `/create-prd-stack`), proceed using the conversation-confirmed value. Bootstrap will fill the map after `/create-prd` completes.

If cells are empty AND the value hasn't been confirmed in conversation → **HARD STOP**: tell the user to run `/create-prd-stack` first.

---

## 8. Development methodology

Read .agent/skills/tdd-workflow/SKILL.md and follow its methodology.

Document the agreed approach:

1. **Contract-first** — Zod schemas (or equivalent) before implementation
2. **TDD** — Failing tests before code
   Load the Unit Tests and E2E Tests skill(s) from the surface stack map per the skill loading protocol (`.agent/skills/prd-templates/references/skill-loading-protocol.md`).
3. **Vertical slices** — All surfaces per feature
4. **Spec layers** — IA → BE → FE pipeline
5. **Quality gates** — What must pass before merge

Write the completed `## Development Methodology` section to `docs/plans/architecture-draft.md` immediately after user confirmation.

## 9. Phasing strategy

Load the CI/CD skill(s) from the cross-cutting section per the skill loading protocol.

Break the feature inventory from `docs/plans/ideation/ideation-index.md` (MoSCoW Summary) into dependency-ordered phases.

> **This kit does not build MVPs.** Every phase ships production-grade code —
> fully tested, fully specified, fully accessible. Phases exist to manage
> dependency order and incremental delivery, not to defer quality.

1. **Phase 1 (Foundation)** — Infrastructure + core entities. Must-haves that everything else depends on. Production-grade from day one. Phase 1 must begin with the `00-infrastructure` slice (CI/CD, environment, deployment, scaffolding, database). After this slice, `/verify-infrastructure` must pass before any feature slice begins. After the auth slice, `/verify-infrastructure` must pass again. Document these as hard gates.
2. **Phase 2 (Core Experience)** — Primary user flows built on the foundation. Same quality bar as Phase 1.
3. **Phase 3+ (Expansion)** — Additional features, integrations, scale. Same standards.

For multi-surface projects, consider whether phases are **per-surface** or **cross-surface**. The decision depends on whether surfaces have independent value.

Each phase should have a rough timeline estimate and must pass the full validation suite before the next phase begins.

**Present to user**: Show the phasing breakdown. Walk through the dependency order. Ask:
- "Are there features in Phase 2 that actually depend on something not in Phase 1?"
- "Is the Phase 1 scope achievable without cutting quality?"

Refine based on discussion before proceeding.

Write the completed `## Phasing Strategy` section to `docs/plans/architecture-draft.md` immediately after user confirmation.

## 9.5. Lock project directory structure

Based on the locked tech stack, generate a canonical directory tree.

1. Build the tree showing where source code, contracts/schemas, tests, config files, and build output live — tailored to the confirmed stack
2. Present the tree to the user with one-line descriptions per top-level directory. Adapt the tree to the actual stack — e.g., a CLI project won't have `components/`, a monorepo will have `apps/` and `packages/`
3. Build an architecture separation table mapping each concern to its directory and runtime
4. **Present to user**: Show the directory tree and architecture table. Ask: "Does this structure match your expectations?" **Do not proceed until explicit approval.**
5. After approval, fire bootstrap with: `PROJECT_STRUCTURE`, `ARCHITECTURE_TABLE`, `CONTRACTS_DIR`, `BUILD_OUTPUT_DIR`
6. Append a `## Directory Structure` section to `docs/plans/architecture-draft.md`

> If invoked standalone, surface via `notify_user`.

## 10. Compile architecture design document

Read .agent/skills/technical-writer/SKILL.md and follow its methodology.

Read .agent/skills/technical-writer/SKILL.md and apply its clarity and structure standards throughout document compilation.

Read `docs/plans/architecture-draft.md` as the authoritative source. Read `.agent/skills/prd-templates/references/architecture-design-template.md` for the document structure. Compile it into `docs/plans/YYYY-MM-DD-architecture-design.md` (use today's date).

> **Depth rule**: Each section must contain the full detail gathered during steps 3-9. If a section is under 200 words, it's almost certainly too shallow. Apply the two-implementer test.

## 10.5. Performance budget interview

Read `.agent/skills/performance-budgeting/SKILL.md` and follow its Interview Protocol for all applicable axes.

Surface conditioning rules and the write-as-you-go rule are defined in the skill.

Write each confirmed axis to `docs/plans/ENGINEERING-STANDARDS.md` immediately after confirmation.

**Present to user**: Summarise all confirmed performance budgets. Ask: "Any axis you want to tighten, loosen, or add?"

## 11. Compile Engineering Standards

Read .agent/skills/technical-writer/SKILL.md and follow its methodology.

Read `.agent/skills/prd-templates/references/engineering-standards-template.md` for the document structure. Create `docs/plans/ENGINEERING-STANDARDS.md` — the non-negotiable quality bar for the project. Fill in concrete values based on tech stack decisions from step 3 and methodology from step 8. **No TBDs allowed.**

## 12. Request review and propose next steps

Read `.agent/skills/pipeline-rubrics/SKILL.md` and follow its pre-flight self-check protocol for the Architecture rubric.

Run a pre-flight self-check before presenting. Read `.agent/skills/pipeline-rubrics/references/architecture-rubric.md` and apply each of the 15 dimensions as a self-check.

> ❌ **STOP** — If any dimension scores ⚠️ or ❌, do not call `notify_user`. Fix the gap now and re-run the self-check until all 15 dimensions are ✅.

Call `notify_user` presenting:
- `docs/plans/YYYY-MM-DD-architecture-design.md` (use the actual dated filename)
- `docs/plans/ENGINEERING-STANDARDS.md`
- The self-check results (all 15 dimensions with scores)
- Any gaps resolved during the self-check

> **Both documents must be approved before proceeding. Do NOT proceed until the user sends a message explicitly approving this output.**

### Proposed next steps

**Hard gate**: Run `/audit-ambiguity architecture`. This is unconditionally mandatory — the self-check above cannot replace it.
