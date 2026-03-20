# cfsa-antigravity

## 2.13.3

### Patch Changes

- 2fc065c: ## Fix: Audit-ambiguity document coverage enforcement

  **Problem**: Agent running `/audit-ambiguity` on ideation layer skipped 62+ domain files by rationalizing "key synthesized documents" were sufficient. No gate enforced reading every file.

  **Fix**:

  - `scoring.md`: Anti-shortcut language blocking "key documents" optimization
  - `audit-ambiguity-rubrics.md`: Document enumeration gate — mandatory filesystem discovery + minimum count thresholds
  - `audit-ambiguity-execute.md`: Coverage counter (X/N tracking) + completeness gate that blocks report compilation if any documents were skipped

  **Files changed**: `.agent/skills/pipeline-rubrics/references/scoring.md`, `.agent/workflows/audit-ambiguity-rubrics.md`, `.agent/workflows/audit-ambiguity-execute.md`

## 2.13.2

### Patch Changes

- 41d645a: ## Clear session-specific memory files from kit repo

  ### Problem

  Session-specific patterns (PAT-001 through PAT-005) and decisions (DEC-001) were
  committed to the reusable kit repo's `.agent/progress/memory/` files. These are
  project-instance data that should never exist in the kit source — consumers would
  inherit another project's session history.

  ### Fix

  Cleared `patterns.md`, `decisions.md`, and `blockers.md` back to header-only state.
  The template build already strips `.agent/progress/` content, but the source repo
  itself was carrying stale session data.

  ### Files Changed

  - `.agent/progress/memory/patterns.md`
  - `.agent/progress/memory/decisions.md`

## 2.13.1

### Patch Changes

- bea3f13: ## Workflow Enforcement Audit — Write Verification Gates

  ### Problem

  Four workflows had steps that wrote to critical pipeline files but lacked verification
  gates to confirm the writes actually happened. An agent could silently skip writing meta
  files, constraint files, CX entries, or spec sections, and no downstream step would catch
  the gap until much later in the pipeline.

  ### Fix

  Added 4 blocking gates across 3 workflow files:

  1. **`ideate-discover.md`** — Meta files gate: verifies `problem-statement.md`, `personas.md`,
     `competitive-landscape.md` exist and are non-empty after problem exploration
  2. **`ideate-discover.md`** — CX coverage check: verifies CX entries exist when 2+ domains
     have Must Have features (catches silent CX Decision Gate skipping)
  3. **`ideate-validate.md`** — Constraint file gate: verifies `constraints.md` exists with at
     least one entry before proceeding to `/create-prd-stack`
  4. **`write-architecture-spec-design.md`** — Section completeness gate: verifies all required
     spec sections have content before requesting user approval

  ### Files Changed

  - `.agent/workflows/ideate-discover.md`
  - `.agent/workflows/ideate-validate.md`
  - `.agent/workflows/write-architecture-spec-design.md`

## 2.13.0

### Minor Changes

- feat: add /setup-workspace workflow with 4 operational shards

  ## Problem

  Operational setup tasks (CI/CD, hosting, database provisioning, project scaffolding)
  were being forced into the `00-infrastructure` TDD slice, which is inappropriate.
  These operational tasks don't follow Red→Green→Refactor — they're provision-and-verify.

  ## Fix

  New pipeline stage 8.5 (`/setup-workspace`) between `/plan-phase` and `/implement-slice`
  with 4 independently-invocable shards:

  1. **`/setup-workspace-scaffold`** — Project init, deps, configs, git setup
  2. **`/setup-workspace-cicd`** — CI/CD pipeline config, secrets, matrix builds
  3. **`/setup-workspace-hosting`** — Platform provisioning, domains, first staging deploy
  4. **`/setup-workspace-data`** — Database provisioning, migrations, connections

  Each shard has a verification gate. All support multi-domain architectures
  (monolith, monorepo, multi-repo, hub-and-spoke).

  ## Downstream changes

  - `plan-phase-write.md`: `00-infrastructure` reduced to TDD-able code only
  - `verify-infrastructure.md`: added `workspace` trigger
  - Pipeline tables: setup-workspace rows in GEMINI.md + AGENTS.md
  - Phase detection: workspace setup phase added
  - Skill-loading-protocol: 4 new workflow categories

