---
description: Code quality gates — tests, coverage, lint, type-check, build, CI/CD, staging deploy, migrations, spec coverage for the validate-phase workflow
parent: validate-phase
shard: quality
standalone: true
position: 1
pipeline:
  position: 8.1
  stage: verification
  predecessors: [implement-slice]
  successors: [validate-phase-readiness]
  skills: [code-review-pro, deployment-procedures, testing-strategist, verification-before-completion]
  calls-bootstrap: false
---

// turbo-all

# Validate Phase — Code Quality Gates

Run all code quality checks for a completed implementation phase.

---

## 0. Load validation skills

Read these skills before running checks:
1. `.agent/skills/testing-strategist/SKILL.md` — Coverage strategy and test quality
2. `.agent/skills/code-review-pro/SKILL.md` — Review checklist for self-audit
3. `.agent/skills/deployment-procedures/SKILL.md` — Build and release readiness

---

## 0.5. Parallel dispatch option

If the phase contains independent slices that don't share files, validation can run in parallel:

1. **Identify independent slices** — slices that don't import from or export to each other
2. **Dispatch parallel validation** — run Steps 1–5 concurrently for independent slices using the `parallel-agents` skill
3. **Sequential for shared** — slices that share contracts or utilities must validate sequentially

This is an optimization, not a requirement. Sequential validation is always correct.

## 1. Run test suite

Run the Test Cmd from `.agent/instructions/commands.md`. All tests must pass. Zero tolerance.

## 2. Check coverage

Run the Test Coverage Cmd from `.agent/instructions/commands.md`.

Read `docs/plans/ENGINEERING-STANDARDS.md` and use the coverage thresholds defined in the "Test Coverage" section. If the file doesn't exist or thresholds aren't defined, fall back to these defaults:
- Statements: 80%
- Branches: 90% (critical paths: auth, payments, data mutations, permission checks), 75% (non-critical paths)
- Functions: 80%
- Lines: 80%

Critical paths are defined as: auth flows, payment processing, data mutations, and permission/authorization checks.

## 2.5. Mutation testing (critical paths)

**Optional but recommended.** If the project's test tooling supports mutation testing (e.g., Stryker for JS/TS, mutmut for Python, cargo-mutants for Rust):

1. Run the mutation testing tool against critical path modules only (auth, payments, data mutations, permission checks)
2. **Required**: Mutation score ≥ 70% on critical paths — if below, the tests are passing but not actually catching bugs
3. **Recommended**: Mutation score ≥ 50% on non-critical paths — log as a finding but don't block

If mutation testing is not available in the project's tooling, skip and note in the validation report that mutation testing was not run.

## 3. Lint

Run the Lint Cmd from the surface stack map.

Zero lint errors. Warnings should be reviewed and addressed.

## 4. Type check

Run the Type Check Cmd from the surface stack map.

Zero type errors. Strict mode must be enabled.

## 5. Build

Run the Build Cmd from the surface stack map.

Build must succeed with no errors.

---

## 5.5. CI/CD pipeline verification

Verify the CI/CD pipeline is green for this phase's changes:

1. Check that a CI/CD configuration file exists (e.g., `.github/workflows/`, `.gitlab-ci.yml`)
2. Verify the pipeline has run for the latest commit in this phase
3. Verify ALL CI/CD jobs are passing (not just the test job — include lint, type-check, build, and any deployment jobs)

**If CI/CD is red** → red path: **STOP immediately.** Do not mark this phase as complete. List the failing jobs and their error output. Fix them and re-run `/validate-phase` after fixes.

**Pass criteria**: CI/CD pipeline is green for the latest commit in this phase.

---

## 5.6. Staging deployment gate

1. Deploy to staging using `.agent/skills/deployment-procedures/SKILL.md`
2. Verify deployment succeeded (no rollback triggered, no error logs in the deployment output)
3. Run smoke tests against the staging environment:
   - Health check endpoint returns 200
   - At least one authenticated route works with a valid token
   - At least one protected route returns 401/403 for unauthenticated requests
4. **If smoke tests fail** → red path: Capture the failing test output, rollback the staging deployment, and fix the issue before re-running `/validate-phase`
5. **If deployment fails** → red path: Do not mark this phase as complete — diagnose the deployment failure, fix it, and re-run `/validate-phase`

**Pass criteria**: Staging deployment succeeds and all smoke tests pass.

---

## 5.6.5. Deployment strategy verification

Read the project's architecture design document (`docs/plans/*-architecture-design.md`) and look for a `## Deployment Strategy` section.

**If no deployment strategy is defined** → Log: "No deployment strategy in architecture doc. Using direct deploy." Proceed.

**If a deployment strategy is defined**:
1. Verify the deployment in Step 5.6 followed the documented strategy (e.g., canary → verify traffic was gradually shifted; blue-green → verify old environment is still available for rollback; rolling → verify instances were replaced sequentially)
2. If the architecture documents feature flags as the rollout mechanism → verify the new features in this phase are behind flags
3. Verify the documented rollback trigger mechanism is configured (error rate monitoring, latency threshold alert, or manual switch — whatever the architecture specifies)

**Pass criteria**: Deployment follows the architecture-documented strategy, or no strategy is documented.

---

## 5.7. Migration verification

1. Run the migration status command (e.g., `prisma migrate status`, `drizzle-kit status`, or equivalent)
2. Verify there are no pending migrations and no failed migrations
3. Verify the CI/CD pipeline ran migrations successfully as part of this phase's deployment
4. Check that rollback scripts exist for each migration in this phase
5. If migrations are pending or failed → red path: do not mark this phase as complete — run the pending migrations, verify they succeed, and re-run `/validate-phase`

**Pass criteria**: Migration status is clean. All migrations from this phase ran successfully in the CI/CD environment. Rollback scripts are present.

---

## 5.8. Spec coverage sweep

Read `.agent/skills/prd-templates/references/spec-coverage-sweep.md` and follow its full procedure for FE spec, BE spec, and IA shard coverage. Apply its hard-stop rule for any uncovered items.

---

### Propose next step

Code quality gates complete. Next: Run `.agent/workflows/validate-phase-readiness.md` for production readiness checks.

> If this shard was invoked standalone (not from `/validate-phase`), surface this via `notify_user`.
