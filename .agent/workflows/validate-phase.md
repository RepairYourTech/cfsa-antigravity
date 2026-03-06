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

Read .agent/skills/{{E2E_TESTING_SKILL}}/SKILL.md and follow its E2E test conventions.

Run `{{TEST_COMMAND}}`.

All tests must pass. Zero tolerance for failing tests.

## 2. Check coverage

Read .agent/skills/{{UNIT_TESTING_SKILL}}/SKILL.md and follow its test writing conventions.

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

Read .agent/skills/{{CI_CD_SKILL}}/SKILL.md and follow its pipeline configuration conventions.

Verify the CI/CD pipeline is green for this phase's changes:

1. Check that a CI/CD configuration file exists (e.g., `.github/workflows/`, `.gitlab-ci.yml`)
2. Verify the pipeline has run for the latest commit in this phase
3. Verify ALL CI/CD jobs are passing (not just the test job — include lint, type-check, build, and any deployment jobs)

**If CI/CD is red** → red path: **STOP immediately.** Do not mark this phase as complete. List the failing jobs and their error output. Fix them and re-run `/validate-phase` after fixes.

**Pass criteria**: CI/CD pipeline is green for the latest commit in this phase.

---

## 5.6. Staging deployment gate

Read .agent/skills/{{HOSTING_SKILL}}/SKILL.md and follow its deployment conventions.

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

Read .agent/skills/{{ORM_SKILL}}/SKILL.md and follow its migration and schema conventions.

1. Run the migration status command (e.g., `prisma migrate status`, `drizzle-kit status`, or equivalent for your ORM)
2. Verify there are no pending migrations and no failed migrations
3. Verify the CI/CD pipeline ran migrations successfully as part of this phase's deployment
4. Check that rollback scripts exist for each migration in this phase
5. If migrations are pending or failed → red path: do not mark this phase as complete — run the pending migrations, verify they succeed, and re-run `/validate-phase`

**Pass criteria**: Migration status is clean. All migrations from this phase ran successfully in the CI/CD environment. Rollback scripts are present.

---

## 5.8. Spec coverage sweep

This step verifies that the phase's implementation actually delivered what the specs required — not just that the tests pass.

For each slice in the phase plan (`docs/plans/phases/phase-N.md`):

1. Read the slice's acceptance criteria
2. Identify the FE spec(s) referenced by this slice (via the FE spec's `## Source Map`)
3. For each named user flow in the relevant FE spec `## Interaction Specification` section that belongs to this slice:
   - Verify a test exists in the test suite that covers this flow by name or by its acceptance criterion
   - Verify the flow is implemented (not stubbed with `BOUNDARY:`) unless a valid boundary stub exists with a tracking issue
4. Identify the BE spec section(s) for each endpoint in this slice
5. For each endpoint:
   - Verify every Zod-validated field in the BE spec has a corresponding test
   - Verify every error code defined in the BE spec has a corresponding test
   - Verify every auth rule (role, ownership check) defined in the BE spec has a corresponding permission test
6. For each slice in the phase plan, identify which IA shard(s) the slice's features originate from (using either the phase plan's domain references or the FE spec's `## Source Map`). For each identified IA shard:
   - Read the shard's `## Accessibility` section (surface-conditional: apply only for `web`, `mobile`, or `desktop` surfaces). For each accessibility requirement named there, verify a corresponding test exists (e.g., axe-core check, keyboard navigation test, screen reader label test).
   - Read the shard's acceptance criteria or testability section (look for Given/When/Then format or numbered acceptance criteria). For each Given/When/Then criterion, verify it maps to at least one named test in the test suite.
   - Flag any IA criterion with no test coverage as an uncovered item — apply the **same hard-stop rule** below: list the uncovered criterion and either write the missing test or document it as a valid boundary stub with a tracking issue.

**If any flow, field, error code, auth rule, IA acceptance criterion, or accessibility requirement has no corresponding test:**

> ❌ STOP — Do not mark this phase as complete. List the uncovered items. Either write the missing tests and re-run `{{TEST_COMMAND}}`, or if the item was genuinely deferred (valid boundary stub + tracking issue), document the deferral explicitly in the phase validation report.

**Pass criteria**: Every named user flow, BE endpoint field, error code, auth rule, IA acceptance criterion, and accessibility requirement in the phase's scope has a corresponding passing test or a documented valid boundary stub.

> Update report (`docs/audits/phase-N-validation.md`): Add a `## Spec Coverage` section listing the sweep results — covered items, uncovered items, boundary stubs, accessibility coverage, IA testability trace results, and the pass/fail verdict for this step.

---

## 6. Accessibility audit (if UI changes)

Read .agent/skills/accessibility/SKILL.md and follow its methodology.
Audit all new UI components in this phase for WCAG 2.1 AA compliance.

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

Read .agent/skills/security-scanning-security-hardening/SKILL.md and run its full defense-in-depth audit protocol against the phase's changes (new endpoints, new data flows, new auth checks). Report findings with severity levels. Block the phase if any Critical or High severity issues are found.

**Supplemental security checks (conditional)**: After the core audit completes, check for stack-specific security skills. For each of the following that exists, read it and run its audit protocol as a supplement to the core audit:
- `.agent/skills/owasp-web-security/SKILL.md`
- `.agent/skills/api-security-checklist/SKILL.md`
- `.agent/skills/crypto-patterns/SKILL.md`
- `.agent/skills/csp-cors-headers/SKILL.md`
- `.agent/skills/input-sanitization/SKILL.md`
- `.agent/skills/dependency-auditing/SKILL.md`

Report any additional findings from supplemental audits with the same severity classification.

## 9. Document results

**Note on report file**: `docs/audits/phase-N-validation.md` is written progressively. Step 5.8 creates the file and appends the `## Spec Coverage` section. Step 9 appends all remaining sections. Do not recreate or overwrite the file in Step 9 — append only.

- Test results and coverage
- Lint and type-check status
- Build status
- Accessibility findings
- Performance findings
- Security review findings
- CI/CD pipeline status
- Staging deployment result
- Migration verification status
- Pass/fail verdict

## 10. Present results and next steps

Read .agent/skills/verification-before-completion/SKILL.md and follow its methodology.

Use `notify_user` to present the validation report.

### Proposed next steps

- **If all checks pass**: "Phase N validation complete. Next: Run `/update-architecture-map` to ensure the project's living architecture document is up-to-date."
- **If any checks fail**: "Fix the failures listed in the validation report and re-run `/validate-phase` for Phase N."
- **If new requirements were discovered during validation** (scope gaps, missing features, behavioral corrections): Use `/evolve-feature` to add them at the correct entry point layer. Do not attempt to add them directly to specs — evolution must go through the classify → cascade flow to maintain layer consistency.
