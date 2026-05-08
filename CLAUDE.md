# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CFSA Antigravity** is a Constraint-First Specification Architecture pipeline that transforms raw ideas into exhaustively specified, test-driven, production-quality code through progressive gates. This is a **meta-project** — it's the kit that gets installed into other projects, not a destination project itself.

- **Entry Point**: `npx cfsa-antigravity init` — installs the pipeline into target projects
- **Core Philosophy**: Every line of code is production-grade from line one. No MVPs, no throwaway code, no "fix it later."
- **Agent-Agnostic**: Works with any AI agent supporting slash commands or repo instruction files (Antigravity, Codex, Cursor, Windsurf, Factory Droid, etc.)

## Essential Commands

### Installation & Maintenance
```bash
npm run build          # Build template/ from the maintained .agents/, .claude/, and .factory/ trees for publishing
npm run check          # Verify template integrity
npm run changeset      # Create a changeset for versioning
npm test              # Run tests (if present)
```

### Development Workflow
- **Entry Point**: Users run `/ideate` to start the pipeline in their projects
- **Sync Kit**: `/sync-kit` pulls upstream improvements into existing installations
- **Status**: `cfsa-antigravity status` checks installation and unfilled placeholders

## Architecture Overview

### The Progressive Decision Lock System

The pipeline enforces a **progressive decision lock** — each stage locks decisions that downstream stages cannot contradict:

1. `/ideate` → Locks **vision** (problem, personas, features, constraints)
2. `/create-prd` → Locks **architecture** (tech stack, system design, security model)
3. `/decompose-architecture` → Locks **domain boundaries** (shard structure, dependencies)
4. `/write-architecture-spec` → Locks **interaction specs** (contracts, data models per shard)
5. `/write-be-spec` → Locks **backend contracts** (API endpoints, schemas, middleware)
6. `/write-fe-spec` → Locks **frontend specs** (components, state, interactions)
7. `/plan-phase` → Locks **implementation order** (dependency-ordered TDD slices)
8. `/setup-workspace` → Locks **operational foundation** (project scaffolded, CI/CD green)
9. `/implement-slice` → Locks **code** (tests → implementation → validation)

### Directory Structure

```
.claude/
├── commands/            # Slash command shims (/ideate, /create-prd, etc.)
├── skills/
│   ├── <workflow>/      # Pipeline workflow skills as top-level skill dirs
│   ├── setup/           # Setup/bootstrap skills
│   └── utilities/       # Utility skills
├── skill-library/       # Claude-owned skill library
├── rules/               # Always-active constraints
├── instructions/        # Core directives (workflow, tech-stack, patterns)
.factory/
├── skills/              # All pipeline skills (workflows + rules + utilities as SKILL.md)
├── skill-library/       # Factory-owned skill library
└── instructions/        # Core directives (workflow, tech-stack, patterns)
.memory/                 # Canonical shared project memory / Obsidian-friendly vault
├── pipeline/progress/   # Shared pipeline progress tracking
docs/
├── plans/               # User project specifications (output directory)
│   ├── ideation/
│   ├── ia/
│   ├── be/
│   └── fe/
└── audits/              # Ambiguity audits
template/                # Built from .agents/ + .claude/ + .factory/ + root configs for npm publishing (DO NOT EDIT DIRECTLY)
bin/cli.mjs              # CLI entry point
```

### The Fractal Ideation Structure

The ideation phase (`/ideate`) produces a **fractal folder structure** that serves as the source of truth for all downstream work:

```
.memory/wiki/specs/ideation/
├── ideation-index.md    # Pipeline key file — shape, structure map, MoSCoW
├── ideation-cx.md       # Global cross-cut (multi-product only)
├── domains/             # Single/multi-surface-shared projects
│   └── 01-domain-name/
│       ├── domain-name-index.md   # Children table, Role Matrix, decisions
│       ├── domain-name-cx.md      # Cross-cuts between children
│       └── 01-feature.md          # Leaf feature file (Role Lens, behavior)
├── meta/               # Structured metadata
│   ├── problem-statement.md
│   ├── personas.md
│   ├── constraints.md
│   └── competitive-landscape.md
└── [surfaces/]         # Multi-product projects only
    └── {surface}/
```

