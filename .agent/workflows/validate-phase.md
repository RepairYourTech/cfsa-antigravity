---
description: Full validation of a completed phase — all tests, coverage thresholds, lint, type-check, build
pipeline:
  position: 8
  stage: verification
  predecessors: [implement-slice]
  successors: [update-architecture-map]
  loop: true # one validate per phase
  skills: [testing-strategist, code-review-pro, deployment-procedures]
  calls-bootstrap: false
---

// turbo-all

# Validate Phase

Comprehensive validation of a completed implementation phase.

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

Run `{{TEST_COMMAND}}`.

All tests must pass. Zero tolerance for failing tests.

## 2. Check coverage

Run `{{TEST_COVERAGE_COMMAND}}`.

Read `docs/plans/ENGINEERING-STANDARDS.md` and use the coverage thresholds defined in the "Test Coverage" section. If the file doesn't exist or thresholds aren't defined, fall back to these defaults:
- Statements: 80%
- Branches: 90% (critical paths: auth, payments, data mutations, permission checks), 75% (non-critical paths)
- Functions: 80%
- Lines: 80%

Critical paths are defined as: auth flows, payment processing, data mutations, and permission/authorization checks.

## 3. Lint

Run `{{LINT_COMMAND}}`.

Zero lint errors. Warnings should be reviewed and addressed.

## 4. Type check

Run `{{TYPE_CHECK_COMMAND}}`.

Zero type errors. Strict mode must be enabled.

## 5. Build

Run `{{BUILD_COMMAND}}`.

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

1. Deploy to staging using the deployment skill (`.agent/skills/deployment-procedures/SKILL.md`)
2. Verify deployment succeeded (no rollback triggered, no error logs in the deployment output)
3. Run smoke tests against the staging environment:
   - Health check endpoint returns 200
   - At least one authenticated route works with a valid token
   - At least one protected route returns 401/403 for unauthenticated requests
4. **If smoke tests fail** → red path: Capture the failing test output, rollback the staging deployment, and fix the issue before re-running `/validate-phase`
5. **If deployment fails** → red path: Do not mark this phase as complete — diagnose the deployment failure, fix it, and re-run `/validate-phase`

**Pass criteria**: Staging deployment succeeds and all smoke tests pass.

---

## 5.7. Migration verification

1. Run the migration status command (e.g., `prisma migrate status`, `drizzle-kit status`, or equivalent for your ORM)
2. Verify there are no pending migrations and no failed migrations
3. Verify the CI/CD pipeline ran migrations successfully as part of this phase's deployment
4. Check that rollback scripts exist for each migration in this phase
5. If migrations are pending or failed → red path: do not mark this phase as complete — run the pending migrations, verify they succeed, and re-run `/validate-phase`

**Pass criteria**: Migration status is clean. All migrations from this phase ran successfully in the CI/CD environment. Rollback scripts are present.

---

## 6. Accessibility audit (if UI changes)

Use the accessibility skill (if installed) to audit new UI components for WCAG 2.1 AA compliance.

## 7. Performance check (if web surface exists)

Check if the `web-performance-optimization` skill is installed (look for `.agent/skills/web-performance-optimization/SKILL.md`).

**If installed**:
1. Read `.agent/skills/web-performance-optimization/SKILL.md`
2. Run the skill's audit protocol against the phase's changed pages/routes
3. Compare results to the targets in `docs/plans/ENGINEERING-STANDARDS.md` (LCP, FID, CLS, bundle size)
4. Report any metrics that exceed the defined thresholds

**If not installed**:
- Note: "No web performance skill installed. Skipping automated performance audit."
- Manually verify that no obviously expensive operations were added (large synchronous imports, unoptimized images, missing lazy loading)
- If performance is critical for this project, recommend installing the skill via `find-skills`

## 8. Security review

Check for installed security skills in order of preference:
1. `.agent/skills/owasp-web-security/SKILL.md`
2. `.agent/skills/security-scanning-hardening/SKILL.md`
3. `.agent/skills/security-scanning-security-hardening/SKILL.md`

**If any security skill is installed**:
1. Read the installed skill's SKILL.md
2. Run its audit protocol against the phase's changes (new endpoints, new data flows, new auth checks)
3. Report any findings with severity levels
4. Block the phase if any Critical or High severity issues are found

**If no security skill is installed**:
Fall back to this minimal manual checklist:
- [ ] No hardcoded secrets (API keys, passwords, tokens) in source code
- [ ] All user inputs validated (Zod schemas or equivalent)
- [ ] Auth/authz checks on all protected endpoints
- [ ] Rate limits configured for public endpoints
- [ ] No sensitive data in client-side logs or error messages
- [ ] CORS/CSP headers configured (web surfaces)

If security is critical for this project, recommend installing a security skill via `find-skills`.

## 9. Document results

Create or update `docs/audits/phase-N-validation.md` with:
- Test results and coverage
- Lint and type-check status
- Build status
- Any accessibility or performance findings
- Pass/fail verdict
- CI/CD pipeline status (green/red, failing jobs if any)
- Staging deployment result and smoke test outcome
- Migration verification status

## 10. Present results and next steps

Use `notify_user` to present the validation report.

### Proposed next steps

- **If all checks pass**: "Phase N validation complete. Next: Run `/update-architecture-map` to ensure the project's living architecture document is up-to-date."
- **If any checks fail**: "Fix the failures listed in the validation report and re-run `/validate-phase` for Phase N."
