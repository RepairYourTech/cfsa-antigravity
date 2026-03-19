---
description: Full validation of a completed phase — all tests, coverage thresholds, lint, type-check, build
pipeline:
  position: 8
  stage: verification
  predecessors: [implement-slice]
  successors: [update-architecture-map]
  loop: true # one validate per phase
  skills: [adversarial-review, code-review-pro, deployment-procedures, security-scanning-security-hardening, testing-strategist, verification-before-completion]
  calls-bootstrap: false
shards: [validate-phase-quality, validate-phase-readiness]
---

// turbo-all

# Validate Phase

Comprehensive validation of a completed implementation phase.

**Input**: A completed phase with all slices implemented
**Output**: Validation report with pass/fail verdict

---

## Shard Overview

| # | Shard | What It Does |
|---|-------|-------------|
| 1 | [`validate-phase-quality`](.agent/workflows/validate-phase-quality.md) | Code quality gates: tests, coverage, mutation testing, lint, type-check, build, CI/CD, staging deploy, deployment strategy, migrations, spec coverage |
| 2 | [`validate-phase-readiness`](.agent/workflows/validate-phase-readiness.md) | Production readiness gates: API doc sync, accessibility, performance budgets, security review, DAST, dependency audit, results documentation, next steps |

---

## Orchestration

### Step A — Run `.agent/workflows/validate-phase-quality.md`

Loads validation skills, runs all code quality checks (tests, coverage, mutation testing, lint, type-check, build), verifies CI/CD pipeline, deploys to staging, verifies deployment strategy compliance, checks migrations, and runs the spec coverage sweep.

### Step B — Run `.agent/workflows/validate-phase-readiness.md`

Runs production readiness checks: API documentation sync, accessibility audit, performance budget enforcement, deep performance audit, security review (including surface-conditional DAST), dependency supply chain audit. Documents all results and presents the validation report with next steps.

---

## Quality Gate

**BLOCKING GATE** — You may NOT call `notify_user` until ALL items pass:
- [ ] All code quality checks pass (Shard 1)
- [ ] All production readiness checks pass (Shard 2)
- [ ] Validation report written to `docs/audits/phase-N-validation.md`
- [ ] Pass/fail verdict determined

## Completion Gate (MANDATORY)

Before reporting completion to the user:

1. **Memory check** — Apply rule `memory-capture`. Write any patterns, decisions, or blockers from this workflow to `.agent/progress/memory/`. If nothing to write, confirm: "No new patterns/decisions/blockers."
2. **Progress update** — Update `.agent/progress/` tracking files if they exist.
3. **Session log** — Write session entry to `.agent/progress/sessions/`.

