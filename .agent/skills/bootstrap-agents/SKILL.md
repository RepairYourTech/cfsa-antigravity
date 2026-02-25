---
name: bootstrap-agents
description: "Utility — fill {{PLACEHOLDER}} values and provision skills from the library. Called by pipeline commands when tech stack info changes."
version: 2.0.0
---

# Bootstrap Agents

**This is a utility command, not an entry point.** It gets called by other pipeline commands (like `/create-prd`, `/iterate-plan`, `/write-be-spec`, `/write-fe-spec`, `/add-feature`, `/implement-slice`) whenever they make tech stack decisions or introduce new dependencies.

Bootstrap does two things:
1. **Fill `{{PLACEHOLDER}}` values** in kit instruction templates
2. **Provision skills** from `skill-library/` based on stack and surface triggers

**Input**: Template values (package manager, framework, database, etc.) + optional stack/surface triggers
**Output**: Filled templates + newly installed skills in `.claude/skills/`

---

## 1. Receive template values

The calling command provides these values (all optional — fill only what's provided, leave others as `{{PLACEHOLDER}}`):

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

If any values are missing, leave those `{{PLACEHOLDER}}`s in place — they'll be filled on a future invocation.

---

## 2. Fill project skill templates

### `.claude/skills/project-commands/SKILL.md`
Replace: `{{PACKAGE_MANAGER}}`, `{{DEV_COMMAND}}`, `{{TEST_COMMAND}}`, `{{TEST_WATCH_COMMAND}}`, `{{TEST_COVERAGE_COMMAND}}`, `{{LINT_COMMAND}}`, `{{LINT_FIX_COMMAND}}`, `{{FORMAT_COMMAND}}`, `{{TYPE_CHECK_COMMAND}}`, `{{BUILD_COMMAND}}`, `{{PREVIEW_COMMAND}}`, `{{VALIDATION_COMMAND}}`

### `.claude/skills/project-workflow/SKILL.md`
Replace: `{{VALIDATION_COMMAND}}`

### `.claude/skills/project-patterns/SKILL.md`
Replace: `{{FRAMEWORK_PATTERNS}}` if provided

### `.claude/skills/project-structure/SKILL.md`
Replace: `{{PROJECT_STRUCTURE}}`, `{{ARCHITECTURE_TABLE}}` if provided

### `.claude/skills/project-tech-stack/SKILL.md`
Replace: `{{TECH_STACK_SUMMARY}}`, `{{FRONTEND_FRAMEWORK}}`, `{{BACKEND_RUNTIME}}`, `{{DATABASE}}`, `{{AUTH_PROVIDER}}`, `{{HOSTING}}`, `{{CDN_ASSETS}}`, `{{CICD}}`, `{{MONITORING}}`, `{{PACKAGE_MANAGER}}`, `{{TEST_RUNNER}}`, `{{LINTER}}`, `{{TYPE_CHECKER}}`, `{{INSTALLED_SKILLS}}`

---

## 3. Fill default operational skill templates

Scan all `.claude/skills/*/SKILL.md` files for `{{PLACEHOLDER}}` values and fill any that match the provided template values:

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

## 4. Fill rule templates

### `.claude/rules/contract-first.md`
Replace: `{{VALIDATION_COMMAND}}`, `{{TEST_RUNNER}}`

---

## 5. Fill CLAUDE.md

Replace in `CLAUDE.md` at project root:
- `{{PROJECT_NAME}}`
- `{{DESCRIPTION}}`
- `{{TECH_STACK_SUMMARY}}`
- `{{VALIDATION_COMMAND}}`

---

## 6. Read skill library manifest

Read `skill-library/MANIFEST.md` to load the trigger tables.

If `skill-library/MANIFEST.md` does not exist (e.g., user deleted it or is using a minimal kit), skip steps 7-8 and go to step 9.

---

## 7. Provision skills from library

For each stack key provided in the template values, check the **Stack Triggers** table in the manifest:

1. Match the provided value against the manifest's `Value Pattern` (case-insensitive)
2. If a match is found AND the skill is NOT already in `.claude/skills/[installed-as]/`:
   - Copy the entire directory from `skill-library/[library-path]/` → `.claude/skills/[installed-as]/`
   - Fill any `{{PLACEHOLDER}}`s in the newly-copied `SKILL.md` with current template values
3. If the skill already exists in `.claude/skills/`, skip it (idempotent)

For each surface type provided in `SURFACES`, check the **Surface Triggers** table:

1. Match the surface type against the manifest's `Surface Type` column
2. Copy matching skills that don't already exist, same as above

### Matching rules

| Manifest Pattern | Matches |
|-----------------|---------|
| `*surrealdb*` | "SurrealDB", "surrealdb (self-hosted)", "SurrealDB Cloud" |
| `*cloudflare*` | "Cloudflare Workers", "Cloudflare Pages + Workers" |
| `*tailwind*` | "Tailwind CSS v4", "Tailwind CSS" |
| `*vercel*` OR `*ai-sdk*` | "Vercel AI SDK", "AI SDK" |
| `*three*` OR `*r3f*` | "Three.js", "React Three Fiber", "R3F" |

Pattern matching is glob-style with `*` as wildcard, case-insensitive.

---

## 8. Update installed skills list

After provisioning, build a markdown list of all installed skills (both defaults and library-provisioned) and update `{{INSTALLED_SKILLS}}` in `project-tech-stack`:

```markdown
### Default Skills
- fix-bug — TDD bug fix workflow
- refactor — Safe refactoring with test verification
- add-feature — Add feature to existing architecture
- deploy — Full deployment pipeline
- pr-review — Structured PR review
- security-audit — Security review across all layers
- main-workflow — General development workflow
- iterate-plan — Tech stack gap analysis
- setup-session — Session initialization
- using-git-worktrees — Isolated workspace management
- github-workflow-automation — GitHub CI/CD patterns
- audit-context-building — Deep code analysis
- context7-auto-research — Auto documentation lookup
- self-improving-agent — Learning from experiences

### Stack Skills
- [skill-name] — [description] (installed for [STACK_KEY]=[value])
- ...

### Surface Skills
- [skill-name] — [description] (installed for [surface] surface)
- ...
```

---

## 9. Report results

Present the results to the calling command (not directly to the user — the calling command handles user communication):

- Which `{{PLACEHOLDER}}`s were filled (and their values)
- Which `{{PLACEHOLDER}}`s remain unfilled
- Which skills were provisioned from the library (if any)
- Which skills were already installed and skipped
- Any errors (missing files, missing library paths)

---

## Idempotency

Bootstrap is safe to call multiple times:

- **Already-filled placeholders**: If a `{{PLACEHOLDER}}` has already been replaced with a value, it is NOT re-filled unless the calling command explicitly provides a new value for that key
- **Already-installed skills**: Skills that already exist in `.claude/skills/` are not re-copied from the library
- **New values**: New stack/surface values trigger new skill installations without affecting existing ones
- **Partial invocation**: Bootstrap can be called with just one or two new values — it only fills what's provided
