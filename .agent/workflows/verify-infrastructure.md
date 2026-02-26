---
description: Verify operational infrastructure after the infrastructure or auth slice — CI/CD green, staging live, migrations clean, auth working
pipeline:
  position: 9.5
  stage: verification
  predecessors: [implement-slice]
  successors: [implement-slice, validate-phase]
  skills: [testing-strategist, deployment-procedures, systematic-debugging]
  calls-bootstrap: false
---

// turbo-all

# Verify Infrastructure

Operational verification gate that runs after the `00-infrastructure` slice and again after the auth slice. No feature slice may begin until this workflow produces a green report.

---

## 0. Placeholder audit

Scan the repository for any remaining `{{PLACEHOLDER}}` values:

```bash
grep -rn '{{' --include='*.md' --include='*.ts' --include='*.json' . | grep -v node_modules | grep -v '.git/'
```

**If any `{{PLACEHOLDER}}` values are found** → **STOP.** Run `/bootstrap-agents` to fill them before proceeding.

**Pass criteria**: Zero `{{PLACEHOLDER}}` values in the repository (excluding `node_modules` and `.git`).

> Update report: Mark check 0 as `✅` in the report file.

---

## 0.5. Determine trigger

Read the current phase plan (e.g., `docs/plans/phases/phase-1.md`) to identify which slice just completed.

- **If the `00-infrastructure` slice was just completed** → trigger is `infrastructure`, report suffix is empty
- **If the auth slice was just completed** → trigger is `auth`, report suffix is `-auth`

Set the report filename now: `docs/audits/verify-infrastructure-YYYY-MM-DD-HHMM[-auth].md` (use the current date and time, 24-hour format, e.g., `verify-infrastructure-2026-02-26-1430.md`).

This determination is used by Step 6 (auth smoke test conditional) and Step 8 (report filename). Do not proceed without resolving the trigger.

---

## 0.6. Initialize report

Create the report file at the path determined in Step 0.5 with all checks marked `⏳`:

```markdown
# Infrastructure Verification Report

**Date**: YYYY-MM-DD HH:MM
**Trigger**: [infrastructure slice | auth slice]
**Verdict**: ⏳ in-progress

## Results

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 0 | Placeholder audit | ⏳ | |
| 1 | CI/CD config | ⏳ | |
| 2 | CI/CD green | ⏳ | |
| 3 | Environment audit | ⏳ | |
| 4 | Migration check | ⏳ | |
| 5 | Staging deployment | ⏳ | |
| 6 | Auth smoke test | ⏳ | |

## Failures (if any)

None yet.

## Next Steps

In progress.
```

This ensures a disk record exists even if the workflow stops at a STOP point.

---

## 1. CI/CD config check

Locate the CI/CD configuration file (e.g., `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`).

Verify the configuration includes:
- Lint step
- Type-check step
- Test step
- Build step

**If no CI/CD config exists** → **STOP.** CI/CD must be configured before infrastructure can be verified.

> Update report: Before stopping, mark check 1 as `❌` in the report file with the failure detail: "No CI/CD configuration file found."

**Pass criteria**: CI/CD configuration exists and covers lint, type-check, test, and build.

> Update report: Mark check 1 as `✅` in the report file.

---

## 2. CI/CD green check

Verify the CI/CD pipeline has run for the latest commit and ALL jobs are passing.

**If CI/CD is red** → **STOP.** List the failing jobs and their error output. Do not proceed until CI/CD is green.

> Update report: Before stopping, mark check 2 as `❌` in the report file with the failing job names and error output.

**Pass criteria**: CI/CD pipeline is green for the latest commit.

> Update report: Mark check 2 as `✅` in the report file.

---

## 3. Environment audit

1. Read the project's environment template (`.env.example`, `.env.template`, or equivalent)
2. Verify all required environment variables are documented with descriptions
3. Verify no secrets are hardcoded in source code — scan for patterns like `sk_live_`, `AKIA`, hardcoded tokens
4. Verify `.env` files are in `.gitignore`

**If secrets are found in source** → **STOP.** Remove them immediately, rotate the compromised credentials, and re-run.

