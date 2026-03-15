---
name: bootstrap-agents
description: "Utility — fill the surface stack map in tech-stack.md and provision skills using intelligent resolution. Called by pipeline commands when tech stack info changes."
version: 3.0.0
---

# Bootstrap Agents

**This is a utility command, not an entry point.** It gets called by other pipeline commands (like `/create-prd`, `/write-be-spec`, `/write-fe-spec`, `/implement-slice`) whenever they make tech stack decisions or introduce new dependencies.

Bootstrap does two things:
1. **Fill the surface stack map** in `.agent/instructions/tech-stack.md` with stack decisions
2. **Provision skills** from `skill-library/` using the 4-tier resolution chain

**Input**: Surface-keyed stack values + optional global values
**Output**: Filled map cells + newly installed skills in `.agent/skills/`

---

## 1. Receive values

The calling command provides values in two categories:

### Surface-Keyed Values (fill the Per-Surface Skills table)

Each value is tagged with a surface. Format: `SURFACE=<surface> KEY=<value>`

Example invocation from `/create-prd-stack`:
```
SURFACE=shared  LANGUAGES=typescript  BE_FRAMEWORKS=hono  DATABASES=supabase,surrealdb  ORMS=drizzle
SURFACE=web     LANGUAGES=typescript  FE_FRAMEWORKS=astro  FE_DESIGN=tailwind,vanilla-css  STATE_MGMT=nanostores  DATABASES=supabase,surrealdb  UNIT_TESTS=vitest  E2E_TESTS=playwright
SURFACE=desktop LANGUAGES=typescript,rust  FE_FRAMEWORKS=—  BE_FRAMEWORKS=tauri  DATABASES=supabase,surrealdb,pglite,surrealdb-embedded  UNIT_TESTS=vitest,cargo-test
```

Per-surface column keys:

| Column Key | Map Column | Example |
|-----------|------------|---------|
| `LANGUAGES` | Languages | typescript, rust |
| `BE_FRAMEWORKS` | BE Frameworks | hono, tauri |
| `FE_FRAMEWORKS` | FE Frameworks | astro, react-native |
| `FE_DESIGN` | FE Design | tailwind, vanilla-css |
| `ORMS` | ORMs | drizzle |
| `STATE_MGMT` | State Mgmt | nanostores, zustand |
| `DATABASES` | Databases | supabase, surrealdb, pglite |
| `UNIT_TESTS` | Unit Tests | vitest, cargo-test |
| `E2E_TESTS` | E2E Tests | playwright, detox |
| `TEST_CMD` | Test Cmd | npm test |
| `VALIDATION_CMD` | Validation Cmd | npm run validate |
| `LINT_CMD` | Lint Cmd | npm run lint |
| `BUILD_CMD` | Build Cmd | npm run build |
| `DEV_CMD` | Dev Cmd | npm run dev |
| `PACKAGE_MGR` | Package Mgr | npm |

### Cross-Cutting Values (fill the Cross-Cutting Skills table)

These are project-wide, not per-surface:

| Key | Map Category | Example |
|-----|-------------|---------|
| `AUTH` | Auth | clerk, supabase-auth |
| `CI_CD` | CI/CD | github-actions |
| `HOSTING` | Hosting | vercel, tauri-updater |
| `SECURITY` | Security | owasp-web, desktop-sandboxing |
| `API_DESIGN` | API Design | api-design-principles |
| `ACCESSIBILITY` | Accessibility | accessibility |
| `CONTRACT_LIBRARY` | Contract Library | zod |

### Global Values (fill Global Settings in tech-stack.md + root configs)

| Key | Example |
|-----|---------|
| `PROJECT_NAME` | RepairYour.Tech |
| `DESCRIPTION` | One-line description |
| `TECH_STACK_SUMMARY` | Supabase + SurrealDB + Astro + Tauri |
| `SURFACES` | web, desktop, mobile |
| `ARCHITECTURE_DOC` | docs/plans/2026-03-13-architecture-design.md |

### Structural Values (fill instruction templates — unchanged from v2)

| Key | Example |
|-----|---------|
| `FRAMEWORK_PATTERNS` | Framework-specific patterns block |
| `PROJECT_STRUCTURE` | Directory layout block |
| `ARCHITECTURE_TABLE` | Concern/Location/Runtime table rows |

### Infrastructure Values (fill instruction templates — unchanged from v2)

| Key | Example |
|-----|---------|
| `SSH_HOST` | my-vps |
| `DB_PORT` | 19000 |
| `CREDENTIAL_TOOL` | agent-auth ssh-add |
| `SECRET_MANAGEMENT` | wrangler secret |
| `DEPLOY_COMMAND` | wrangler deploy |

If any values are missing, leave those cells empty — they'll be filled on a future invocation.

---

## 2. Fill the surface stack map

Open `.agent/instructions/tech-stack.md` and update:

### 2a. Per-Surface Skills table