## 2.12.0

### Minor Changes

- Add mandatory CX Decision Gate to ideation workflow

  ### Problem

  During `/ideate-discover` drilling, resolving open questions (OQs) and confirming Deep Think hypotheses would write decisions to feature files but silently skip cross-cut (CX) map updates. Cross-domain connections were lost unless the user manually caught and forced CX writes.

  ### Fix

  - **`idea-extraction/SKILL.md`**: Added **CX Decision Gate** — a mandatory, non-skippable gate triggered by 5 event types (OQ resolved, hypothesis confirmed, product decision made, dependency revealed, cross-domain edge case). Three gate questions enforce CX file updates before proceeding.
  - **`ideate-discover.md`**: Added `[!IMPORTANT]` callout at Step 3 (domain exploration) requiring CX Decision Gate at every level. Updated Step 5b feature deepening to run CX at every level, not just Level 3 complex features.

## 2.11.0

### Minor Changes

- Enforce structural consistency across all 13 agent rules

  ### New Rules

  - **memory-capture**: Patterns, decisions, and blockers written to memory every conversation
  - **single-question**: One question at a time with options, pros/cons, and recommendation
  - **debug-by-test**: Failing test before any fix — reproduce first, fix second
  - **skill-mcp-first**: Check skills and MCPs before reasoning on your own

  ### Rule Improvements

  - Added YAML frontmatter (`description` + `trigger: always_on`) to all 4 new rules
  - Added "What Gets Flagged" tables with ❌/✅ verdicts to 7 original rules: `security-first`, `specificity-standards`, `tdd-contract-first`, `decision-classification`, `question-vs-command`, `extensibility`, `vertical-slices`
  - Made `extensibility.md` stack-agnostic (removed hardcoded `.tsx`/`.ts` extensions)

  ### Pipeline Enforcement

  - Added mandatory completion gates to all 10 parent workflows
  - Added phase detection table and phase-aware decision tree to GEMINI.md
  - Made `sync-kit.md` Step 8.5 phase-aware
  - Added new-rule registration checklist to `kit-architecture.md` Section 6
  - Initialized memory files with PAT-001 through PAT-004 and DEC-001

## 2.7.0

### Minor Changes

- Add engagement tiers to /create-prd workflow (Auto, Hybrid, Interactive)

  - All 6 create-prd workflow files now tier-aware
  - Parent asks engagement tier (or inherits from ideation)
  - Each shard reads tier and adapts gate behavior
  - Auto: agent designs via Deep Think, marks [AUTO-CONFIRMED], user reviews compiled output
  - Hybrid/Interactive: current behavior preserved (present options, wait for user)

## 2.6.0

### Minor Changes

- Add tiered engagement modes to /ideate workflow (Auto, Hybrid, Interactive)

  - All three tiers available for all input types — no restrictions
  - Auto: pipeline self-interviews via Deep Think, user reviews compiled output
  - Hybrid (default for docs): structural gates auto, product decisions pause for user
  - Interactive (default for verbal): every gate pauses — full interview mode
  - Tier stored in ideation-index.md immediately (per principle #6)
  - ideate-discover reads tier and adapts gate behavior at all levels
  - ideate-validate adds Auto tier review checkpoint (Step 10.5) before compilation

## 2.5.0

### Minor Changes

- Enforce incremental decision persistence across all pipeline workflows

  - Added Key Principle #6: "Write decisions to disk immediately" — never batch in-memory
  - `create-prd-security.md`: Split batched end-of-file write paragraph into per-step immediate writes (Security Model, Attack Surface, Integration Points, Observability)
  - `create-prd-compile.md`: Added immediate write instructions for Development Methodology (Step 8) and Phasing Strategy (Step 9)
  - `write-architecture-spec-design.md`: Promoted write-as-you-go from buried blockquote to IMPORTANT alert; added explicit write-after-confirm to all 7 design steps (Interactions, Contracts, Data Models, Access Control, Accessibility, Event Schemas, Edge Cases)
  - Updated `GEMINI.md` and `AGENTS.md` with the new global principle

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
