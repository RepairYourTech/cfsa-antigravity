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
  skills: [technical-writer]
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

1. **Phase 1 (Foundation)** — Infrastructure + core entities. Must-haves that
   everything else depends on. Production-grade from day one.
   Phase 1 must begin with the `00-infrastructure` slice (CI/CD, environment, deployment, scaffolding, database). After this slice, `/verify-infrastructure` must pass before any feature slice begins. After the auth slice, `/verify-infrastructure` must pass again. Document these as hard gates in the phase entry/exit criteria — they are not recommendations.
2. **Phase 2 (Core Experience)** — Primary user flows built on the foundation.
   No shortcuts — same quality bar as Phase 1.
3. **Phase 3+ (Expansion)** — Additional features, integrations, scale.
   Same standards. Never "clean up later."

For multi-surface projects, consider whether phases are **per-surface** (build desktop first, then web) or **cross-surface** (build shared auth across both, then features across both). The decision depends on whether surfaces have independent value.

Each phase should have a rough timeline estimate. Every phase must pass the
full validation suite before the next phase begins.

**Present to user**: Show the phasing breakdown. Walk through the dependency order. Ask:
- "Are there features in Phase 2 that actually depend on something not in Phase 1?"
- "Is the Phase 1 scope achievable without cutting quality?"

Refine based on discussion before proceeding.

## 10. Compile architecture design document

