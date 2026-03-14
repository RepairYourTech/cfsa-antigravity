---
description: Sync improvements from the upstream starter kit into this project's .agent folder — semantic merge preserving project-specific values
---

# Sync Kit

Pull improvements from the upstream [cfsa-antigravity](https://github.com/RepairYourTech/cfsa-antigravity) kit into this project. The sync covers the **entire upstream repo** — `.agent/` directory, root-level files (`AGENTS.md`, `GEMINI.md`), and `docs/` (including `kit-architecture.md` and pipeline guide).

**The problem:** The kit was born from this project, but has since evolved past it. The kit uses `{{PLACEHOLDER}}` markers; this project has real values. A blind copy would destroy project-specific content. This workflow does a semantic merge — apply the kit's *intent* while preserving project values.

**Input:** Upstream kit repo (default: `RepairYourTech/cfsa-antigravity`, branch `main`)
**Output:** Updated project with kit improvements merged, sync state recorded

---

## 0. Read sync state

Read `.agent/kit-sync.md` in the project root.

- **File exists** → extract `last_synced_commit` and `upstream` values. Use **incremental mode** (Step 1a).
- **File missing** → this is a **first sync**. Use **full diff mode** (Step 1b). The tracking file will be created in Step 9.

---

## 1. Identify what changed

// turbo

### 1a. Incremental sync (commit-scoped)

Run `git log <last_synced_commit>..HEAD --name-only` on the upstream to get only the changed files. Work only with those files in Steps 2–7.

If the command returns no files: report "No changes since last sync (commit `<hash>`)" and skip to Step 8.5.

### 1b. First sync (full comparison)

Compare the **entire upstream repo** against the project. Scan at minimum:

| Upstream Path | What to Compare |
|--------------|-----------------|
| Root files | `AGENTS.md`, `GEMINI.md` |
| `.agent/instructions/` | All 5 markdown files |
| `.agent/rules/` | All 9 markdown files |
| `.agent/workflows/` | All workflow files |
| `.agent/skills/` | All skill directories (SKILL.md + sub-files) |
| `.agent/skill-library/` | MANIFEST.md, README.md, subdirectories |
| `.agent/progress/` | Directory structure |
| `docs/` | README.md, kit-architecture.md, audits/, plans/ scaffolding |

Compare using SHA hashes or byte-level diff. Classify each file per Step 2.

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

## 5. Audit project-specific files for integration gaps

Project-specific files were written **before** the kit's latest improvements. Check for missing integration points with new kit content.

### 5a. Scan each project-only file

| Question | Example |
|----------|---------|
| Does this file enforce rules that now have nuance? | Rule file bans placeholders — does it know about `// BOUNDARY:` stubs? |
| Does this file describe processes that could use new skills? | Setup workflow → could `parallel-agents` parallelize verification? |
| Does this file reference concepts the kit renamed or evolved? | Old terminology → now uses different naming |
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

**If unfilled patterns found** — list each with remediation:

| File(s) | Remediation |
|---------|-------------|
| `structure.md` | Run `/create-prd-compile` Step 9.5 |
| `patterns.md` | Run `/bootstrap-agents-provision` |
| `AGENTS.md`, `GEMINI.md`, or others | Run `/bootstrap-agents-fill` |

**If none found** — confirm "All instruction files fully configured."

---

## 9. Update sync state

Write or update `.agent/kit-sync.md`:

```markdown
# Kit Sync State

upstream: https://github.com/RepairYourTech/cfsa-antigravity
last_synced_commit: <current HEAD commit hash>
last_synced_at: <ISO 8601 timestamp>
kit_version: main
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