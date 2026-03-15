# cfsa-antigravity

## 2.0.0

### Major Changes

- 275705f: Rewrote all externally-sourced skills with original content and deduplicated skill library

  **Tier 1 — Community/External Skill Rewrites:**

  - Rewrote 7 skills from scratch: `concise-planning`, `workflow-automation`, `clean-code`, `verification-before-completion`, `brainstorming`, `prompt-engineer`, `skill-creator`
  - Removed Apache 2.0 LICENSE file from `skill-creator`
  - Deleted 8 associated old reference/script/README files
  - All rewritten skills marked `source: self`

  **Tier 2 — Quality Fixes:**

  - Enriched `api-design-principles` (38→165 lines) from stub to substantive skill
  - Rewrote `minimalist-surgical-development` (70→125 lines), removed non-existent Serena MCP references
  - Deleted redundant `rest-api-design` skill (479 lines, covered by `api-design-principles`)

  **Tier 3 — Skill Library Deduplication:**

  - Removed 7 library entries that duplicated installed skills: `git-advanced`, `regex-patterns`, `brand-guidelines`, `godot` (engines copy), `logging-best-practices`, `rest-api-design`, `api-versioning`
  - Removed empty `stack/engines/` directory
  - Updated MANIFEST.md: fixed paths, removed non-existent entries, added pre-installed notations

  **Net impact:** -5,541 lines, zero external licenses remaining

### Minor Changes

- Add Husky pre-commit hooks with full template integrity checking, commitlint for conventional commits, reduce near-limit workflows via content extraction, and fix pipeline audit findings.

  ### Pre-commit hooks

  - Template rebuild + 4-component drift check (GEMINI.md, AGENTS.md, .agent/, docs/) on every commit
  - Workflow character limit enforcement (12k max)
  - Conventional commit message validation via commitlint

  ### Near-limit workflow reductions

  - Extracted design system prerequisite check to shared reference
  - Extracted spec coverage sweep procedure to shared reference
  - Extracted placeholder→workflow mapping table to shared reference
  - Extracted parallel synthesis protocol to session-continuity protocols
  - Compressed verbose prose in write-architecture-spec-design and audit-ambiguity-execute
  - Total: ~10k chars freed across 6 workflows

  ### Pipeline audit fixes

  - Fixed dead rule reference (depth-standards → specificity-standards)
  - Removed dead skill from validate-phase frontmatter
  - Added missing accessibility skill to write-architecture-spec-design
  - Removed orphan requires_placeholders from plan-phase orchestrator
  - Sharded plan-phase into plan-phase-preflight and plan-phase-write
