---
description: Production readiness gates — API docs, accessibility, performance, security, dependency audit, results for the validate-phase workflow
parent: validate-phase
shard: readiness
standalone: true
position: 2
pipeline:
  position: 8.2
  stage: verification
  predecessors: [validate-phase-quality]
  successors: [update-architecture-map]
  skills: [adversarial-review, security-scanning-security-hardening, verification-before-completion]
  calls-bootstrap: false
---

// turbo-all

# Validate Phase — Production Readiness Gates

Run all production readiness checks for a completed implementation phase.

**Prerequisite**: Code quality gates (from `/validate-phase-quality` or equivalent) must pass first. If quality gate results do not exist or any check failed → **STOP**: run `/validate-phase-quality` first.

---

## 5.9. API documentation sync (surfaces with API endpoints)

Read the surface stack map from `.agent/instructions/tech-stack.md`. **Skip this step** if the project has no API surface and no BE endpoints exposed to external consumers.

1. Read `docs/plans/ENGINEERING-STANDARDS.md` → `## Code Quality` → `Required documentation` field
2. If API documentation is required or the project exposes public API endpoints:
   - Verify an OpenAPI spec file exists (e.g., `openapi.yaml`, `openapi.json`, or a generated equivalent)
   - If the project uses a schema-first or code-first generation approach (documented in architecture-design.md), verify the generation tool produces output matching the implemented endpoints
   - For each new endpoint in this phase, verify it appears in the OpenAPI spec with:
     - Request body schema matching the {{CONTRACT_LIBRARY}} contract
     - Response schema matching the contract
     - All error codes documented
   - Run OpenAPI linter if configured (e.g., the tool named in ENGINEERING-STANDARDS.md or the project's `lint` scripts)
3. If API documentation is not required and no public API surface exists → skip

**Pass criteria**: OpenAPI spec exists and is in sync with implemented contracts for this phase's endpoints, or API documentation is not applicable.

---

## 6. Accessibility audit (if UI changes)

Audit all new UI components in this phase for WCAG 2.1 AA compliance using the Accessibility skill(s) from the cross-cutting section.

## 7. Performance check

### 7a. Performance budget verification (mandatory when budgets are defined)

Read `docs/plans/ENGINEERING-STANDARDS.md` section `## Performance Budgets`.

**If the section does not exist or contains only unfilled template placeholders** → Log: "No performance budgets defined in ENGINEERING-STANDARDS.md — skipping budget verification." Proceed to 7b.

**If budgets are defined**, read the `### CI Enforcement` table. For each row where the enforcement tool is named:

1. Check if the named enforcement tool is installed/available in the project
2. **If tool is available** → run it against the staging deployment (from Step 5.6) using the thresholds in the corresponding budget table:
   - **Web Vitals** (LCP, INP, CLS) → run against staging URLs, one per page type defined in the budget
   - **JS Bundle Size** → measure build output against per-page-type caps
   - **API Response Time** → run the named load test tool with a baseline scenario against staging endpoints
   - **DB Query Time** → run EXPLAIN ANALYZE (or equivalent) on critical queries and verify against tier thresholds
   - **Desktop/Mobile/CLI metrics** → run the named platform profiler against the built artifact
3. **If tool is not available** → log which tool is missing and recommend installation, but do not block

**Verdict per budget row**:
- `Fail` classification in CI Enforcement table AND threshold exceeded → **STOP.** Mark step 7a as `❌`. The phase cannot pass until budgets are met.
- `Warn` classification AND threshold exceeded → Log as a finding, do not block.
- Tool not available → Log as a finding, do not block, recommend installation.

**Pass criteria**: All `Fail`-classified budgets pass their thresholds. All `Warn`-classified findings are logged.

### 7b. Deep performance audit (optional)

Check if the `performance-optimization` skill is installed (look for `.agent/skills/performance-optimization/SKILL.md`).

**If installed**:
1. Read `.agent/skills/performance-optimization/SKILL.md`
2. Run the skill's audit protocol against the phase's changed pages/routes/endpoints
3. Compare results to the targets in `docs/plans/ENGINEERING-STANDARDS.md` (response time budgets, bundle sizes, memory limits, or other surface-appropriate metrics)
4. Report any metrics that exceed the defined thresholds

**If not installed**:
- Manually verify that no obviously expensive operations were added (large synchronous imports, unoptimized assets, missing lazy loading, N+1 queries, unbounded loops)
- If performance is critical for this project, recommend installing the skill via `find-skills`

## 8. Security review

Read .agent/skills/adversarial-review/SKILL.md and follow its structured methodology for generating attack scenarios, abuse cases, and race conditions against the phase's changes. Produce spec-level gap items for any identified risks. Feed these into the defense-in-depth audit below.

Read .agent/skills/security-scanning-security-hardening/SKILL.md and run its full defense-in-depth audit protocol against the phase's changes (new endpoints, new data flows, new auth checks). Report findings with severity levels. Block the phase if any Critical or High severity issues are found.

**Supplemental security checks (conditional)**: After the core audit completes, read the Security skill(s) from the cross-cutting section of the surface stack map. For each listed skill directory name, read `.agent/skills/[skill]/SKILL.md` and run its audit protocol as a supplement to the core audit.

Report any additional findings from supplemental audits with the same severity classification.

**Surface-conditional DAST scan (if applicable)**: Read `docs/plans/ENGINEERING-STANDARDS.md` → `## Security` → `Security testing tool` field. If a DAST or security scanning tool is defined:
1. Run it against the staging deployment from Step 5.6
2. Report findings with severity levels consistent with the core audit
3. Block the phase if any Critical or High severity findings are discovered

If no security testing tool is defined in ENGINEERING-STANDARDS → skip and log: "No DAST/security testing tool configured."

## 8.5. Dependency audit

### Core audit (mandatory — no skill required)

Run the package manager's built-in vulnerability audit tool. Use the appropriate command for the project's language/package manager:

| Package Manager | Audit Command |
|----------------|---------------|
| npm | `npm audit --audit-level=high` |
| pnpm | `pnpm audit --audit-level=high` |
| yarn | `yarn npm audit --severity high` |
| pip | `pip-audit` or `safety check` |
| cargo | `cargo audit` |
| go | `govulncheck ./...` |
| bundler | `bundle audit check` |
| composer | `composer audit` |

If the project uses a package manager not listed above, check its documentation for a built-in vulnerability audit command.

**If any HIGH or CRITICAL vulnerabilities are found in production dependencies** → **STOP.** Mark step 8.5 as `❌`. List affected packages and recommended fixes (upgrade version, patch, or replace).

**If only LOW or MODERATE vulnerabilities are found** → Log as findings, do not block.

**If the audit tool is not available** (e.g., language has no built-in audit) → Log: "No built-in dependency audit available for [language]. Recommend installing a dependency auditing tool." Do not block.

### Supplemental audit (conditional)

If the `dependency-auditing` skill is installed (`.agent/skills/dependency-auditing/SKILL.md`):
1. Read the skill and run its full audit protocol (Snyk, Socket.dev, SBOM generation, lockfile integrity)
2. Report any additional findings with severity levels

**Pass criteria**: Zero HIGH/CRITICAL vulnerabilities in production dependencies.

## 8.7. Feature ledger reconciliation

If `docs/plans/feature-ledger.md` exists:
1. Read the ledger and the current phase plan
2. For each **Must Have** feature assigned to this phase:
   - Verify the `Implemented` column is marked complete
   - Verify the slice(s) that implement it are marked complete in `.agent/progress/phases/phase-N.md`
3. If any Must Have feature assigned to this phase is not implemented → **STOP**: "Phase N has unimplemented Must Have features: [list]. Complete them via `/implement-slice` before marking the phase as validated."

## 8.8. Boundary stub audit

Grep the codebase for `BOUNDARY:` comments:
1. If **0 results** → ✅ Pass — no active boundary stubs
2. If results found → for each:
   - Verify a linked tracking issue exists and is open
   - Verify a sentinel test exists
   - Verify the boundary is for a spec that genuinely doesn't exist yet
   - If any boundary stub lacks a tracking issue OR the referenced spec now exists → **STOP**: "Active boundary stub at `[file:line]` — the referenced spec now exists. Replace the stub with a full implementation before marking this phase as validated."

## 9. Document results

**Pre-append verification**: Before appending, verify `docs/audits/phase-N-validation.md` exists and contains a `## Spec Coverage` section from Step 5.8 (quality shard). If the file does not exist or the section is missing → **STOP**: "Spec coverage sweep did not complete. Re-run `/validate-phase-quality` Step 5.8 before appending readiness results."

**Note on report file**: `docs/audits/phase-N-validation.md` is written progressively. Step 5.8 creates the file and appends the `## Spec Coverage` section. Step 9 appends all remaining sections. Do not recreate or overwrite the file in Step 9 — append only.

- Test results and coverage
- Lint and type-check status
- Build status
- Accessibility findings
- Performance budget results (7a) and deep audit findings (7b)
- Security review findings (including DAST results if applicable)
- Dependency audit results
- API documentation sync status (if applicable)
- Deployment strategy compliance (if applicable)
- CI/CD pipeline status
- Staging deployment result
- Migration verification status
- Pass/fail verdict

## 9.5. Completion Gate (MANDATORY)

1. Update `.agent/progress/` — mark phase as validated
2. Scan this conversation for memory-capture triggers (see rule: `memory-capture`):
   - Patterns observed → write to `memory/patterns.md`
   - Non-trivial decisions made → write to `memory/decisions.md`
   - Blockers hit → write to `memory/blockers.md`
3. If no triggers found → confirm: "No new patterns, decisions, or blockers to log"
4. Read `.agent/skills/session-continuity/protocols/05-session-close.md` and write a session close log

> **This step is not skippable.** Do not call `notify_user` until all items above are complete.

## 10. Present results and next steps

Read .agent/skills/verification-before-completion/SKILL.md and follow its methodology.

Use `notify_user` to present the validation report.

### Proposed next steps

- **If all checks pass**: "Phase N validation complete. Next: Run `/update-architecture-map` to ensure the project's living architecture document is up-to-date."
- **If any checks fail**: "Fix the failures listed in the validation report and re-run `/validate-phase` for Phase N."
- **If new requirements were discovered during validation** (scope gaps, missing features, behavioral corrections): Use `/evolve-feature` to add them at the correct entry point layer. Do not attempt to add them directly to specs — evolution must go through the classify → cascade flow to maintain layer consistency.
