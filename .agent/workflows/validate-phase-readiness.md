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

## 5.85. Gate Applicability Check (MANDATORY first step)

Before running any readiness gate, determine which gates apply to THIS phase based on what changed.

1. Read `.agent/skills/prd-templates/references/gate-applicability.md`
2. Classify this phase's content using the Content Classification Table
3. Build the gate applicability table using the template
4. Apply the always-on vs content-triggered rules
5. If any gate is deferred, follow the deferred gate rules (hard deadline, single-deferral limit)

The gate applicability table produced here is referenced by every subsequent step and included in the final validation report (Step 9).

---

## 5.9. API documentation sync (content-triggered)

**Applicability**: Check gate applicability table (Step 5.85). If "No" → log skip and proceed. If "Deferred" → log with deadline and proceed.

Read the surface stack map from `.agent/instructions/tech-stack.md`.

1. Read `docs/plans/ENGINEERING-STANDARDS.md` → `## Code Quality` → `Required documentation`
2. If API documentation is required or public API endpoints exist:
   - Verify OpenAPI spec file exists and matches implemented endpoints
   - For each new endpoint, verify request/response schemas match {{CONTRACT_LIBRARY}} contracts and all error codes are documented
   - Run OpenAPI linter if configured
3. If no API documentation required and no public API surface → skip

**Pass criteria**: OpenAPI spec in sync with this phase's endpoint contracts, or not applicable.

---

## 6. Accessibility audit (content-triggered)

**Applicability**: Check gate applicability table (Step 5.85). If "No" → log skip and proceed. If "Deferred" → log with deadline and proceed.

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

Check if `performance-optimization` skill is installed (`.agent/skills/performance-optimization/SKILL.md`).

**If installed**: Read the skill, run its audit against changed pages/routes/endpoints, compare to ENGINEERING-STANDARDS.md targets, report threshold violations.

**If not installed**: Manually verify no obvious perf regressions (large synchronous imports, unoptimized assets, N+1 queries, unbounded loops). Recommend skill installation if performance is critical.

## 8. Security review

Read `.agent/skills/adversarial-review/SKILL.md` — generate attack scenarios, abuse cases, and race conditions against this phase's changes. Produce spec-level gap items.

Read `.agent/skills/security-scanning-security-hardening/SKILL.md` — run full defense-in-depth audit (new endpoints, data flows, auth checks). Block on Critical/High severity findings.

**Supplemental checks**: Read Security skill(s) from cross-cutting section of surface stack map. Run each skill's audit protocol. Report with same severity classification.

**DAST scan (if applicable)**: Read `ENGINEERING-STANDARDS.md` → `## Security` → `Security testing tool`. If defined, run against staging. Block on Critical/High. If not defined → log and proceed.

## 8.5. Dependency audit

### Core audit (mandatory)

Run the package manager's built-in vulnerability audit:

| PM | Command |
|----|--------|
| npm | `npm audit --audit-level=high` |
| pnpm | `pnpm audit --audit-level=high` |
| yarn | `yarn npm audit --severity high` |
| pip | `pip-audit` or `safety check` |
| cargo | `cargo audit` |
| go | `govulncheck ./...` |
| bundler | `bundle audit check` |
| composer | `composer audit` |

**HIGH/CRITICAL in prod deps** → **STOP.** List affected packages + fixes. **LOW/MODERATE** → log, don't block. **Tool unavailable** → log, don't block.

### Supplemental audit (conditional)

If `dependency-auditing` skill is installed → read and run its full protocol (Snyk, Socket.dev, SBOM, lockfile integrity).

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

Follow the **Validation Report Structure** in `.agent/skills/prd-templates/references/gate-applicability.md` to structure the report with: Gate Applicability Summary, Applied Gate Results, Deferred Gates (if any), and Verdict.

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
