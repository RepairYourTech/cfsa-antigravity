# Gate Applicability Reference

Reference for `/validate-phase-readiness` Step 5.85. Defines which readiness gates apply based on phase content.

## Content Classification Table

Read the phase plan and completed slices. Determine which content categories are present:

| Content Category | How to Detect | Gates It Triggers |
|-----------------|---------------|-------------------|
| **New/modified API endpoints** | BE spec slices, new route files, new controllers | 5.9 (API docs), 8 (Security — full) |
| **New/modified UI components** | FE spec slices, new component files, new pages/routes | 6 (Accessibility), 7a (Performance — Web Vitals/Bundle) |
| **New/modified data models** | Schema changes, new migrations, new DB queries | 7a (Performance — DB Query Time), 8 (Security — data flow) |
| **Infrastructure-only changes** | CI/CD config, hosting config, env vars, no app code | Skip 5.9, 6; apply 8 (infra security only) |
| **Auth/security changes** | Auth middleware, RBAC, token handling, secrets | 8 (Security — mandatory, elevated priority) |

## Gate Applicability Table Template

Build this table for each phase:

```markdown
| Gate | Applies? | Reason |
|------|----------|--------|
| 5.9 API Documentation | Yes/No/Deferred | [why] |
| 6 Accessibility | Yes/No/Deferred | [why] |
| 7a Performance Budget | Yes/No/Deferred | [why] |
| 7b Deep Performance | Yes/No/Deferred | [why] |
| 8 Security Review | Always Yes | Core audit always runs |
| 8.5 Dependency Audit | Always Yes | Always runs |
| 8.7 Feature Ledger | Always Yes | Always runs (if ledger exists) |
| 8.8 Boundary Stub Audit | Always Yes | Always runs |
```

## Always-On Gates (never skippable)

- **8 Security Review** — Core adversarial review + defense-in-depth always runs. DAST scan is conditional on having a staging deployment with endpoints.
- **8.5 Dependency Audit** — Always runs.
- **8.7 Feature Ledger Reconciliation** — Always runs (if ledger exists).
- **8.8 Boundary Stub Audit** — Always runs.

## Content-Triggered Gates (skip when content category is absent)

- **5.9 API Documentation** — Skip if no new/modified API endpoints in this phase.
- **6 Accessibility** — Skip if no new/modified UI components in this phase.
- **7a Performance Budget (Web Vitals/Bundle)** — Skip if no UI changes. DB Query Time sub-gate skips if no new queries/models.
- **7b Deep Performance** — Skip if no performance-critical changes.

## Deferred Gate Rules

A gate may be **deferred** (not skipped) when:
- The gate applies but a prerequisite is not yet available (e.g., staging deployment not configured yet for DAST)
- The phase is early infrastructure and the gate will apply to the next phase that adds the relevant content

**Hard deadline required**: Specify which phase or milestone must run the deferred gate. Log deferred gates in `docs/audits/phase-N-validation.md` with the deadline.

**Single-deferral limit**: A gate may NOT be deferred more than once. If a previously deferred gate's deadline arrives, it MUST run — no further deferral.

## Validation Report Structure

### Gate Applicability Summary

Include the gate applicability table. For each gate, report one of:
- **Applied** — gate ran, results follow
- **Skipped** — gate did not apply to this phase (with reason)
- **Deferred** — gate applies but prerequisite missing (with hard deadline)

### Applied Gate Results

Report only for gates that were applied:
- Test results and coverage
- Lint and type-check status
- Build status
- Accessibility findings (if gate applied)
- Performance budget results 7a and deep audit findings 7b (if gate applied)
- Security review findings (including DAST results if applicable)
- Dependency audit results
- API documentation sync status (if gate applied)
- Deployment strategy compliance (if applicable)
- CI/CD pipeline status, staging deployment result, migration verification status

### Deferred Gates Section

For each deferred gate:
- Gate name and step number
- Reason for deferral
- Hard deadline (phase number or milestone)
- Whether this is the first deferral (second deferral is forbidden)

### Verdict

- Pass/fail verdict
- If any gates were deferred: "Phase N passes with deferred gates. Deferred gates MUST run by [deadline]."
