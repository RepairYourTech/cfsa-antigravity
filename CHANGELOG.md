# cfsa-antigravity

## 2.4.0

### Minor Changes

- Auto-populate sync tracking on kit installation — eliminates full-audit first sync

  - `build-template.sh` now generates `template/.agent/kit-sync.md` at build time with the current git HEAD commit hash, package version, and timestamp
  - Every `npx cfsa-antigravity init` now auto-populates `.agent/kit-sync.md` — no manual tracking file creation needed
  - `/sync-kit` workflow simplified: removed the full-diff first-sync path (Step 1b); every sync is now incremental from the install point
  - `/sync-kit` now hard-stops if `kit-sync.md` is missing instead of falling back to a full audit
  - `/sync-kit` now includes explicit upstream fetch instructions (shallow clone or GitHub MCP) so agents know HOW to access the upstream
  - `check-template-integrity.sh` excludes `kit-sync.md` from drift detection (build-generated, intentionally different from source)

## 2.3.2

### Patch Changes

- Fix sync-kit workflow: add explicit upstream clone mechanism

  The `/sync-kit` workflow told agents to "run git log on the upstream" without providing any mechanism to access the upstream repo. Agents sitting in the project workspace had no way to compare files — upstream commit hashes don't exist in the project's git history, causing silent failures where the sync reports "no changes."

  - Added Step 0.5 "Fetch the upstream repo" with explicit `git clone` to `/tmp/cfsa-upstream-sync`
  - Added CAUTION block warning agents they are in the PROJECT repo, not the upstream
  - Rewrote Step 1a with exact bash command scoped to the clone directory
  - Added IMPORTANT fallback for rebased commit hashes
  - Updated Steps 1b, 3a, 4, and 9 to reference the clone directory as the upstream source

## 2.3.1

### Patch Changes

- Enforce sequential IA → BE → FE spec pipeline — prevent agents from skipping spec layers

  - Added FORBIDDEN next-step gates to `write-architecture-spec-deepen.md` preventing agents from proposing `/plan-phase` or `/implement-slice` after IA completion
  - Added explicit "all project types need BE/FE specs" language (CLI, bash, API-only) to close the reasoning loophole where agents skip layers for non-web projects
  - Added next-step enforcement to `write-be-spec-write.md` directing to `/write-fe-spec` (not `/plan-phase`)
  - Added explicit permitted next-step options to `write-fe-spec-write.md` clarifying `/plan-phase` is only valid from this final spec workflow
  - Added post-completion CAUTION block to `write-architecture-spec.md` parent orchestrator

## 2.3.0

### Minor Changes

- Enforce all pipeline workflow gates and harden ideation scaffold

  **Pipeline Enforcement Audit** — 52 workflow files audited across 4 tiers.

  ### Enforcement Fixes (7 files)

  - Add prerequisite gate to `ideate.md` (overwrite protection)
  - Harden `ideate-discover.md` prerequisite to explicit STOP
  - Apply BLOCKING GATE pattern to quality gates in `write-architecture-spec.md`, `write-be-spec.md`, `write-fe-spec.md`, `implement-slice.md`, `write-be-spec-write.md`, `validate-phase.md`
  - Add prerequisite verification to `plan-phase.md`

  ### Ideation Scaffold (4 files)

  - Remove pre-shipped subdirectories (`domains/`, `meta/`, `cross-cuts/`) from kit scaffold — `/ideate` creates these based on structural classification
  - Fix `ideate-extract.md` Step 1.5: `ADDITIVE ONLY` instruction, kit files in tree diagram as `KIT-SHIPPED — do not touch`, post-seeding verification gate with STOP
  - Update `sync-kit.md` scaffold reference to match
  - Add Node Classification Gate and Structural Classification Protocol to `idea-extraction` skill

## 2.2.2

### Patch Changes

- ### Bug Fixes

  - **Fix missing directories in npm package**: Added `.gitkeep` files to 5 empty directories that npm was stripping during packaging, causing them to be absent when running `npx cfsa-antigravity init`:
    - `.agent/progress/` — session progress tracking
    - `.agent/progress/memory/` — cross-session pattern memory
    - `.agent/progress/sessions/` — session close logs
    - `.agent/skills/skill-creator/references/` — skill reference scaffolding
    - `.agent/skills/skill-creator/scripts/` — skill script scaffolding
  - **Full kit audit**: Verified all 296 source directories match template, zero empty directories remain, all 16 `.gitkeep` files confirmed in `npm pack` output (434 total files)

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
