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

**Prerequisite**: Security model and integration points must be defined (from `/create-prd-security`).

Verify `docs/plans/architecture-draft.md` exists. If it does not → **STOP**: "architecture-draft.md is missing. Previous shards should have created it. Run `/create-prd-architecture` first."

---

## 0. Map guard

Follow the map guard protocol (`.agent/skills/prd-templates/references/map-guard-protocol.md`). Required cells for this shard:

| Map Location | Column/Category | Why this matters |
|---|---|---|
| Per-Surface (any) | Unit Tests | Development methodology (Step 8) needs framework-specific TDD patterns. |
| Per-Surface (any) | E2E Tests | Development methodology (Step 8) needs E2E-specific test conventions. |
| Cross-Cutting | CI/CD | Phasing strategy (Step 9) needs platform-specific pipeline patterns. |

**HARD GATE** — If ANY required cell is empty → STOP. No timing fallbacks. No conversation-confirmed values. See map guard protocol for recovery.

Read the engagement tier protocol (`.agent/skills/prd-templates/references/engagement-tier-protocol.md`) — apply the tier behavior for compile decisions.

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

Write the completed `## Development Methodology` section to `docs/plans/architecture-draft.md` immediately after user confirmation. Follow the write verification protocol (`.agent/skills/prd-templates/references/write-verification-protocol.md`).

## 9. Phasing strategy

Load the CI/CD skill(s) from the cross-cutting section per the skill loading protocol.

Break the feature inventory into dependency-ordered phases. Use **two sources**:

1. **MoSCoW priorities** from `docs/plans/ideation/ideation-index.md` (MoSCoW Summary) — determines Must/Should/Could classification
2. **Domain Digest** from `docs/plans/architecture-draft.md` (`## Ideation Digest`) — if it exists, use its per-domain feature counts, sub-domain counts, and cross-domain dependencies to inform phase complexity sizing and dependency ordering. A domain with 15 features and 3 sub-domains requires more phase capacity than one with 4 features.

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

Follow the decision confirmation protocol (`.agent/skills/prd-templates/references/decision-confirmation-protocol.md`) — do not write until explicitly confirmed.

Write the completed `## Phasing Strategy` section to `docs/plans/architecture-draft.md` immediately after user confirmation. Follow the write verification protocol (`.agent/skills/prd-templates/references/write-verification-protocol.md`).

## 9.5. Lock project directory structure

Based on the locked tech stack, generate a canonical directory tree.

1. Build the tree showing where source code, contracts/schemas, tests, config files, and build output live — tailored to the confirmed stack
2. Present the tree to the user with one-line descriptions per top-level directory. Adapt the tree to the actual stack — e.g., a CLI project won't have `components/`, a monorepo will have `apps/` and `packages/`
3. Build an architecture separation table mapping each concern to its directory and runtime
4. **Present to user**: Show the directory tree and architecture table. Ask: "Does this structure match your expectations?" **Do not proceed until explicit approval.**
5. After approval, fire bootstrap with: `PROJECT_STRUCTURE`, `ARCHITECTURE_TABLE`, `CONTRACTS_DIR`, `BUILD_OUTPUT_DIR`. **HARD GATE**: Follow the bootstrap verification protocol (`.agent/skills/prd-templates/references/bootstrap-verification-protocol.md`) — verify all 4 keys.
6. Append a `## Directory Structure` section to `docs/plans/architecture-draft.md`

> If invoked standalone, surface via `notify_user`.

## 10. Compile architecture design document

Read .agent/skills/technical-writer/SKILL.md and follow its methodology.

Read .agent/skills/technical-writer/SKILL.md and apply its clarity and structure standards throughout document compilation.

Read `docs/plans/architecture-draft.md` as the authoritative source.

**Section validation**: Before compiling, verify these sections exist in architecture-draft.md:
- `## System Architecture`
- `## Error Architecture`
- `## Data Strategy`
- `## Security Model`
- `## Integration Points` (or explicit "no integrations" note)

If any required section is missing → **STOP**: "architecture-draft.md is missing `[section]`. This section should have been written by a previous shard. Run the relevant shard: architecture → `/create-prd-architecture`, security → `/create-prd-security`."

Read `.agent/skills/prd-templates/references/architecture-design-template.md` for the document structure. Compile it into `docs/plans/YYYY-MM-DD-architecture-design.md` (use today's date).

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

### Next step

**STOP** — do NOT propose `/decompose-architecture` or any other pipeline workflow. The only valid next step is:

- `/audit-ambiguity architecture` — unconditionally mandatory. The self-check above cannot replace an independent audit.