For each `SURFACE=<name>` received:
1. If a row for `<name>` exists → update the cells for the provided column keys only (don't overwrite cells that already have values unless explicitly re-provided)
2. If no row exists → add a new row with the provided values, `—` for unprovided columns

### 2b. Cross-Cutting Skills table

For each cross-cutting key received, update the corresponding category row. If the value is additive (e.g., adding a second database), **append** to the comma-separated list rather than overwriting. If the value is already present, skip (idempotent).

### 2c. Global Settings

Fill the Global Settings table with any provided global values.

---

## 3. Fill root agent config files

Replace in **both** `AGENTS.md` and `GEMINI.md`:
- `{{PROJECT_NAME}}`
- `{{DESCRIPTION}}`
- `{{TECH_STACK_SUMMARY}}`
- `{{VALIDATION_COMMAND}}` — use the **primary surface's** validation command from the map (first non-shared row, or shared if only shared exists)
- `{{ARCHITECTURE_DOC}}`
- `{{CONTRACT_LIBRARY}}`
- `{{INSTALLED_SKILLS}}` (if provided; otherwise leave for step 8)

> **Note**: Both files serve as root agent config. Both must be kept in sync — any value filled in one must be filled in the other.

---

## 4. Fill instruction templates

### `.agent/instructions/commands.md`
Write per-surface command sections. For each surface in the map, create a section with its commands (Test Cmd, Validation Cmd, Lint Cmd, Build Cmd, Dev Cmd, Package Mgr).

### `.agent/instructions/workflow.md`
Fill `{{VALIDATION_COMMAND}}` with the primary surface's validation command.

### `.agent/instructions/patterns.md`
Replace `{{FRAMEWORK_PATTERNS}}` if provided.

### `.agent/instructions/structure.md`
Replace `{{PROJECT_STRUCTURE}}`, `{{ARCHITECTURE_TABLE}}` if provided.

---

## 5. Fill operational skill and rule templates

Scan `.agent/skills/*/SKILL.md` and `.agent/rules/*.md` for `{{PLACEHOLDER}}` values and fill any that match the provided values. Currently applicable:

- `{{VALIDATION_COMMAND}}` — in `fix-bug`, `main-workflow`, `deploy`, `refactor`
- `{{PACKAGE_MANAGER}}` — in `refactor`, `security-audit`
- `{{CONTRACT_LIBRARY}}` — in `tdd-contract-first.md`
- Other command/infra placeholders as documented in v2

---

## 6. Read skill library manifest

Read `skill-library/MANIFEST.md` to load the trigger tables.

If `skill-library/MANIFEST.md` does not exist, skip steps 7-8 and go to step 9.

---

## 7. Provision skills — 4-Tier Resolution Chain

For each skill name referenced in ANY cell of the surface stack map, resolve it using this chain:

### Tier 1: Exact Match
Check `.agent/skill-library/{name}/` (or `.agent/skills/{name}/` if already installed).
- **Found in library** AND not yet installed → copy to `.agent/skills/{name}/`, fill any `{{PLACEHOLDER}}`s in the copied SKILL.md
- **Already installed** → skip (idempotent)
- **Not found** → proceed to Tier 2

### Tier 2: Partial Match + Adequacy Check
Search `.agent/skill-library/` and `.agent/skills/` for skills whose name contains the base term. E.g., for `surrealdb-embedded`, check if `surrealdb` exists.

- **Partial match found** → Read its `SKILL.md`. Assess: does it cover the needed variant? Check for keywords related to the specific need (e.g., "embedded", "WASM", "Rust-native" for `surrealdb-embedded`).
  - **Adequate** — the existing skill covers the variant → use it. Note in the report: `"{name}" resolved by existing "{partial}" skill (covers {variant})`.
  - **Falls short** — the skill doesn't address the specific variant → proceed to Tier 3
- **No partial match** → proceed to Tier 3

### Tier 3: External Discovery
Read `.agent/skills/find-skills/SKILL.md` and invoke its discovery methodology to search for the skill externally.

- **Found** → install → fill map cell with resolved name
- **Not found** → proceed to Tier 4

### Tier 4: Human Escalation
Mark the map cell with `⚠️ {name} [not found]`. Include in the report:

> "Skill `{name}` was not found in the skill library, via partial match, or externally. Options:
> 1. Create it with `/skill-creator`
> 2. Provide an alternative skill name
> 3. Mark as not needed (change cell to `—`)"

### Resolution reporting
After resolving all skills, report:
- Which skills were installed (Tier 1)
- Which skills were resolved by adequacy check (Tier 2) — include justification
- Which skills were discovered externally (Tier 3)
- Which skills need human attention (Tier 4) — include the `⚠️` cells

---

## 8. Update installed skills list

After provisioning, build a markdown list of all installed skills and update `{{INSTALLED_SKILLS}}` in `tech-stack.md`:

```markdown
### Default Skills
- fix-bug — TDD bug fix workflow
- refactor — Safe refactoring with test verification
- ...

### Stack Skills (Per-Surface)
- [skill-name] — [description] (surface: [surface], column: [column])
- ...

### Stack Skills (Cross-Cutting)
- [skill-name] — [description] (category: [category])
- ...

### Surface Skills
- [skill-name] — [description] (installed for [surface] surface)
- ...
```

---

## 9. Report results

Present the results to the calling command (not directly to the user — the calling command handles user communication):

- Which map cells were filled (and their values)
- Which map cells remain empty
- Skill resolution report (from step 7)
- Which skills were already installed and skipped
- Any `⚠️` cells requiring user attention
- Any errors (missing files, missing library paths)

---

## Idempotency

Bootstrap is safe to call multiple times:

- **Already-filled map cells**: Cells with values are NOT overwritten unless the calling command explicitly re-provides a value for that surface + column
- **Already-installed skills**: Skills that already exist in `.agent/skills/` are not re-copied from the library
- **New surface rows**: New surfaces trigger new row creation without affecting existing rows
- **Appending values**: Cross-cutting skills and accumulated columns append to existing comma-separated lists without duplicating
- **Partial invocation**: Bootstrap can be called with just one surface or one key — it only fills what's provided
