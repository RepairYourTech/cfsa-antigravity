---
description: Skill library provisioning using 4-tier resolution chain and map cell filling for the bootstrap-agents workflow
parent: bootstrap-agents
shard: provision
standalone: true
position: 2
pipeline:
  position: infrastructure
  stage: provisioning
  predecessors: [bootstrap-agents-fill]
  successors: []
  skills: [prd-templates, find-skills]
  calls-bootstrap: false
---

// turbo-all

# Bootstrap Agents — Provision Skills

Read the surface stack map, resolve each skill using the 4-tier chain, provision from the library, and report results.

**Prerequisite**: The surface stack map in `.agent/instructions/tech-stack.md` must have at least one row with filled cells (from a previous `/bootstrap-agents-fill` run).

---

## 6. Read skill library manifest

Read `.agent/skill-library/MANIFEST.md` to load the trigger tables.

If `.agent/skill-library/MANIFEST.md` does not exist (e.g., user deleted it or is using a minimal kit), use only Tier 2-4 resolution (no manifest matching).

---

## 7. Provision skills — 4-Tier Resolution Chain

Read the surface stack map from `.agent/instructions/tech-stack.md`. For **every skill name** referenced in any cell of both the Per-Surface Skills table and Cross-Cutting Skills table, resolve it:

### Tier 1: Exact Match

Check `.agent/skills/{name}/` (already installed) and `.agent/skill-library/{name}/`:

- **Already installed** → skip (idempotent) ✅
- **Found in library** → copy directory to `.agent/skills/{name}/`, fill any `{{PLACEHOLDER}}`s in the copied SKILL.md ✅
- **Not found** → check manifest `Value Pattern` matches (glob-style, case-insensitive) → if matched, install the mapped skill → update the map cell to use the installed directory name ✅
- **Still not found** → proceed to Tier 2

### Tier 2: Partial Match + Adequacy Check

Search `.agent/skills/` and `.agent/skill-library/` for skills whose name contains the base term (e.g., for `surrealdb-embedded`, check `surrealdb`):

1. **Partial match found** → read its `SKILL.md`
2. **Assess adequacy**: Does the skill cover the needed variant? Check for:
   - Keywords matching the variant (e.g., "embedded", "WASM", "Rust-native")
   - Sections addressing the use case
   - Examples relevant to the variant
3. **Adequate** → use the existing skill. Report: `"{name}" resolved by existing "{partial}" skill (covers {variant})` ✅
4. **Falls short** → the skill doesn't address the variant. Proceed to Tier 3.

### Tier 3: External Discovery

Read `.agent/skills/find-skills/SKILL.md` and invoke its methodology:

1. Search for the skill externally
2. **Found** → install → fill map cell with resolved name ✅
3. **Not found** → proceed to Tier 4

### Tier 4: Human Escalation

Mark the map cell with `⚠️ {name} [not found]`. Add to the report:

> Skill `{name}` was not found in the skill library, via partial match, or externally.
> Options:
> 1. Create it with `/skill-creator`
> 2. Provide an alternative skill name
> 3. Mark as not needed (change cell to `—`)

---

## 8. Update installed skills list

After provisioning, build a markdown list of all installed skills and update `{{INSTALLED_SKILLS}}` in:
- `.agent/instructions/tech-stack.md`
- `AGENTS.md`
- `GEMINI.md`

Read `.agent/skills/prd-templates/references/operational-templates.md` for the **Installed Skills List** template. Organize skills by:

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

## 8.5. Compose and fill FRAMEWORK_PATTERNS

Identify any frontend-capable framework skill provisioned during this invocation:

| Stack Axis | Example Skills |
|------------|---------------|
| FE Frameworks | `nextjs`, `astro-framework`, `sveltekit`, `nuxt`, `react-best-practices` |
| BE Frameworks (with desktop UI) | `tauri` |

Check the map's FE Frameworks and BE Frameworks columns across ALL surfaces. If any resolved to a skill with component patterns:

1. Read the installed skill's `SKILL.md`
2. Extract component patterns (file structure, naming, composition, what to avoid)
3. Compose a `FRAMEWORK_PATTERNS` markdown block
4. Fire `bootstrap-agents-fill` with `FRAMEWORK_PATTERNS=[composed value]`
5. If multiple frontend-capable skills across surfaces → merge with labelled sections per surface

---

## 9. CONTRACT_LIBRARY resolution

This step fires when ANY Languages cell is confirmed.

For each unique language across all surfaces, derive `CONTRACT_LIBRARY`:

| Language | Contract Library |
|---|---|
| TypeScript / JavaScript | Zod |
| Python | Pydantic |
| Go | ozzo-validation |
| Rust | Serde |
| Java | Jakarta Bean Validation |
| Kotlin | kotlinx.serialization |
| C / C++ | (prompt user) |
| Bash / Shell | (none) |

For languages **not in this table**: prompt the user.

> **Multi-language**: If the project uses multiple languages (e.g., TypeScript + Rust), set `CONTRACT_LIBRARY` to a comma-separated list: `zod, serde`. Update `tdd-contract-first.md` to reference the appropriate library based on the file's language.

Fire `bootstrap-agents-fill` with `CONTRACT_LIBRARY=[value]` to fill `tdd-contract-first.md`.

---

## 10. Report results

Return to the calling workflow:

- **Map cells filled** — which surface/column combinations were resolved
- **Skills provisioned** — installed from library (Tier 1)
- **Skills resolved by adequacy** — existing skill covers variant (Tier 2), with justification
- **Skills discovered externally** — found via find-skills (Tier 3)
- **⚠️ Cells requiring attention** — skills not found (Tier 4)
- **Skills skipped** — already installed
- **Contract library** — resolved value(s)
- **Framework patterns** — composed and filled (if applicable)
- **Errors** — missing files, missing library paths
