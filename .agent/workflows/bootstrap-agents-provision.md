---
description: Skill library provisioning, workflow placeholder filling, and result reporting for the bootstrap-agents workflow
parent: bootstrap-agents
shard: provision
standalone: true
position: 2
pipeline:
  position: infrastructure
  stage: provisioning
  predecessors: [bootstrap-agents-fill]
  successors: []
  skills: []
  calls-bootstrap: false
---

// turbo-all

# Bootstrap Agents — Provision Skills

Read the skill library manifest, provision matching skills, fill workflow placeholders, and report results.

**Prerequisite**: If invoked standalone, the caller must have template values available (from a previous `/bootstrap-agents-fill` run or direct invocation with stack/surface keys).

---

## 6. Read skill library manifest

Read `.agent/skill-library/MANIFEST.md` to load the trigger tables.

If `.agent/skill-library/MANIFEST.md` does not exist (e.g., user deleted it or is using a minimal kit), skip steps 7-8 and go to step 9.

---

## 7. Provision skills from library

For each stack key provided in the template values, check the **Stack Triggers** table in the manifest:

1. Match the provided value against the manifest's `Value Pattern` (case-insensitive)
2. If a match is found AND the skill is NOT already in `.agent/skills/[installed-as]/`:
   - Copy the entire directory from `.agent/skill-library/[library-path]/` → `.agent/skills/[installed-as]/`
   - Fill any `{{PLACEHOLDER}}`s in the newly-copied `SKILL.md` with current template values
3. If the skill already exists in `.agent/skills/`, skip it (idempotent)

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

After provisioning, build a markdown list of all installed skills (both defaults and library-provisioned) and update `{{INSTALLED_SKILLS}}` in the tech stack instruction.

Also update `{{INSTALLED_SKILLS}}` in `AGENTS.md` and `GEMINI.md` with the same installed skills list. These root agent config files must reflect the full skill inventory so agents reading them have complete context.

Read `.agent/skills/prd-templates/references/operational-templates.md` for the **Installed Skills List** template. Use the template structure, filling in actual installed skill names and descriptions.

### 8.5. Compose and fill FRAMEWORK_PATTERNS

Identify any frontend-capable framework skill provisioned or matched during this invocation by checking across all relevant stack axes:

| Stack Axis | Example Skills |
|------------|---------------|
| `FRONTEND_FRAMEWORK` | `nextjs`, `astro-framework`, `sveltekit`, `nuxt`, `react-best-practices` |
| `MOBILE_FRAMEWORK` | `expo-react-native` |

If any of these axes resolved to a provisioned skill in Step 7, use that skill for composition.

**If a frontend-capable framework skill is present:**
1. Read the installed skill's `SKILL.md` from `.agent/skills/[installed-as]/SKILL.md`
2. Extract the component patterns section (file structure, naming conventions, composition patterns, what to avoid)
3. Compose a `FRAMEWORK_PATTERNS` markdown block summarising these component conventions
4. Fire `bootstrap-agents-fill` with `FRAMEWORK_PATTERNS=[composed value]` to fill the `## Components` section of `.agent/instructions/patterns.md`
5. If multiple frontend-capable skills are present (e.g., `FRONTEND_FRAMEWORK` + `MOBILE_FRAMEWORK`), merge their patterns into a single `FRAMEWORK_PATTERNS` block with clearly labelled sections per surface

This step is idempotent — it can be re-run on existing projects to fill `patterns.md` without re-provisioning the skill. For remediation flows, provide the relevant stack axis value(s) so this step resolves the correct skill(s).

**If no frontend-capable framework skill is present:** Skip — `patterns.md` already has a sensible fallback for non-visual projects.

---

## 9. Fill workflow skill placeholders

In the generic workflows, replace the following placeholders with the path to the installed skill's `SKILL.md`. If no skill was installed for a given category, instruct the agent to skip it or provide a reasonable default.

In `.agent/workflows/create-prd.md`:
- `{{DATABASE_SKILL}}` → `.agent/skills/[installed-as]/SKILL.md` (for `DATABASE`)
- `{{AUTH_SKILL}}` → `.agent/skills/[installed-as]/SKILL.md` (for `AUTH_PROVIDER`)

In `.agent/workflows/write-architecture-spec.md`:
- `{{DATABASE_SKILL}}` → `.agent/skills/[installed-as]/SKILL.md` (for `DATABASE`)

In `.agent/workflows/write-be-spec-classify.md`:
- `{{DATABASE_SKILL}}` → `.agent/skills/[installed-as]/SKILL.md` (for `DATABASE`)
- `{{AUTH_SKILL}}` → `.agent/skills/[installed-as]/SKILL.md` (for `AUTH_PROVIDER`)
- `{{BACKEND_FRAMEWORK_SKILL}}` → `.agent/skills/[installed-as]/SKILL.md` (for `BACKEND_FRAMEWORK` or `API_LAYER`)

In `.agent/workflows/write-fe-spec-classify.md`:
- `{{FRONTEND_FRAMEWORK_SKILL}}` → `.agent/skills/[installed-as]/SKILL.md` (for `FRONTEND_FRAMEWORK`)
- `{{FRONTEND_DESIGN_SKILL}}` → `.agent/skills/[installed-as]/SKILL.md` (for `CSS_FRAMEWORK` or `UI_LIBRARY`)
- `{{ACCESSIBILITY_SKILL}}` → `.agent/skills/[installed-as]/SKILL.md` (for `accessibility-compliance` surface skill)

---

## 9.5. Fill workflow command placeholders

Workflows use `{{COMMAND}}` placeholders for test, lint, build, and validation commands. Replace them with the values gathered during tech stack decisions (step 1).

In `.agent/workflows/implement-slice-tdd.md`:
- `{{TEST_COMMAND}}` → the project's test runner command
- `{{VALIDATION_COMMAND}}` → the full validation pipeline command

In `.agent/workflows/validate-phase.md`:
- `{{TEST_COMMAND}}` → the project's test runner command
- `{{TEST_COVERAGE_COMMAND}}` → the test runner with coverage enabled
- `{{LINT_COMMAND}}` → the linter command
- `{{TYPE_CHECK_COMMAND}}` → the type checker command
- `{{BUILD_COMMAND}}` → the production build command

In `.agent/workflows/evolve-contract.md`:
- `{{TEST_COMMAND}}` → the project's test runner command
- `{{VALIDATION_COMMAND}}` → the full validation pipeline command


---

## 10. Report results

Return to the calling workflow a summary:

- Which `{{PLACEHOLDER}}`s were filled (and their values)
- Which `{{PLACEHOLDER}}`s remain unfilled
- Which skills were provisioned from the library (if any)
- Which skills were already installed and skipped
- Any errors (missing files, missing library paths)