> Update report: Before stopping, mark check 3 as `❌` in the report file with the file paths and patterns where secrets were found.

**Pass criteria**: All env vars documented, no secrets in source, `.env` in `.gitignore`.

> Update report: Mark check 3 as `✅` in the report file.

---

## 4. Migration check

1. Run the migration status command (e.g., `prisma migrate status`, `drizzle-kit status`, or equivalent)
2. Verify there are no pending migrations and no failed migrations
3. Verify migration files exist in the expected directory
4. Check that rollback scripts or down migrations exist for each migration

**If migrations are pending or failed** → **STOP.** Run the pending migrations, verify they succeed, and re-run this step.

> Update report: Before stopping, mark check 4 as `❌` in the report file with the migration status output.

**Pass criteria**: Migration status is clean. All migrations ran successfully. Rollback capability exists.

> Update report: Mark check 4 as `✅` in the report file.

---

## 5. Staging deployment

1. Deploy to staging using the project's deployment process
2. Verify deployment succeeded — no rollback triggered, no error logs in deployment output
3. Verify the application is accessible at the staging URL
4. Hit the health check endpoint (e.g., `GET /api/health` or `/healthz`)
5. Verify it returns HTTP 200 with a valid response body confirming database connectivity

**If deployment or health check fails** → **STOP.** Diagnose the failure, fix it, and re-run.

> Update report: Before stopping, mark check 5 as `❌` in the report file with the deployment error or health check response.

**Pass criteria**: Staging deployment succeeds, application is accessible, health endpoint returns 200.

> Update report: Mark check 5 as `✅` in the report file.

---

## 6. Auth smoke test (conditional)

Read the phase plan to determine if the auth slice has been completed.

**If auth has NOT been implemented** → Skip this step and mark as ⏭️ in the report.

If auth IS implemented:
1. Obtain a valid auth token using the project's authentication flow
2. Hit at least one authenticated route with a valid token — verify 200 response
3. Hit at least one protected route without a token — verify 401 response
4. Hit at least one protected route with an expired/invalid token — verify 401/403 response

**If any auth check fails** → **STOP.** Auth is broken. Do not proceed to feature slices until auth works.

> Update report: Before stopping, mark check 6 as `❌` in the report file with which auth check failed and the response received.

**Pass criteria**: Authenticated routes accept valid tokens. Protected routes reject missing/invalid tokens.

> Update report: Mark check 6 as `✅` in the report file. If this step was skipped (auth not yet implemented), mark as `⏭️ skipped`.

---

## 7. Determine scope and report suffix

Based on the trigger determined in Step 0.5:

- **Infrastructure slice** (`00-infrastructure`): Report suffix is empty
- **Auth slice**: Report suffix is `-auth`

---

## 8. Write verification report

Finalize the report at the path determined in Step 0.5 (the file was initialized in Step 0.6 and updated progressively). Update the **Verdict** field to `✅ PASS` or `❌ FAIL` and fill in the **Failures** and **Next Steps** sections:

```markdown
# Infrastructure Verification Report

**Date**: YYYY-MM-DD
**Trigger**: [infrastructure slice | auth slice]
**Verdict**: [PASS | FAIL]

## Results

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 0 | Placeholder audit | ✅/❌ | |
| 1 | CI/CD config | ✅/❌ | |
| 2 | CI/CD green | ✅/❌ | |
| 3 | Environment audit | ✅/❌ | |
| 4 | Migration check | ✅/❌ | |
| 5 | Staging deployment | ✅/❌ | |
| 6 | Auth smoke test | ✅/❌/⏭️ | |

## Failures (if any)

[Details of any failing checks]

## Next Steps

[What to do next based on the verdict]
```

---

## 9. Present results

Use `notify_user` to present the verification verdict:

- **GREEN (all checks pass)**: "✅ Infrastructure verification passed. The operational foundation is solid. Next: proceed to the next feature slice with `/implement-slice`."
- **RED (any check fails)**: "❌ Infrastructure verification failed. The following checks did not pass: [list]. Fix the failures and re-run `/verify-infrastructure` before starting any feature slice."
