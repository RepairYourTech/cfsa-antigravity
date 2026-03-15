---
description: Verify operational infrastructure after the infrastructure or auth slice — CI/CD green, staging live, migrations clean, auth working
pipeline:
  position: 7.5
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

Scan the surface stack map (`.agent/instructions/tech-stack.md`) for completeness:

1. Verify all per-surface rows have filled values for required columns
2. Verify cross-cutting categories (Auth, Security, CI/CD, Hosting) have filled values
3. Verify `.agent/instructions/commands.md` has non-template values

**If any map cells are empty** → **STOP.** Run `/bootstrap-agents` to populate them before proceeding.

**Pass criteria**: Surface stack map fully populated for all project surfaces.

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

Read .agent/skills/testing-strategist/SKILL.md and follow its methodology.
Read .agent/skills/systematic-debugging/SKILL.md and follow its methodology.

Load the CI/CD skill(s) from the cross-cutting section per the skill loading protocol (`.agent/skills/prd-templates/references/skill-loading-protocol.md`).

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

Load the ORMs skill(s) from the `shared` surface row per the skill loading protocol.

1. Run the migration status command (e.g., `prisma migrate status`, `drizzle-kit status`, or equivalent)
2. Verify no pending or failed migrations
3. Verify migration files exist in the expected directory
4. Check that rollback scripts or down migrations exist for each migration

**If migrations are pending or failed** → **STOP.** Mark check 4 as `❌`.

**Pass criteria**: Migration status clean. All migrations successful. Rollback capability exists.

> Update report: Mark check 4 as `✅`.

---

## 5. Staging deployment

Load the Hosting skill(s) from the cross-cutting section per the skill loading protocol.
Read .agent/skills/deployment-procedures/SKILL.md and follow its pre-deployment checklist and verification protocol.

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

## 6.5. Logging gate

Read `docs/plans/*-architecture-design.md` section `## Observability Architecture` to load the confirmed logging decisions.

1. Verify structured startup log is emitted on application boot with the following 5 required fields:
   - `timestamp` (ISO 8601)
   - `level` (info or higher)
   - `service` (application name)
   - `env` (environment name)
   - Correlation ID field (name as specified in architecture-design.md, e.g., `requestId`, `traceId`)
2. Verify log reaches configured destination (stdout, file, or cloud service as documented)
3. Verify PII fields named in `## Observability Architecture` are NOT present in any log output

**If startup log is missing any of the 5 required fields** → **STOP.** Mark check 6.5 as `❌`.
**If log does not reach configured destination** → **STOP.** Mark check 6.5 as `❌`.
**If PII fields appear in log output** → **STOP.** Mark check 6.5 as `❌`.

**Pass criteria**: Structured startup log emitted with all 5 fields. Log reaches destination. No PII fields in output.

> Update report: Mark check 6.5 as `✅`.

---

## 6.6. Error tracking gate

1. Confirm error tracking SDK is initialized (Sentry, Datadog, or equivalent as documented in `## Observability Architecture`)
2. Send a test error event from the application and verify it appears in the error tracking dashboard
3. Verify PII scrubbing is active — test error event must NOT contain any PII field values named in the architecture document

**If SDK is not initialized** → **STOP.** Mark check 6.6 as `❌`.
**If test error event does not appear in dashboard** → **STOP.** Mark check 6.6 as `❌`.
**If PII fields appear in error event** → **STOP.** Mark check 6.6 as `❌`.

**Pass criteria**: Error tracking SDK initialized. Test event received. PII scrubbing active.

> Update report: Mark check 6.6 as `✅`.

---

## 7-8. Finalize report

Finalize the report using the **Final Report** template from `.agent/skills/prd-templates/references/infrastructure-report-template.md`. Update the Verdict field to `✅ PASS` or `❌ FAIL` and fill in Failures and Next Steps sections.

The final report must include all eight gate checks: 0 (placeholder audit), 1 (CI/CD config), 2 (CI/CD green), 3 (environment audit), 4 (migration check), 5 (staging deployment), 6 (auth smoke test), 6.5 (logging gate), 6.6 (error tracking gate).

---

## 9. Present results

Use `notify_user` to present the verification verdict:

- **GREEN (all checks pass)**: "✅ Infrastructure verification passed. Next: proceed to the next feature slice with `/implement-slice`."
- **RED (any check fails)**: "❌ Infrastructure verification failed. [list failures]. Fix and re-run `/verify-infrastructure`."
