---
description: Project initialization, directory structure, dependencies, and base configurations for the setup-workspace workflow
parent: setup-workspace
shard: scaffold
standalone: true
position: 1
pipeline:
  position: 8.51
  stage: setup
  predecessors: [plan-phase]
  successors: [setup-workspace-cicd]
  skills: [git-workflow, clean-code]
  calls-bootstrap: false
---

// turbo-all

# Setup Workspace — Scaffold

Initialize the project, create the directory structure, install dependencies, and configure the development environment. Gate: the dev server starts without errors.

**Prerequisite**: Phase plan and architecture-design.md must exist. Surface stack map must have Languages row populated.

---

## 1. Read architecture pattern

Read `docs/plans/*-architecture-design.md` and determine:

1. **Architecture pattern**: monolith / monorepo / multi-repo
2. **Service list**: enumerate every service/package (for monolith: just one)
3. **Language per service**: from the surface stack map in `.agent/instructions/tech-stack.md`

If multi-service, present the list to the user: "I'll scaffold these services: [list]. Correct?"

**STOP** until user confirms the service list.

---

## 2. Load skills

Read `.agent/skills/prd-templates/references/skill-loading-protocol.md`.

For each service's surface, load:
- **Languages** skill (e.g., TypeScript, Python, Rust)
- **BE Frameworks** skill (e.g., Next.js, Express, FastAPI)
- **FE Frameworks** skill if applicable (e.g., React, Svelte)

Read `.agent/skills/git-workflow/SKILL.md` for repository initialization patterns.

---

## 3. Initialize project

For each service in the service list:

1. **Create the project** using the framework's official scaffolding tool:
   - Read the BE/FE framework skill for the exact init command
   - Run the init command (e.g., `npx create-next-app@latest`, `cargo init`, `uv init`)
   - Use the project name from `architecture-design.md`

2. **Verify initialization succeeded** — the scaffolding tool should exit 0 and create the expected files

> [!IMPORTANT]
> Use the framework's OFFICIAL scaffolding tool — never manually create package.json or equivalent. The scaffolding tool sets up the correct defaults, scripts, and configuration that manual creation would miss.

**For monorepo**: Initialize the workspace root first (e.g., `npm init -w`), then init each package within the workspace structure.

---

## 4. Create directory structure

Read `.agent/instructions/structure.md` for the project's directory layout.

1. Create all directories specified in `structure.md`
2. Create `README.md` files for directories with 3+ expected files (per extensibility rule)
3. Create placeholder `index` files where the framework convention expects them

**Merge, don't overwrite**: If the scaffolding tool already created some directories, keep them. Only add missing ones.

---

## 5. Install dependencies

Read `docs/plans/*-architecture-design.md` dependency section.

1. **Production dependencies**: Install all runtime dependencies listed in the architecture doc
2. **Dev dependencies**: Install linter, formatter, type-checker, test framework (from the surface stack map's Unit Tests and E2E Tests cells)

For each dependency:
- Use exact versions from the architecture doc if specified
- Use latest stable if no version specified
- Verify installation succeeded

---

## 6. Create base configurations

Read `.agent/instructions/commands.md` for the validation command and expected tools.
Read `.agent/instructions/patterns.md` for code conventions.

Create/update configuration files:

| Config | Source | Examples |
|--------|--------|---------|
| Linter | Languages skill + commands.md | `.eslintrc`, `ruff.toml`, `clippy.toml` |
| Formatter | Languages skill + commands.md | `.prettierrc`, `rustfmt.toml` |
| Type checker | Languages skill | `tsconfig.json`, `mypy.ini` |
| Git ignore | `git-workflow` skill | `.gitignore` |
| Editor config | patterns.md | `.editorconfig` |

**Do not invent configurations** — copy patterns from the loaded skills and the project's `patterns.md`.

---

## 7. Create environment template

Read `docs/plans/*-architecture-design.md` environment/configuration section.

1. Create `.env.example` with ALL environment variables documented
2. Each variable gets a comment explaining its purpose and format
3. Sensitive values get placeholder markers: `<your-api-key-here>`
4. Group variables by category (database, auth, hosting, feature flags)

Also verify `.gitignore` includes `.env` and `.env.local` patterns.

---

## 8. Initialize git repository

Read `.agent/skills/git-workflow/SKILL.md` for repository setup patterns.

1. `git init` (if not already initialized)
2. Verify `.gitignore` is comprehensive (node_modules, .env, build artifacts, OS files)
3. Create initial commit: `chore: scaffold project structure`
4. Set up branch protection strategy from `git-workflow` skill (main branch)

For **multi-repo**: Push each repo to its own remote.
For **monorepo**: Single repo with workspace structure.

---

## 9. Verification gate

Run the dev server command from `.agent/instructions/commands.md`:

1. Start the dev server
2. Wait for it to be ready (watch for "ready" or "listening" output)
3. Verify it starts without errors
4. Verify the default page/endpoint responds (HTTP 200)
5. Stop the dev server

**If the dev server fails to start** → **STOP.** Debug the issue before proceeding to the next shard. Common causes: missing dependency, wrong Node version, port conflict.

**Pass criteria**: Dev server starts, serves a response, and shuts down cleanly.

> Present result to user: "✅ Scaffold complete. Dev server starts cleanly. Proceeding to CI/CD setup." or "❌ Dev server failed: [error]. Fix required before continuing."
