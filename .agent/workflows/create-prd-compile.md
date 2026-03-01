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
  skills: [technical-writer, prd-templates, pipeline-rubrics]
  calls-bootstrap: true
---

// turbo-all

# Create PRD — Compile

Document the development methodology and phasing strategy. Compile the architecture design document and engineering standards.

**Prerequisite**: Security model and integration points must be defined (from `/create-prd-security`). All tech stack decisions, system architecture, data strategy, and security model must be complete.

---

## 8. Development methodology

Document the agreed approach:

1. **Contract-first** — Zod schemas (or equivalent) before implementation
2. **TDD** — Failing tests before code
3. **Vertical slices** — All surfaces per feature
4. **Spec layers** — IA → BE → FE pipeline
5. **Quality gates** — What must pass before merge

## 9. Phasing strategy

Break the feature inventory from `vision.md` into dependency-ordered phases.

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

Read `docs/plans/architecture-draft.md` as the authoritative source. Read `.agent/skills/prd-templates/references/architecture-design-template.md` for the document structure. Compile it into `docs/plans/YYYY-MM-DD-architecture-design.md` (use today's date).

> **Depth rule**: Each section must contain the full detail gathered during steps 3-9. If a section is under 200 words, it's almost certainly too shallow. Apply the two-implementer test.

## 11. Compile Engineering Standards

Read `.agent/skills/prd-templates/references/engineering-standards-template.md` for the document structure. Create `docs/plans/ENGINEERING-STANDARDS.md` — the non-negotiable quality bar for the project. Fill in concrete values based on tech stack decisions from step 3 and methodology from step 8. **No TBDs allowed.**

## 12. Request review and propose next steps

Run a pre-flight self-check before presenting. Read `.agent/skills/pipeline-rubrics/references/architecture-rubric.md` and apply each of the 9 dimensions as a self-check. For any dimension scoring ⚠️ or ❌, fix it now before presenting.

Call `notify_user` presenting:
- `docs/plans/YYYY-MM-DD-architecture-design.md` (use the actual dated filename)
- `docs/plans/ENGINEERING-STANDARDS.md`
- The self-check results (all 9 dimensions with scores)
- Any gaps resolved during the self-check

> **Both documents must be approved before proceeding. Do NOT proceed until the user sends a message explicitly approving this output.**

### Proposed next steps

**Hard gate**: Run `/audit-ambiguity architecture`. This is unconditionally mandatory — the self-check above cannot replace it.
