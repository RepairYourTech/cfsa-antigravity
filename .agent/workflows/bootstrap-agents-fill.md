---
description: Receive template values and fill instruction/rule/AGENTS.md templates for the bootstrap-agents workflow
parent: bootstrap-agents
shard: fill
standalone: true
position: 1
pipeline:
  position: infrastructure
  stage: provisioning
  predecessors: []
  successors: [bootstrap-agents-provision]
  skills: []
  calls-bootstrap: false
---

// turbo-all

# Bootstrap Agents — Fill Templates

Receive template values from the calling workflow and fill `{{PLACEHOLDER}}` values across all instruction, rule, skill, and root-level templates.

**Prerequisite**: If invoked standalone, the caller must provide at least one template key-value pair. If no values are provided, there is nothing to fill — report and exit.

> [!IMPORTANT]
> This workflow fills template-level placeholders (project name, description, tech stack summary, architecture doc path). It does **NOT** fill workflow command placeholders (`{{VALIDATION_COMMAND}}`, `{{TEST_COMMAND}}`, `{{LINT_COMMAND}}`, etc.) or skill path placeholders (`{{DATABASE_SKILL}}`, `{{AUTH_SKILL}}`, etc.). Those are filled exclusively by `.agent/workflows/bootstrap-agents-provision.md` during the `/create-prd` stage. Running this workflow standalone will leave those placeholders unfilled with no indication — they require the provision step.

---

## 1. Receive template values

