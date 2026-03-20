---
description: CI/CD pipeline configuration, stages, secrets, and multi-service matrix builds for the setup-workspace workflow
parent: setup-workspace
shard: cicd
standalone: true
position: 2
pipeline:
  position: 8.52
  stage: setup
  predecessors: [setup-workspace-scaffold]
  successors: [setup-workspace-hosting]
  skills: [git-workflow, workflow-automation]
  calls-bootstrap: false
---

// turbo-all

# Setup Workspace — CI/CD

Create the CI/CD pipeline configuration with lint, type-check, test, and build stages. Gate: pipeline runs to completion (tests may fail — no application code exists yet, but the pipeline itself must execute).

**Prerequisite**: Project scaffolded (dev server starts). Surface stack map CI/CD cell populated.

---

## 1. Load CI/CD skill

Read `.agent/skills/prd-templates/references/skill-loading-protocol.md`.

Load the CI/CD skill from the cross-cutting section of the surface stack map (`.agent/instructions/tech-stack.md`).

Read the loaded skill's `SKILL.md` (e.g., `.agent/skills/github-actions/SKILL.md`).

If the skill is not installed, check `.agent/skill-library/MANIFEST.md` and provision it. If not in the library, read `.agent/skills/find-skills/SKILL.md` for discovery.

---

## 2. Determine pipeline architecture

Read `docs/plans/*-architecture-design.md` for the architecture pattern.

| Pattern | Pipeline Strategy |
|---------|------------------|
| **Monolith** | Single pipeline, all stages sequential |
| **Monorepo** | Matrix or multi-job: each workspace gets lint/test/build; shared deploy stage |
| **Multi-repo** | Each repo has its own pipeline (scaffold shard already created separate repos) |

For **monorepo**, determine the CI/CD platform's workspace detection mechanism:
- GitHub Actions: `paths` filter per workspace, or matrix with `workspace` variable
- GitLab CI: `rules: changes` per directory
- Other: consult the loaded CI/CD skill

---

## 3. Create pipeline configuration

Using the CI/CD skill's patterns, create the pipeline config file:

### Required stages (in order)

| Stage | What | Fails On |
|-------|------|----------|
| **Install** | Install dependencies | Dependency resolution failure |
| **Lint** | Run linter | Any lint violation |
| **Type Check** | Run type checker (if applicable) | Any type error |
| **Test** | Run test suite | Any test failure |
| **Build** | Production build | Build failure |

Read `.agent/instructions/commands.md` for the exact commands for each stage.

### Pipeline config requirements

1. **Trigger**: Push to main + pull request to main
2. **Caching**: Cache dependency directories (e.g., `node_modules`, `.cargo`, `__pycache__`) — follow CI/CD skill caching patterns
3. **Runtime version**: Pin the language runtime version (from surface stack map Languages row)
4. **Timeout**: Set reasonable timeouts per stage (5 min lint, 10 min test, 10 min build)
5. **Artifact upload**: Upload build artifacts for deployment stages

For **monorepo** with matrix strategy, add a `strategy.matrix` (or equivalent) that iterates over workspaces.

---

## 4. Configure CI/CD secrets

Enumerate all secrets needed by the pipeline:

1. Read `.env.example` — identify variables that are secrets (API keys, tokens, connection strings)
2. Read `docs/plans/*-architecture-design.md` integration section — identify external service credentials
3. Read the Hosting skill — identify deployment credentials

For each secret:
- Document it in the pipeline config as a required secret/variable
- Add a comment explaining where to obtain the value
- **Do NOT hardcode any secret values** — reference platform secret storage only

Present the secrets list to user: "These CI/CD secrets need to be configured in [platform]: [list with descriptions]. Please add them now or after this workflow completes."

> [!CAUTION]
> Never write actual secret values into any file. Only reference secret names using the CI/CD platform's secret syntax (e.g., `${{ secrets.DATABASE_URL }}` for GitHub Actions).

---

## 5. Multi-service pipeline specialization

For **monorepo** projects, ensure the pipeline handles:

1. **Change detection**: Only run stages for workspaces with changed files
2. **Dependency order**: If service A depends on service B, build B first
3. **Shared libraries**: If a shared library changes, rebuild all dependent services
4. **Independent deploy**: Each service can deploy independently

For **multi-repo** projects: this step is N/A — each repo has its own pipeline created during scaffold.

---

## 6. Verification gate

1. Commit the pipeline configuration: `chore: add CI/CD pipeline configuration`
2. Push to trigger the pipeline
3. Wait for the pipeline to start executing
4. Verify all stages **execute** (not necessarily pass — tests will fail because no test files exist yet, but lint, type-check, and build should pass on the scaffolded project)

**Expected results for a freshly scaffolded project:**

| Stage | Expected |
|-------|----------|
| Install | ✅ Pass |
| Lint | ✅ Pass (no source files to lint, or default files pass) |
| Type Check | ✅ Pass |
| Test | ⚠️ May fail (no tests exist yet) or ✅ pass (0 tests) |
| Build | ✅ Pass |

**If Install, Lint, Type Check, or Build fail** → **STOP.** Debug the pipeline config before proceeding.

**Pass criteria**: Pipeline executes all stages. Install, Lint, Type Check, and Build pass. Test stage exits (pass or "no tests found" is acceptable).

> Present result to user: "✅ CI/CD pipeline running. [N] stages executing. Proceeding to hosting setup." or "❌ Pipeline failed at [stage]: [error]. Fix required."