**Key**: `ideation-index.md` is the **pipeline key file** — all downstream workflows read it first.

## Workflows & Skills System

### Workflow Architecture

- **Workflow Skills**: `.claude/skills/<workflow-name>/SKILL.md` files that define each pipeline stage
- **Slash Commands**: `.claude/commands/*.md` shims expose `/ideate`, `/create-prd`, etc.
- **Sharding**: Large workflows split into shard skills (e.g., `create-prd-stack`, `create-prd-compile`)
- **Independent Invocation**: Parent workflows orchestrate shard skills; shards can be invoked directly when needed

### The Placeholder System

Templates use `{{PLACEHOLDER}}` markers that are filled by `/bootstrap-agents` (mirrored as Claude workflow/command wiring):

- `{{PROJECT_NAME}}`, `{{DESCRIPTION}}`, `{{TECH_STACK_SUMMARY}}`
- `{{CONTRACT_LIBRARY}}` (e.g., "zod", "pydantic", "go-validation")
- Per-surface stack decisions in `tech-stack.md` Surface Stack Map

**Critical**: Never hardcode placeholder values. Always keep them as `{{PLACEHOLDER}}` in the kit source.

### Skill Resolution

Claude workflows resolve skills from the **Surface Stack Map** in `.claude/instructions/tech-stack.md`:

1. Determine the shard/slice's surface from its directory path
2. Look up the row for that surface in the Per-Surface table
3. Load all skills listed in the required columns
4. Cross-cutting workflows use the Cross-Cutting Skills table

## Development Practices

### When Contributing

1. **Issue First**: Every PR must have a linked, approved issue
2. **Changesets**: Run `npm run changeset` for user-facing changes
3. **Build Before Submit**: `npm run build` must pass
4. **Workflow Size Limit**: New workflows must be under 12,000 characters
5. **No Hardcoded Placeholders**: Keep `{{PLACEHOLDER}}` values intact
6. **Shared Content**: Put reusable content in `prd-templates/references/`, not inline

### Testing Strategy

The kit enforces **TDD: Red → Green → Refactor** for all implementation:

1. Write failing tests first (Red)
2. Write minimal production code to pass (Green)
3. Refactor while keeping tests green
4. Minimum 80% coverage (unit + integration + E2E)

### Non-Negotiable Rules

Rules in `.claude/rules/` apply to **every task**:

- **security-first**: PII isolation, input validation, secret handling
- **tdd-contract-first**: Schemas before implementation, tests ARE the spec
- **vertical-slices**: All four surfaces (BE, FE, tests, docs) or it's not done
- **specificity-standards**: Testable acceptance criteria, exhaustive spec depth
- **boundary-not-placeholder**: Use typed interface stubs, not `// TODO` comments
- **completion-checklist**: Code + tests + tracking = done (code alone is incomplete)

## Publishing Process

```bash
# 1. Build template from source
npm run build

# 2. Verify integrity
npm run check

# 3. Create changeset (if user-facing changes)
npm run changeset

# 4. Commit and PR
git add .
git commit -m "feat: ..."
git push

# 5. After PR merge, GitHub Action opens "Version Packages" PR
# 6. Merge that PR to trigger npm publish
```

### What Gets Published

The `template/` directory is what gets published to npm. It's built from:
- `.agents/` (full directory)
- `.claude/` (full directory)
- `.factory/` (full directory)
- `docs/` (full directory, but `.memory/wiki/specs/` and `.memory/wiki/specs/audits/` content is stripped)
- Root config files (`GEMINI.md`, `AGENTS.md`, `CLAUDE.md`, `CODEX.md`)