The calling workflow provides these values (all optional — fill only what's provided, leave others as `{{PLACEHOLDER}}`):

### Command & Tool Values

| Key | Example |
|-----|---------|
| `PACKAGE_MANAGER` | pnpm |
| `DEV_COMMAND` | pnpm dev |
| `TEST_COMMAND` | pnpm test |
| `TEST_WATCH_COMMAND` | pnpm test:watch |
| `TEST_COVERAGE_COMMAND` | pnpm test:coverage |
| `LINT_COMMAND` | pnpm lint |
| `LINT_FIX_COMMAND` | pnpm lint:fix |
| `FORMAT_COMMAND` | pnpm format |
| `TYPE_CHECK_COMMAND` | pnpm type-check |
| `BUILD_COMMAND` | pnpm build |
| `PREVIEW_COMMAND` | pnpm preview |
| `VALIDATION_COMMAND` | pnpm test && pnpm lint && pnpm type-check && pnpm build |

### Project Identity

| Key | Example |
|-----|---------|
| `PROJECT_NAME` | My Project |
| `DESCRIPTION` | One-line description |
| `TECH_STACK_SUMMARY` | Astro + React + SurrealDB + Firebase Auth |

### Architecture & Structure

| Key | Example |
|-----|---------|
| `FRAMEWORK_PATTERNS` | Framework-specific patterns block |
| `PROJECT_STRUCTURE` | Directory layout block |
| `ARCHITECTURE_TABLE` | Concern/Location/Runtime table rows |
| `ARCHITECTURE_DOC` | docs/plans/2026-02-10-architecture-design.md |
| `CONTRACTS_DIR` | src/contracts/ |
| `BUILD_OUTPUT_DIR` | dist/ |

### Stack Values (trigger skill provisioning)

| Key | Example |
|-----|---------|
| `DATABASE` | SurrealDB (self-hosted) |
| `FRONTEND_FRAMEWORK` | Astro + React Islands |
| `BACKEND_FRAMEWORK` | Hono |
| `API_LAYER` | tRPC |
| `BACKEND_RUNTIME` | Cloudflare Workers |
| `ORM` | Drizzle |
| `CSS_FRAMEWORK` | Tailwind CSS v4 |
| `UI_LIBRARY` | shadcn/ui |
| `AUTH_PROVIDER` | Firebase Auth |
| `PAYMENTS` | Stripe |
| `AI_SDK` | Vercel AI SDK |
| `STATE_MANAGEMENT` | TanStack Query |
| `E2E_TESTING` | Playwright |
| `UNIT_TESTING` | Vitest |
| `HOSTING` | Cloudflare Pages + Workers |
| `CDN_ASSETS` | Cloudflare R2 |
| `MONITORING` | Sentry |
| `OBSERVABILITY` | OpenTelemetry |
| `ANALYTICS` | Google Analytics |
| `EMAIL` | Resend |
| `QUEUE` | Inngest |
| `REALTIME` | Socket.io |
| `SEARCH` | Meilisearch |
| `CMS` | Payload CMS |
| `STORAGE` | AWS S3 |
| `CI_CD` | GitHub Actions |
| `MOBILE_FRAMEWORK` | Expo |
| `LANGUAGE` | TypeScript |
| `3D_FRAMEWORK` | Three.js / R3F |
| `DESKTOP_FRAMEWORK` | Tauri |
| `GAME_ENGINE` | Godot |
| `SECURITY` | OWASP |
| `TEST_RUNNER` | Vitest |
| `LINTER` | ESLint |
| `TYPE_CHECKER` | TypeScript (tsc) |

### Infrastructure Values

| Key | Example |
|-----|---------|
| `SSH_HOST` | my-vps |
| `DB_PORT` | 19000 |
| `CREDENTIAL_TOOL` | agent-auth ssh-add |
| `SECRET_MANAGEMENT` | wrangler secret |
| `DEPLOY_COMMAND` | wrangler deploy |

### Surface Types

| Key | Example |
|-----|---------|
| `SURFACES` | web, api |

**Pipeline Context**

| Key | Example | Purpose |
|-----|---------|---------|
| `PIPELINE_STAGE` | `create-prd`, `write-be-spec`, `write-fe-spec`, `implement-slice` | Context of this invocation — used to validate correct keys are being passed |
| `SKILL_BUNDLE` | `database-schema-design,migration-management,error-handling-patterns` | When provided, bootstrap loads all listed skills in one invocation |

If any values are missing, leave those `{{PLACEHOLDER}}`s in place — they'll be filled on a future invocation.

---

## 2. Fill instruction templates

### `.agent/instructions/commands.md`
Replace: `{{PACKAGE_MANAGER}}`, `{{DEV_COMMAND}}`, `{{TEST_COMMAND}}`, `{{TEST_WATCH_COMMAND}}`, `{{TEST_COVERAGE_COMMAND}}`, `{{LINT_COMMAND}}`, `{{LINT_FIX_COMMAND}}`, `{{FORMAT_COMMAND}}`, `{{TYPE_CHECK_COMMAND}}`, `{{BUILD_COMMAND}}`, `{{PREVIEW_COMMAND}}`, `{{VALIDATION_COMMAND}}`

### `.agent/instructions/workflow.md`
Replace: `{{VALIDATION_COMMAND}}`

### `.agent/instructions/patterns.md`
Replace: `{{FRAMEWORK_PATTERNS}}` if provided

### `.agent/instructions/structure.md`
Replace: `{{PROJECT_STRUCTURE}}`, `{{ARCHITECTURE_TABLE}}` if provided

### `.agent/instructions/tech-stack.md`
Replace: `{{TECH_STACK_SUMMARY}}`, `{{FRONTEND_FRAMEWORK}}`, `{{BACKEND_RUNTIME}}`, `{{DATABASE}}`, `{{AUTH_PROVIDER}}`, `{{HOSTING}}`, `{{CDN_ASSETS}}`, `{{CICD}}`, `{{MONITORING}}`, `{{PACKAGE_MANAGER}}`, `{{TEST_RUNNER}}`, `{{LINTER}}`, `{{TYPE_CHECKER}}`, `{{INSTALLED_SKILLS}}`, `{{ARCHITECTURE_DOC}}`
Replace: `{{ARCHITECTURE_DOC}}` with the dated architecture design filename (e.g., `docs/plans/YYYY-MM-DD-architecture-design.md`)

---

## 3. Fill default operational skill templates

Scan all `.agent/skills/*/SKILL.md` files for `{{PLACEHOLDER}}` values and fill any that match the provided template values:

- `{{VALIDATION_COMMAND}}` — in `fix-bug`, `main-workflow`, `deploy`, `refactor`
- `{{PACKAGE_MANAGER}}` — in `refactor`, `security-audit`
- `{{TEST_COVERAGE_COMMAND}}` — in `refactor`
- `{{BUILD_COMMAND}}` — in `deploy`
- `{{DEPLOY_COMMAND}}` — in `deploy`
- `{{BUILD_OUTPUT_DIR}}` — in `deploy`
- `{{SSH_HOST}}` — in `setup-session`
- `{{DB_PORT}}` — in `setup-session`
- `{{CREDENTIAL_TOOL}}` — in `setup-session`

---

## 4. Fill AGENTS.md

Replace in `AGENTS.md`:
- `{{PROJECT_NAME}}`
- `{{DESCRIPTION}}`
- `{{TECH_STACK_SUMMARY}}`
- `{{VALIDATION_COMMAND}}`
- `{{ARCHITECTURE_DOC}}`

### Report and proceed

Report which `{{PLACEHOLDER}}`s were filled and their values, which remain unfilled, and any errors encountered.

If invoked standalone, the next step is `/bootstrap-agents-provision` to provision skills from the library based on the stack values just filled.

If invoked by another workflow (e.g., `/create-prd`), return this report to the calling workflow — the caller will invoke `/bootstrap-agents-provision` automatically.

