# cfsa-antigravity

## 2.2.0

### Minor Changes

- ### Production readiness enforcement

  - **Performance budget enforcement**: Rewrote `validate-phase` Step 7 as two-tiered — mandatory budget verification (7a) blocks on `Fail`-classified thresholds from `ENGINEERING-STANDARDS.md`, optional deep audit (7b) via `performance-optimization` skill
  - **Dependency supply chain audit**: Added `validate-phase` Step 8.5 with cross-language package manager audit table (npm, pnpm, yarn, pip, cargo, go, bundler, composer) — blocks on HIGH/CRITICAL vulnerabilities
  - **Deployment strategy verification**: Added interview question to `create-prd-architecture` for rolling/blue-green/canary strategy selection; added `validate-phase` Step 5.6.5 to enforce architecture-documented strategy compliance
  - **DB query optimization check**: Added `implement-slice-tdd` Step 5.5 for N+1 detection, index coverage verification, and EXPLAIN ANALYZE on critical queries
  - **API documentation sync**: Added `validate-phase` Step 5.9 — verifies OpenAPI spec exists and matches implemented contracts, runs OpenAPI linter if configured
  - **Resource cleanup verification**: Added Resource Cleanup Gate to `slice-completion-gates.md` (DB connections, event listeners, timers, file handles, connection pools); added `implement-slice-tdd` Step 5.6 enforcement
  - **Surface-conditional DAST**: Added `Security testing tool` and `Dependency audit enforcement` fields to `engineering-standards-template.md`; integrated conditional DAST scan into `validate-phase` Step 8

  ### Validate-phase sharding

  - **Sharded `validate-phase.md`** (15,343 bytes → 3 files under 12K limit):
    - `validate-phase.md` — parent orchestrator (2,249 bytes)
    - `validate-phase-quality.md` — Steps 0–5.8: tests, coverage, mutation testing, lint, type-check, build, CI/CD, staging deploy, deployment strategy, migrations, spec coverage (6,857 bytes)
    - `validate-phase-readiness.md` — Steps 5.9–10: API doc sync, accessibility, performance budgets, security/DAST, dependency audit, reporting (9,508 bytes)

  ### Kit architecture sync

  - Fixed `kit-architecture.md`: reference count 23→25, added `validate-phase.md` as parent orchestrator example, documented Resource Cleanup Gate
  - Updated `GEMINI.md` pipeline table: added `validate-phase-quality` and `validate-phase-readiness` shard rows
  - Updated `AGENTS.md` pipeline table: added missing `plan-phase` shard rows, added `validate-phase` shard rows, fixed hardcoded `Zod` → `{{CONTRACT_LIBRARY}}`

## 2.1.0

### Minor Changes

- ### Workflow perfection audit

  - **Shared references extracted**: Created `skill-loading-protocol.md`, `tdd-testing-policy.md`, and `slice-completion-gates.md` in `prd-templates/references/` — eliminates 25 instances of duplicated content across 15 workflows
  - **All 49 workflows verified**: Zero over 12k character limit, zero verbose skill loading patterns, zero TODO markers, zero redundant boilerplate
  - **`implement-slice-tdd.md` reduced 45%**: From 13,399 → 7,343 chars by extracting inlined policies into shared references
  - **`kit-architecture.md` accuracy audit**: Fixed 8 inaccuracies including missing `skill-library/` in directory tree, wrong placeholder gate workflows, hardcoded "Zod" → `{{CONTRACT_LIBRARY}}`, wrong instruction file count; added Shared References and Skill Loading Protocol sections
  - **Skill and rule quality improvements**: Deduplicated verbose loading instructions, compressed boilerplate, standardized cross-references

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
