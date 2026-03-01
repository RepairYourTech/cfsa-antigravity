---
description: Sync improvements from the upstream starter kit into this project's .agent folder — semantic merge preserving project-specific values
---

# Sync Kit

Pull improvements from the upstream spec-pipeline-starter kit into this project's `.agent/` folder.

**The problem:** The kit was born from this project, but has since evolved past it. The kit uses `{{PLACEHOLDER}}` markers; this project has real values. A blind copy would destroy project-specific content. This workflow does a semantic merge — apply the kit's *intent* while preserving project values.

**Input:** Path to the upstream kit (default: `https://github.com/RepairYourTech/Anti-MVP-Vibe-Pipeline`)
**Output:** Updated `.agent/` folder with kit improvements merged

---

## 1. Identify what changed

// turbo
Compare the kit against the project's `.agent/` folder:

Compare the kit directory against the project's `.agent/` folder using your file comparison tools. Identify:
- **Files only in the kit** (net-new)
- **Files only in the project** (project-specific, don't touch)
- **Files that exist in both but differ**

## 2. Classify each changed file

For every file that changed, classify it:

| Classification | Action | Example |
|---------------|--------|---------|
| **NET-NEW in kit** | Copy directly into project | `rules/boundary-not-placeholder.md`, `skills/parallel-agents/` |
| **PROJECT-ONLY** | Leave alone — project-specific | `rules/child-safety.md`, `workflows/setup-session.md` |
| **BOTH EXIST — kit has {{PLACEHOLDER}}** | Semantic merge (step 3) | `instructions/workflow.md`, `AGENTS.md` |
| **BOTH EXIST — identical** | Skip | — |

## 3. Semantic merge (for files that exist in both)

For each file classified as "BOTH EXIST — kit has {{PLACEHOLDER}}":

### 3a. Read both versions

Read the kit version and the project version side by side.

### 3b. Identify change regions

Compare the two files and identify:
- **Template regions** — lines containing `{{PLACEHOLDER}}` in the kit → these have project-specific values in the project file. **PRESERVE the project values.**
- **Kit content regions** — lines that are pure boilerplate (no placeholders) → these may have been updated in the kit. **APPLY kit changes.**

### 3c. Apply changes surgically

For each changed kit content region:
1. Find the corresponding region in the project file
2. Replace the project's old boilerplate with the kit's new boilerplate
3. **DO NOT touch any line that has project-specific content** (values that replaced `{{PLACEHOLDER}}`)

### 3d. Handle structural changes

If the kit restructured content *around* a placeholder (e.g., rewrote the sentence containing `{{VALIDATION_COMMAND}}`):
1. Take the kit's new structure
2. Re-insert the project's specific value into the new structure
3. Verify the result reads correctly

## 4. Copy net-new files

// turbo
For files that only exist in the kit (not already in this project), copy them directly:

Copy each net-new file from the kit into the corresponding location in your project's `.agent/` folder. Adapt the specific files based on what Step 1 revealed as net-new.

Only copy files identified as net-new in step 1. Do not overwrite existing files.

## 5. Audit project-specific files for integration gaps

Project-specific files (ones that only exist in the project, not the kit) were written **before** the kit's latest improvements. They must NOT be blindly preserved — they need to be checked for missing integration points with new kit content.

### 5a. Build the integration inventory

Read `.agent/skills/prd-templates/references/operational-templates.md` for the **Sync Integration Inventory** template. Use the template to build the inventory of everything the kit added or changed.

### 5b. Scan each project-specific file

For every project-only file, ask these questions:

| Question | Example |
|----------|---------|
| **Does this file enforce rules that now have nuance?** | `child-safety.md` bans placeholders — does it know about `// BOUNDARY:` stubs? |
| **Does this file describe processes that could use new skills?** | `setup-session.md` sets up infra — could `parallel-agents` parallelize verification steps? |
| **Does this file reference concepts the kit has renamed or evolved?** | Old "TODO ban" language → now "boundary-not-placeholder" |
| **Does this file's domain intersect with new kit content?** | `security-audit.md` → should it reference the `security-auditor` role in `parallel-agents`? |
| **Would this file benefit from cross-references to new content?** | `deploy.md` → should it know about the synthesis protocol for multi-agent deploys? |

### 5c. Apply integration updates

For each gap found:
1. Add cross-references to new rules/skills where relevant
2. Update terminology to match kit evolution (e.g., "TODO" → "BOUNDARY stub" where appropriate)
3. Add new sections if the file's domain now intersects with new kit capabilities
4. **DO NOT change project-specific values or domain logic** — only add integration surface

### 5d. What NOT to change in project-specific files

- Project-specific domain content (child safety requirements, VPS configurations, deploy targets)
- Project-specific values (paths, URLs, credentials references, team names)
- The file's core purpose or structure

**The goal is additive integration, not rewriting.** You're connecting existing project files to new kit capabilities, not changing what those files do.

## 6. Update reference files

Update any central reference files that list rules, skills, or workflows:

- **GEMINI.md** — rule table, skill list, workflow list, decision tree
- **AGENTS.md** — rule table (if project has its own)
- Any index files that enumerate available skills or rules

These must reflect the merged state — every new rule, skill, and workflow should be listed.

## 7. Validate

// turbo
Run the project's full validation suite:

Run `{{VALIDATION_COMMAND}}` (see `.agent/instructions/commands.md` for the configured validation command).

## 8. Review diff

Before committing, review the complete diff:

Review the complete diff of changes made.

Verify:
- No `{{PLACEHOLDER}}` markers leaked into the project
- No project-specific values were overwritten
- All new files are present
- All cross-references are valid
- Project-specific files have integration points with new kit content (step 5)

## 8.5. Scan for remaining unfilled placeholders

After the diff review, all instruction files should be scanned for any `{{` patterns that survived the semantic merge. Step 3b cannot distinguish a filled value from an unfilled placeholder, so unfilled templates may have slipped through.

Scan these 7 files for any literal `{{` characters:

1. `AGENTS.md`
2. `GEMINI.md`
3. `.agent/instructions/workflow.md`
4. `.agent/instructions/commands.md`
5. `.agent/instructions/structure.md`
6. `.agent/instructions/patterns.md`
7. `.agent/instructions/tech-stack.md`

**If unfilled patterns are found**: List each one with file and placeholder name, and provide remediation commands:

| File(s) with unfilled placeholders | Remediation |
|------------------------------------|-------------|
| `structure.md` | Run `/create-prd-compile` Step 9.5 to generate and lock the directory structure |
| `patterns.md` | Run `/bootstrap-agents-provision` with the confirmed frontend-capable framework value (`FRONTEND_FRAMEWORK`, `MOBILE_FRAMEWORK`, etc.) |
| `AGENTS.md`, `GEMINI.md`, or other files | Run `/bootstrap-agents-fill` with confirmed stack values |

**If no unfilled placeholders**: Confirm "All instruction files are fully configured — no unfilled placeholders remain."

## Important: File handling summary

| File Type | Content Action | Integration Action |
|-----------|---------------|-------------------|
| **Net-new from kit** | Copy directly | N/A |
| **Both exist** | Semantic merge (step 3) | N/A |
| **Project-only** | **DO NOT overwrite** | **DO audit for integration gaps** (step 5) |