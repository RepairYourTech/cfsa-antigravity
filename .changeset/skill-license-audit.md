---
"cfsa-antigravity": major
---

Rewrote all externally-sourced skills with original content and deduplicated skill library

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