Session-specific data is excluded (`.memory/pipeline/progress/*.md` runtime session artifacts where applicable, and `.memory/raw/*` generated runtime captures).

## Key Documentation

| Document | Purpose |
|----------|---------|
| `README.md` | User-facing overview and quick start |
| `AGENTS.md` | Agent config (Antigravity CLI) |
| `CODEX.md` | Agent config and repo guidance for Codex |
| `GEMINI.md` | Agent config (Gemini CLI) |
| `CONTRIBUTING.md` | Contribution workflow and PR process |
| `docs/kit-architecture.md` | Deep dive into kit internals |
| `docs/README.md` | Full pipeline walkthrough |

## Pipeline Entry Point Detection

When a user runs a command, check:

1. **Ideation Complete?** → `.memory/wiki/specs/ideation/ideation-index.md` exists
2. **PRD Complete?** → No `{{PLACEHOLDER}}` values in `GEMINI.md`/`AGENTS.md`
3. **Installation Status?** → `cfsa-antigravity status`

If ideation-index.md doesn't exist, the pipeline hasn't started — tell user to run `/ideate` first.

## Cost-Blind Execution

**Critical**: The cost of API calls, tokens, or compute to complete your work is **never your concern**. Do not estimate, report, or factor operational AI costs into any decision. The only cost constraints that matter are user-defined project constraints (e.g., "keep hosting costs low"). If the user hasn't defined a cost constraint, cost is not a factor.

## Writing Decisions to Disk

**Every confirmed decision must be written to its output file immediately.** Never batch decisions in-memory across a long conversation. If the conversation truncates, all confirmed work must survive on disk.

This is enforced by:
- **Session Continuity Protocols** (`.claude/skills/session-continuity/protocols/`)
- **Progress Tracking** (`.memory/pipeline/progress/spec-pipeline.md`)
- **Pattern Extraction** (`.claude/skills/session-continuity/protocols/04-pattern-extraction.md`)

## Common Tasks

### Adding a New Workflow

1. If you're changing Antigravity, edit `.agents/skills/your-workflow/SKILL.md`
2. If you're changing Claude, edit `.claude/skills/your-workflow/SKILL.md`
3. If you're changing Factory, create `.factory/skills/your-workflow/SKILL.md`
4. If the workflow should exist in all runtimes, add the matching counterpart in each tree
5. Add the Claude slash command shim when applicable: `.claude/commands/your-workflow.md`
6. Update `AGENTS.md`, `GEMINI.md`, and `CLAUDE.md` workflow docs if needed
7. Run `npm run check`
8. Create changeset: `npm run changeset`

### Adding a New Skill

1. Create it in the runtime you are extending (`.agents/skill-library/[category]/[skill-name]/`, `.claude/skill-library/[category]/[skill-name]/`, or `.factory/skill-library/[category]/[skill-name]/`)
2. Add `SKILL.md` with YAML frontmatter (name, description)
3. Add it to the matching runtime's `skill-library/MANIFEST.md`
4. Follow stack-specific pattern if needed (e.g., `references/typescript.md`)

### Updating Templates

1. Edit files in `.agents/`, `.claude/`, or `docs/` (never edit `template/` directly)
2. Run `npm run build` to sync changes to `template/`
3. Verify with `npm run check`
4. Commit and create PR

## Project Configuration Files