Create `docs/plans/YYYY-MM-DD-architecture-design.md` (use today's date) with:

> **Template depth rule**: The section descriptions below are MINIMUM headings, not
> maximum content. Each section must contain the full detail gathered during steps
> 3-9 — every decision with rationale, every flow with steps, every error case
> with handling. If a section is under 200 words, it's almost certainly too shallow.
> The depth-standards rule applies: could a developer interpret this two different
> ways? If yes, add more detail.

```markdown
# [Project Name] — Architecture Design

> **Vision**: [link to vision.md]
> **Date**: YYYY-MM-DD
> **Status**: Draft | Review | Approved
> **Project Type**: [Single-surface: web/desktop/mobile/CLI/API | Multi-surface: list surfaces]

## Tech Stack
[Explicit decision for each applicable axis with rationale — not just the choice,
but WHY this choice over alternatives, what trade-offs were accepted, and what
constraints drove the decision. For multi-surface projects, organized by surface.]

## System Architecture
[Component diagram, data flow, deployment topology — every service named, every
communication path documented, every failure mode identified. For multi-surface:
include surface interconnection diagram and shared domain boundary.]

## Data Strategy
[Placement, schema design, query patterns, migrations — which data lives where
and why, what the hot paths are, how schema evolves. For multi-surface: data
ownership, sync protocol, conflict resolution.]

## Security Model
[Auth, authorization, validation, rate limits — every flow specified step-by-step,
every permission rule scoped, every error case handled]

## Compliance & Safety
[If applicable — full depth on minors/payments/health/regulated domains.
This section may be the largest in the document if compliance constraints
are significant. Every account type, every consent flow, every content filter,
every notification trigger, every audit requirement.]

## API Design
[Surface type, versioning, conventions — endpoint naming, request/response shapes,
error format, pagination strategy. For multi-surface: shared API contract format.]

## Integration Points
[External services, failure modes, fallbacks, cost models — for each: what it
provides, what happens when it's down, what the fallback is]

## Development Methodology
[Contract-first, TDD, vertical slices, spec layers, quality gates — the full
process, not just labels]

## Phasing
[Phase breakdown with feature allocation, dependency order, and timeline estimates.
Each phase has explicit entry/exit criteria. For multi-surface: per-surface or
cross-surface phasing strategy.]

## Installed Skills
[List of skills installed during this workflow with versions]

## Decisions Log
[Every decision made during this workflow with rationale — not just what was
decided, but what alternatives were considered and why they were rejected]

## Open Questions
[Anything needing resolution before decomposition — with owner and deadline]
```

## 11. Compile Engineering Standards

Create `docs/plans/ENGINEERING-STANDARDS.md` — the non-negotiable quality bar for the project.

This document codifies every quality decision from the architecture design into enforceable thresholds. It is referenced by `AGENTS.md`, `.agent/instructions/workflow.md`, and `.agent/instructions/structure.md` — agents will refuse to mark work complete if it violates these standards.

```markdown
# [Project Name] — Engineering Standards

> **Architecture**: [link to architecture-design.md]
> **Date**: YYYY-MM-DD
> **Status**: Draft | Review | Approved

## Test Coverage
- Minimum unit test coverage: [e.g., 80%]
- Integration test requirement: [e.g., every API endpoint]
- E2E test requirement: [e.g., every critical user flow]
- Coverage tool: [e.g., vitest coverage-v8]

## Linting & Formatting
- Linter: [e.g., ESLint with strict config]
- Formatter: [e.g., Prettier]
- Type checker: [e.g., TypeScript strict mode]
- Pre-commit hooks: [yes/no, tool]

## Performance Budgets

### Web surfaces (if applicable)
- LCP target: [e.g., < 2.5s]
- FID target: [e.g., < 100ms]
- CLS target: [e.g., < 0.1]
- Bundle size limit: [e.g., < 200KB initial JS]

### Desktop surfaces (if applicable)
- Cold start target: [e.g., < 2s]
- Memory ceiling: [e.g., < 200MB idle, < 500MB active]
- Installer size: [e.g., < 100MB]

### Mobile surfaces (if applicable)
- App launch target: [e.g., < 1.5s cold, < 0.5s warm]
- Battery impact: [e.g., < 5% per hour active use]
- App download size: [e.g., < 50MB]

### API / shared services
- API response time: [e.g., p95 < 500ms]
- Throughput target: [e.g., 1000 req/s]

### CLI surfaces (if applicable)
- Execution time: [e.g., < 500ms for common operations]
- Binary size: [e.g., < 20MB]
- Startup latency: [e.g., < 100ms]

## Accessibility
- WCAG level: [e.g., 2.1 AA] (web/mobile)
- Screen reader testing: [required/optional]
- Keyboard navigation: [all interactive elements]
- Platform accessibility APIs: [e.g., UIAccessibility for iOS, AccessibilityNodeInfo for Android]

## Security
- Dependency audit: [e.g., npm audit on every CI run]
- Secret scanning: [tool/approach]
- CSP policy: [strict/relaxed + details] (web surfaces)
- Code signing: [signing certificate strategy] (desktop/mobile surfaces)

## Code Quality
- Max file length: [e.g., 300 lines]
- Max function length: [e.g., 50 lines]
- Max cyclomatic complexity: [e.g., 10]
- Required documentation: [public APIs / all exports / none]

## CI/CD Gates
- Tests must pass: [yes]
- Lint must pass: [yes]
- Type-check must pass: [yes]
- Build must succeed: [yes]
- Coverage threshold met: [yes]

## Validation Command
[The single command that enforces all of the above]
```

Fill in concrete values based on the tech stack decisions from step 3 and the methodology from step 8. **No TBDs allowed** — every threshold must be a specific number or explicit decision.

## 12. Request review and propose next steps

Call `notify_user` presenting:
- `docs/plans/YYYY-MM-DD-architecture-design.md` (use the actual dated filename)
- `docs/plans/ENGINEERING-STANDARDS.md`
- The self-check summary covering all 9 Architecture rubric dimensions:
  1. Tech stack completeness — Every axis has an explicit decision with rationale
  2. System architecture depth — Component diagram, data flow, deployment topology, failure modes
  3. Data strategy — Placement, schema, query patterns, migrations, PII boundaries
  4. Security model — Auth, authorization, validation, rate limits, compliance escalation
  5. API design — Surface type, versioning, conventions, error format
  6. Integration points — External services with failure modes and fallbacks
  7. Development methodology — Contract-first, TDD, vertical slices, quality gates
  8. Phasing strategy — Dependency-ordered phases with entry/exit criteria
  9. Engineering standards — All thresholds are specific numbers, no TBDs
- The completeness checklist: every threshold in ENGINEERING-STANDARDS.md is a concrete value, every section in the architecture document has ≥200 words of depth, every decision has rationale
- Any gaps resolved during the self-check

> **Both documents must be approved before proceeding. Do NOT proceed until the user sends a message explicitly approving this output.**

### Proposed next steps

Default recommendation: Run `/audit-ambiguity architecture` to verify the architecture and engineering standards against the full rubric.

Only skip `/audit-ambiguity architecture` if all 9 dimensions scored ✅ AND the project has zero compliance constraints. In that case, recommend `/decompose-architecture` directly.
