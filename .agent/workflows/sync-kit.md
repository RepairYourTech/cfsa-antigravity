---
description: Sync improvements from the upstream starter kit into this project's .agent folder — semantic merge preserving project-specific values
skills: [technical-writer]
---

# Sync Kit

Pull improvements from the upstream [cfsa-antigravity](https://github.com/RepairYourTech/cfsa-antigravity) kit into this project. The sync covers the **entire upstream repo** — `.agent/` directory, root-level files (`AGENTS.md`, `GEMINI.md`), and `docs/` (including `kit-architecture.md` and pipeline guide).

**The problem:** The kit was born from this project, but has since evolved past it. The kit uses `{{PLACEHOLDER}}` markers; this project has real values. A blind copy would destroy project-specific content. This workflow does a semantic merge — apply the kit's *intent* while preserving project values.

**Input:** Upstream kit repo (default: `RepairYourTech/cfsa-antigravity`, branch `main`)
**Output:** Updated project with kit improvements merged, sync state recorded

---

## 0. Read sync state

Read `.agent/kit-sync.md` in the project root.

- **File exists** → extract `last_synced_commit`, `upstream`, and `kit_version` values. Proceed to Step 1.
- **File missing** → **HARD STOP**: "No sync tracking file found. This file is auto-generated during kit installation. To fix: run `npx cfsa-antigravity init --force` to reinstall the kit with sync tracking, or manually create `.agent/kit-sync.md` with the upstream URL and the commit hash of your last known kit version."

---

## 1. Fetch upstream and identify changes

// turbo

### 1a. Clone or fetch the upstream repo

To compare against the upstream, you MUST fetch the actual upstream repository. Use one of these approaches:

1. **Preferred — shallow clone to /tmp** (fastest):
   ```bash
   git clone --depth=50 <upstream_url> /tmp/cfsa-upstream
   cd /tmp/cfsa-upstream
   ```
2. **Alternative — GitHub MCP**: Use `list_commits` and `get_file_contents` from the `github-mcp-server` to compare files.

### 1b. Diff from last synced commit

Using the cloned repo (or GitHub API), get the list of changed files since the last sync:

```bash
git log <last_synced_commit>..HEAD --name-only --pretty=format:""
```

If the command returns no files (or the API shows no commits after `last_synced_commit`): report "No changes since last sync (commit `<hash>`, version `<kit_version>`)" and skip to Step 8.5.

Work only with the changed files in Steps 2–7.

---

## 2. Classify each changed file

| Classification | Action | Example |
|---------------|--------|---------|
| **NET-NEW in kit** | Copy directly (Step 4) | New workflow, new skill directory |
| **PROJECT-ONLY** | Leave alone — project-specific | `skills/surrealdb-expert/`, project workflows |
| **BOTH EXIST — kit has `{{PLACEHOLDER}}`** | Semantic merge (Step 3) | `AGENTS.md`, `instructions/workflow.md` |
| **BOTH EXIST — kit content changed** | Overwrite with upstream | Workflows with no project values |
| **BOTH EXIST — identical** | Skip | — |

**Key distinction for "BOTH EXIST":** If the project file has **no project-specific values** (just boilerplate), overwrite directly. If it has filled `{{PLACEHOLDER}}` values, semantic merge.

---

## 3. Semantic merge (files with project-specific values)

For each file classified as "BOTH EXIST — kit has `{{PLACEHOLDER}}`":

Read .agent/skills/technical-writer/SKILL.md and follow its methodology.

### 3a. Read both versions side by side

### 3b. Identify change regions
- **Template regions** — lines with `{{PLACEHOLDER}}` in kit → project has real values. **PRESERVE project values.**
- **Kit content regions** — pure boilerplate (no placeholders) that changed upstream. **APPLY kit changes.**

### 3c. Apply changes surgically
For each changed kit content region:
1. Find the corresponding region in the project file
2. Replace old boilerplate with new kit boilerplate
3. **DO NOT touch any line with project-specific content**

### 3d. Handle structural changes
If the kit restructured content *around* a placeholder (e.g., rewrote the sentence containing `{{VALIDATION_COMMAND}}`):
1. Take the kit's new structure
2. Re-insert the project's specific value into the new structure
3. Verify the result reads correctly

---

## 4. Copy net-new files

// turbo

For files that only exist in the kit, copy them into the **corresponding location** in the project:
- Root files → project root
- `.agent/workflows/` → project `.agent/workflows/`
- `.agent/skills/<name>/` → copy entire skill directory (SKILL.md + references/, resources/, scripts/)
- `docs/` → project `docs/`

Only copy files identified as net-new in Step 1. Do not overwrite existing files.

---

## 4.5. Ideation structure migration

The kit's ideation output changed from a monolithic file to a sharded folder. Projects built on the old kit need migration.

### 4.5a. Detect old pattern

Check the project for these indicators:

| Indicator | Meaning |
|---|---|
| `docs/plans/ideation.md` exists | Old monolithic ideation file |
| `docs/plans/vision.md` exists AND is referenced as pipeline input in workflows | Old vision-as-source pattern |
| `docs/plans/ideation/` folder missing | Ideation scaffold not created |
| `docs/plans/ideation/ideation-index.md` missing | Pipeline key file not created |

If **none** of these indicators match → skip to Step 5.

### 4.5b. Scaffold the ideation folder

If `docs/plans/ideation/` doesn't exist, create the scaffold:

```
docs/plans/ideation/
├── .gitkeep
└── README.md          ← copy from upstream
```

### 4.5c. Flag for re-ideation

If a monolithic `docs/plans/ideation.md` or `docs/plans/vision.md` (used as pipeline source) exists:

1. **DO NOT delete or modify** the old file
2. Report to the user:
   > "Your project uses the old monolithic ideation format. The new kit uses a sharded `ideation/` folder with `ideation-index.md` as the pipeline key file.
   >
   > **To migrate:** Run `/ideate @docs/plans/ideation.md` (or `@docs/plans/vision.md`). The extract step will treat your old file as a rich document input, parse it into the new folder structure, and preserve all existing detail.
   >
   > **After migration:** Run downstream workflows (`/create-prd`, etc.) to propagate the new ideation depth into your specs."
3. **DO NOT attempt automatic migration** — the old file's structure is unknown and the user should review the re-ideation output

---

## 5. Audit project-specific files for integration gaps

Project-specific files were written **before** the kit's latest improvements. Check for missing integration points with new kit content.

### 5a. Scan each project-only file

| Question | Example |
|----------|---------|
| Does this file enforce rules that now have nuance? | Rule file bans placeholders — does it know about `// BOUNDARY:` stubs? |
| Does this file describe processes that could use new skills? | Setup workflow → could `parallel-agents` parallelize verification? |
| Does this file reference concepts the kit renamed or evolved? | Old terminology → now uses different naming |
| Does this file reference `vision.md` as a pipeline data source? | `vision.md` is now human-readable only — pipeline reads `ideation-index.md` |
| Does this file's domain intersect new kit content? | Security rule → should it reference new kit security skills? |

### 5b. Apply integration updates
- Add cross-references to new rules/skills where relevant
- Update terminology to match kit evolution
- **DO NOT change project-specific values or domain logic** — only add integration surface

---

## 6. Update reference files

Root files serve dual roles: they contain both **kit boilerplate** (pipeline table, rule tables) and **project-specific values** (project name, tech stack, validation command). After Steps 3–4, verify these reference files reflect the merged state:

- **GEMINI.md** — pipeline workflow table, rule table, note about utility commands
- **AGENTS.md** — pipeline workflow table, rule table, note about utility commands
- **Any index files** that enumerate available skills, rules, or workflows

Every new rule, skill, and workflow from this sync must appear in the tables.

---

## 7. Validate

// turbo

Run the project's configured validation command (see `.agent/instructions/commands.md`).

If the validation command is not yet configured (unfilled `{{VALIDATION_COMMAND}}` placeholder): skip validation and flag it for remediation in Step 8.5.

---

## 8. Review diff

Review the complete diff of changes made. Verify:
- No `{{PLACEHOLDER}}` markers leaked into the project
- No project-specific values were overwritten
- All net-new files are present
- All cross-references are valid
- Project-specific files have integration points with new kit content (Step 5)

---

## 8.5. Scan for remaining unfilled placeholders

Scan these files for any literal `{{` characters:

1. `AGENTS.md`
2. `GEMINI.md`
3. `.agent/instructions/workflow.md`
4. `.agent/instructions/commands.md`
5. `.agent/instructions/structure.md`
6. `.agent/instructions/patterns.md`
7. `.agent/instructions/tech-stack.md`

**If unfilled patterns found** — check the current pipeline phase before recommending remediation:

1. **Detect phase**: Check filesystem markers per `GEMINI.md` → Pipeline Phase Detection table.
2. **If phase is Pre-PRD** (no `architecture-design.md` exists) → report:
   > "Placeholders remain unfilled — this is **expected** at the current pipeline phase (`<detected_phase>`). They will be filled when `/create-prd` → `/bootstrap-agents-fill` runs after ideation completes."
3. **If phase is Post-PRD** (`architecture-design.md` exists) → show remediation table:

| File(s) | Remediation |
|---------|-------------|
| `structure.md` | Run `/create-prd-compile` Step 9.5 |
| `patterns.md` | Run `/bootstrap-agents-provision` |
| `AGENTS.md`, `GEMINI.md`, or others | Run `/bootstrap-agents-fill` |

**If none found** — confirm "All instruction files fully configured."

---

## 9. Update sync state

Read the upstream repository's `package.json` file and extract the `"version"` field — this is a **semver string** like `"2.10.0"`. Do NOT use the branch name (e.g., `main`), tag prefix, or any other identifier. The value must match the pattern `X.Y.Z`.

**Validation gate**: Before writing, verify the extracted version matches `/^\d+\.\d+\.\d+$/`. If it doesn't (e.g., it's `main`, `latest`, or empty) → **STOP**: "Could not extract a valid semver version from the upstream package.json. Found: `[value]`. Check that the upstream URL is correct and the package.json has a valid `version` field."

Write or update `.agent/kit-sync.md`:

```markdown
# Kit Sync State

upstream: https://github.com/RepairYourTech/cfsa-antigravity
last_synced_commit: <current upstream HEAD commit hash — full 40-char SHA>
last_synced_at: <ISO 8601 timestamp, e.g. 2026-03-17T16:04:40Z>
kit_version: <semver from upstream package.json "version" field, e.g. 2.10.0>
```

This file is committed to the project repo — it records which kit version the project is on and serves as the baseline for the next sync.

---

## Quick Reference

| File Type | Content Action | Integration Action |
|-----------|---------------|-------------------|
| **Net-new from kit** | Copy directly | N/A |
| **Both exist — no project values** | Overwrite with upstream | N/A |
| **Both exist — has project values** | Semantic merge (Step 3) | N/A |
| **Project-only** | **DO NOT overwrite** | **DO audit for integration gaps** (Step 5) |