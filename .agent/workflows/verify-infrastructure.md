---
description: Verify operational infrastructure after the infrastructure or auth slice — CI/CD green, staging live, migrations clean, auth working
pipeline:
  position: 9.5
  stage: verification
  predecessors: [implement-slice]
  successors: [implement-slice, validate-phase]
  skills: [testing-strategist, deployment-procedures, systematic-debugging, prd-templates]
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

Set the report filename now: `docs/audits/verify-infrastructure-YYYY-MM-DD-HHMM[-auth].md`.

---

## 0.6. Initialize report

Read `.agent/skills/prd-templates/references/infrastructure-report-template.md` for the report structure. Create the report file at the path determined in Step 0.5 using the **Initial Report** template with all checks marked `⏳`.

---

## 1. CI/CD config check

Locate the CI/CD configuration file (e.g., `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`).

Verify the configuration includes: lint step, type-check step, test step, build step.

**If no CI/CD config exists** → **STOP.** Mark check 1 as `❌` in the report.

**Pass criteria**: CI/CD configuration exists and covers lint, type-check, test, and build.

> Update report: Mark check 1 as `✅`.

---

## 2. CI/CD green check

Verify the CI/CD pipeline has run for the latest commit and ALL jobs are passing.

**If CI/CD is red** → **STOP.** Mark check 2 as `❌` with failing job names and errors.

**Pass criteria**: CI/CD pipeline is green for the latest commit.

> Update report: Mark check 2 as `✅`.

---

## 3. Environment audit

1. Read the project's environment template (`.env.example`, `.env.template`, or equivalent)
2. Verify all required environment variables are documented with descriptions
3. Verify no secrets are hardcoded in source code — scan for patterns like `sk_live_`, `AKIA`, hardcoded tokens
4. Verify `.env` files are in `.gitignore`

**If secrets are found in source** → **STOP.** Mark check 3 as `❌`. Remove them immediately, rotate credentials, re-run.

**Pass criteria**: All env vars documented, no secrets in source, `.env` in `.gitignore`.

> Update report: Mark check 3 as `✅`.

---

## 4. Migration check

1. Run the migration status command (e.g., `prisma migrate status`, `drizzle-kit status`, or equivalent)
2. Verify no pending or failed migrations
3. Verify migration files exist in the expected directory
4. Check that rollback scripts or down migrations exist for each migration

**If migrations are pending or failed** → **STOP.** Mark check 4 as `❌`.

**Pass criteria**: Migration status clean. All migrations successful. Rollback capability exists.

> Update report: Mark check 4 as `✅`.

---

## 5. Staging deployment

1. Deploy to staging using the project's deployment process
2. Verify deployment succeeded — no rollback triggered, no error logs
3. Verify the application is accessible at the staging URL
4. Hit the health check endpoint (e.g., `GET /api/health` or `/healthz`)
5. Verify it returns HTTP 200 with a valid response body confirming database connectivity

**If deployment or health check fails** → **STOP.** Mark check 5 as `❌`.

**Pass criteria**: Staging deployment succeeds, application accessible, health endpoint returns 200.

> Update report: Mark check 5 as `✅`.

---

## 6. Auth smoke test (conditional)

Read the phase plan to determine if the auth slice has been completed.

**If auth has NOT been implemented** → Skip this step and mark as ⏭️ in the report.

If auth IS implemented:
1. Obtain a valid auth token using the project's authentication flow
2. Hit at least one authenticated route with a valid token — verify 200 response
3. Hit at least one protected route without a token — verify 401 response
4. Hit at least one protected route with an expired/invalid token — verify 401/403 response

**If any auth check fails** → **STOP.** Mark check 6 as `❌`.

**Pass criteria**: Authenticated routes accept valid tokens. Protected routes reject missing/invalid tokens.

> Update report: Mark check 6 as `✅` or `⏭️ skipped`.

---

## 7-8. Finalize report

Finalize the report using the **Final Report** template from `.agent/skills/prd-templates/references/infrastructure-report-template.md`. Update the Verdict field to `✅ PASS` or `❌ FAIL` and fill in Failures and Next Steps sections.

---

## 9. Present results

Use `notify_user` to present the verification verdict:

- **GREEN (all checks pass)**: "✅ Infrastructure verification passed. Next: proceed to the next feature slice with `/implement-slice`."
- **RED (any check fails)**: "❌ Infrastructure verification failed. [list failures]. Fix and re-run `/verify-infrastructure`."