- **commitlint.config.js** — Enforces conventional commit format
- **package.json** — Zero-dependency CLI by design
- **.changeset/** — Versioning and changelog generation
- **.github/workflows/** — CI/CD automation

---

## context-mode — MANDATORY routing rules

context-mode MCP tools available via Claude Code plugin marketplace (`/plugin marketplace add mksglu/context-mode` + `/plugin install context-mode@context-mode`). Rules protect the context window from flooding. One unrouted command dumps 56 KB into context.

### Think in Code — MANDATORY

Analyze/count/filter/compare/search/parse/transform data: **write code** via `ctx_execute(language, code)`, `console.log()` only the answer. Do NOT read raw data into context. PROGRAM the analysis, not COMPUTE it. Pure JavaScript — Node.js built-ins only (`fs`, `path`, `child_process`). `try/catch`, handle `null`/`undefined`. One script replaces ten tool calls.

### BLOCKED — do NOT attempt

#### curl / wget — BLOCKED
Intercepted and replaced with error. Do NOT retry.
Use: `ctx_fetch_and_index(url, source)` or `ctx_execute(language: "javascript", code: "const r = await fetch(...)")`

#### Inline HTTP — BLOCKED
`fetch('http`, `requests.get(`, `requests.post(`, `http.get(`, `http.request(` — intercepted. Do NOT retry.
Use: `ctx_execute(language, code)` — only stdout enters context

#### WebFetch — BLOCKED
Use: `ctx_fetch_and_index(url, source)` then `ctx_search(queries)`

### REDIRECTED — use sandbox

#### Bash (>20 lines output)
Bash ONLY for: `git`, `mkdir`, `rm`, `mv`, `cd`, `ls`, `npm install`, `pip install`.
Otherwise: `ctx_batch_execute(commands, queries)` or `ctx_execute(language: "shell", code: "...")`

#### Read (for analysis)
Reading to **Edit** → Read correct. Reading to **analyze/explore/summarize** → `ctx_execute_file(path, language, code)`.

#### Grep (large results)
Use `ctx_execute(language: "shell", code: "grep ...")` in sandbox.

### Tool selection

0. **MEMORY**: `ctx_search(sort: "timeline")` — after resume, check prior context before asking user.
1. **GATHER**: `ctx_batch_execute(commands, queries)` — runs all commands, auto-indexes, returns search. ONE call replaces 30+.
2. **FOLLOW-UP**: `ctx_search(queries: ["q1", "q2", ...])` — all questions as array, ONE call (default relevance mode).
3. **PROCESSING**: `ctx_execute(language, code)` | `ctx_execute_file(path, language, code)` — sandbox, only stdout enters context.
4. **WEB**: `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` — raw HTML never enters context.
5. **INDEX**: `ctx_index(content, source)` — store in FTS5 for later search.

### Parallel I/O batches

For multi-URL fetches or multi-API calls, **always** include `concurrency: N` (1-8). Use concurrency 4-8 for I/O-bound, 1 for CPU-bound. GitHub API rate-limit: cap at 4 for `gh` calls.

### Subagent routing

Routing block auto-injected into subagent prompts. No manual instruction needed.

### Output

Terse like caveman. Technical substance exact. Only fluff die.
Drop: articles, filler (just/really/basically), pleasantries, hedging. Fragments OK. Short synonyms. Code unchanged.
Pattern: [thing] [action] [reason]. [next step]. Auto-expand for: security warnings, irreversible actions, user confusion.

### Session Continuity

Skills, roles, and decisions persist for the entire session. Do not abandon them as the conversation grows.

### Memory

Session history persistent and searchable. On resume, search BEFORE asking the user:

| Need | Command |
|------|---------|
| What were we working on? | `ctx_search(queries: ["summary"], source: "compaction", sort: "timeline")` |
| What did we decide? | `ctx_search(queries: ["decision"], source: "decision", sort: "timeline")` |
| What constraints exist? | `ctx_search(queries: ["constraint"], source: "constraint")` |

DO NOT ask "what were we working on?" — SEARCH FIRST.

### ctx commands

| Command | Action |
|---------|--------|
| `ctx stats` | Call `ctx_stats` MCP tool, display full output verbatim |
| `ctx doctor` | Call `ctx_doctor` MCP tool, run returned shell command, display as checklist |
| `ctx upgrade` | Call `ctx_upgrade` MCP tool, run returned shell command, display as checklist |
| `ctx purge` | Call `ctx_purge` MCP tool with confirm: true. Warns before wiping knowledge base. |

After /clear or /compact: knowledge base and session stats preserved. Use `ctx purge` to start fresh.
