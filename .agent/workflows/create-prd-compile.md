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

Read .agent/skills/tdd-workflow/SKILL.md and follow its methodology.

Document the agreed approach:

1. **Contract-first** — Zod schemas (or equivalent) before implementation
2. **TDD** — Failing tests before code
   Read .agent/skills/{{UNIT_TESTING_SKILL}}/SKILL.md and follow its test writing conventions.
   Read .agent/skills/{{E2E_TESTING_SKILL}}/SKILL.md and follow its E2E test conventions.
3. **Vertical slices** — All surfaces per feature
4. **Spec layers** — IA → BE → FE pipeline
5. **Quality gates** — What must pass before merge

## 9. Phasing strategy

Read .agent/skills/{{CI_CD_SKILL}}/SKILL.md and follow its pipeline configuration conventions.

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

Read .agent/skills/technical-writer/SKILL.md and follow its methodology.

Read .agent/skills/technical-writer/SKILL.md and apply its clarity and structure standards throughout document compilation.

Read `docs/plans/architecture-draft.md` as the authoritative source. Read `.agent/skills/prd-templates/references/architecture-design-template.md` for the document structure. Compile it into `docs/plans/YYYY-MM-DD-architecture-design.md` (use today's date).

> **Depth rule**: Each section must contain the full detail gathered during steps 3-9. If a section is under 200 words, it's almost certainly too shallow. Apply the two-implementer test.

## 10.5. Performance budget interview

Performance budgets are written **as you go** — each axis is discussed, decided, and immediately written to the corresponding subsection of `docs/plans/ENGINEERING-STANDARDS.md`. Do not batch them.

> **Surface conditioning**: Only present axes that apply to the confirmed tech stack surfaces. A CLI-only project skips Web Vitals and bundle-size axes. A web-only project skips Desktop and CLI axes. Always present API and DB axes.

### Axis 1 — Web Vitals per page type (web/desktop surfaces only)

Define LCP, INP, and CLS targets **per page type** (e.g., landing, dashboard, detail). Different page types have different acceptable thresholds.

| Page Type | LCP | INP | CLS | Notes |
|-----------|-----|-----|-----|-------|
| Landing / marketing | ≤ 2.0 s | ≤ 150 ms | ≤ 0.05 | First-impression page; tightest targets |
| Dashboard / data-heavy | ≤ 2.5 s | ≤ 200 ms | ≤ 0.1 | Streaming data acceptable |
| Detail / form | ≤ 2.0 s | ≤ 100 ms | ≤ 0.05 | Interaction-heavy; INP matters most |

Ask: "Which page types does your app have, and do these starting points fit?"

**Write immediately** → `docs/plans/ENGINEERING-STANDARDS.md` § `### Web Vitals per page type`

### Axis 2 — JS bundle size per page type (web/desktop surfaces only)

Define initial and total JS budgets **per page type**, gzipped.

| Page Type | Initial JS (gzipped) | Total JS (gzipped) | Notes |
|-----------|---------------------|--------------------|-------|
| Landing / marketing | ≤ 80 KB | ≤ 150 KB | Must load fast on first visit |
| Dashboard / data-heavy | ≤ 150 KB | ≤ 300 KB | Lazy-load heavy components |

Ask: "Are there pages that pull in large libraries (maps, charts, editors)? Those need their own row."

**Write immediately** → `docs/plans/ENGINEERING-STANDARDS.md` § `### JS Bundle Size per page type`

### Axis 3 — API response time per tier

Define p50, p95, and p99 targets **per tier**, not a single number for the whole API.

| Tier | Description | p50 | p95 | p99 |
|------|-------------|-----|-----|-----|
| Auth / session | Token issue, session check | ≤ 50 ms | ≤ 100 ms | ≤ 200 ms |
| CRUD reads | Single-entity fetch | ≤ 30 ms | ≤ 80 ms | ≤ 150 ms |
| List / search | Paginated or filtered queries | ≤ 100 ms | ≤ 300 ms | ≤ 500 ms |
| Writes / mutations | Create, update, delete | ≤ 80 ms | ≤ 200 ms | ≤ 400 ms |

Ask: "Do any endpoints call external services? Those should get their own tier with wider targets."

**Write immediately** → `docs/plans/ENGINEERING-STANDARDS.md` § `### API Response Time per tier`

### Axis 4 — DB query time per tier

Define p50 and p95 targets **per query tier**.

| Tier | Description | p50 | p95 |
|------|-------------|-----|-----|
| Indexed lookup | Primary-key or unique-index fetch | ≤ 5 ms | ≤ 15 ms |
| Indexed list | Range scan on indexed column | ≤ 15 ms | ≤ 50 ms |
| Aggregation | COUNT, SUM, GROUP BY | ≤ 50 ms | ≤ 150 ms |
| Full-text / vector | Search or similarity queries | ≤ 100 ms | ≤ 300 ms |

Ask: "Are there any known heavy queries (reports, analytics)? Those need their own tier."

**Write immediately** → `docs/plans/ENGINEERING-STANDARDS.md` § `### DB Query Time per tier`

### Axis 5 — Desktop / mobile surface budgets (if applicable)

Define surface-specific budgets using the reference table:

**Desktop**:
| Metric | Starting point |
|--------|---------------|
| Cold start | ≤ 2 s |
| Memory (idle / active) | ≤ 200 MB / ≤ 500 MB |
| Installer size | ≤ 100 MB |
| Window resize repaint | ≤ 16 ms (60 fps) |

**Mobile**:
| Metric | Starting point |
|--------|---------------|
| Cold launch | ≤ 1.5 s |
| Warm launch | ≤ 0.5 s |
| Battery drain (active) | ≤ 5 %/hr |
| Download size | ≤ 50 MB |

Ask: "Do these match your target devices and user expectations?"

**Write immediately** → `docs/plans/ENGINEERING-STANDARDS.md` § `### Desktop surfaces` and/or `### Mobile surfaces`

### Axis 6 — CI enforcement mapping

For **every budget defined in axes 1–5**, name the enforcement tool and fail condition.

| Budget Category | Enforcement Tool | Fail Condition | Fail vs. Warn |
|----------------|-----------------|----------------|---------------|
| Web Vitals | Lighthouse CI | Score below threshold | Fail |
| Bundle size | size-limit | Exceeds per-page-type cap | Fail |
| API response time | k6 / autocannon | p95 exceeds tier target | Warn (fail after baseline) |
| DB query time | pgbench / query timer | p95 exceeds tier target | Warn (fail after baseline) |
| Desktop/mobile | Platform profiler | Any metric exceeds threshold | Warn |

Ask: "For API and DB budgets, should CI fail immediately or warn-then-fail after a baseline run?"

**Write immediately** → `docs/plans/ENGINEERING-STANDARDS.md` § `### CI Enforcement`

**Present to user**: Summarise all confirmed performance budgets. Ask: "Any axis you want to tighten, loosen, or add?"

## 11. Compile Engineering Standards

Read .agent/skills/technical-writer/SKILL.md and follow its methodology.

Read `.agent/skills/prd-templates/references/engineering-standards-template.md` for the document structure. Create `docs/plans/ENGINEERING-STANDARDS.md` — the non-negotiable quality bar for the project. Fill in concrete values based on tech stack decisions from step 3 and methodology from step 8. **No TBDs allowed.**

## 12. Request review and propose next steps

Run a pre-flight self-check before presenting. Read `.agent/skills/pipeline-rubrics/references/architecture-rubric.md` and apply each of the 11 dimensions as a self-check. For any dimension scoring ⚠️ or ❌, fix it now before presenting.

Call `notify_user` presenting:
- `docs/plans/YYYY-MM-DD-architecture-design.md` (use the actual dated filename)
- `docs/plans/ENGINEERING-STANDARDS.md`
- The self-check results (all 11 dimensions with scores)
- Any gaps resolved during the self-check

> **Both documents must be approved before proceeding. Do NOT proceed until the user sends a message explicitly approving this output.**

### Proposed next steps

**Hard gate**: Run `/audit-ambiguity architecture`. This is unconditionally mandatory — the self-check above cannot replace it.
