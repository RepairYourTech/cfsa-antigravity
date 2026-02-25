# Spec Pipeline Starter Kit

The antithesis of MVP development. A reusable workflow toolkit that builds
**production-grade software from line one** — from raw idea through architecture,
specification, and implementation. Stack-agnostic. Agent-agnostic. Cross-platform.

> **This kit does not build MVPs.** Every phase ships production-quality code.
> Every spec is exhaustive. Every test is meaningful. Phases control scope,
> never quality. There is no "we'll fix it later" — because there's nothing to fix.

---

## Philosophy

### The Anti-MVP

Most toolkits optimize for speed to market. Ship fast, fix later, accumulate
tech debt, then wonder why the rewrite takes longer than the original build.

This kit takes the opposite approach:

- **Specs are exhaustive** — Ambiguity gates ensure no guesswork passes downstream
- **Tests come first** — Red → Green → Refactor, never reversed
- **Every phase is production-grade** — Phase 1 code meets the same bar as Phase 3 code
- **No shortcuts survive review** — Micro and macro ambiguity checks catch hand-waving
- **Quality is tracked** — Spec pipeline tracking shows exactly what's been specified and what hasn't

The result: software that doesn't need a rewrite, because it was built correctly the first time.

### Constraint-First Decision Making

Tech stack decisions are not open-ended debates. Before presenting options, the
pipeline builds a **decision constraints map** from the vision document:

1. **Hard constraints** — compliance, team expertise, budget, existing infrastructure
2. **Surface constraints** — desktop, mobile, web, CLI, API — each eliminates options
3. **Soft constraints** — performance preferences, developer experience

Constraints narrow the option space. Some decisions become obvious. Others get
up to 5 viable options plus a Hybrid, each scored against the constraints.

### Progressive Decision Lock

Each pipeline stage locks decisions. Downstream stages build on locked decisions
and may not contradict them. To change a locked decision, re-run the originating
stage and cascade changes downstream.

### Input Quality Guarantee

All input types — rich documents, thin PRDs, chat transcripts, verbal ideas —
produce the **same output quality**. Only the interview work differs. A 50KB
detailed spec gets proportional extraction; a one-liner gets an exhaustive
interview. The output quality bar is constant.

---

## Getting Started

### 1. Copy the kit into your project

```bash
cp -r spec-pipeline-starter/.agent /path/to/your-project/
cp -r spec-pipeline-starter/docs /path/to/your-project/
```

The `.agent/` folder contains everything: rules, instructions, skills, workflows, and the skill library.
The `docs/` directory is pre-scaffolded with READMEs and `.gitkeep` files — without it, the pipeline has nowhere to write its outputs.

### 2. Configure for your agent

| Agent | What to Do |
|-------|------------|
| **Antigravity** | Copy `GEMINI.md` to your project root — it's the system prompt |
| **Claude Code** | Copy rules/instructions into `.claude/` using Claude's format |
| **Cursor** | Reference from `.cursorrules` or your Cursor config |
| **Windsurf** | Reference from `.windsurfrules` or equivalent |
| **Other** | Follow your agent's convention for loading system instructions |

### 3. Start the pipeline

```
/ideate                              # From scratch — deep interview
/ideate @path/to/your-idea.md        # From existing document
```

The pipeline tells you what to run next at every step. You never have to guess.

---

## The `@file` Pattern

Every pipeline command accepts an optional `@path/to/file.md` argument:

```
/ideate @examples/rich-document/symbiote-trader-idea.md
/ideate @examples/thin-prd/idea.md
/ideate @examples/chat-transcript/divided-we-brawl.md
```

The workflow reads the file, detects the input type automatically, and enters
the appropriate mode. See `examples/README.md` for details.

### Input Types

| Input Type | Example | Mode Triggered | Interview Work |
|---|---|---|---|
| Rich document | 50KB+ detailed spec | Extraction | Minimal — captures existing depth |
| Thin PRD | Short bullet list | Expansion | Moderate — deepens every section |
| Chat transcript | Conversation log | Extraction + noise filter | Moderate — extracts signal from noise |
| One-liner / verbal | No file | Interview (deep) | Maximum — builds from scratch |

**Quality guarantee**: All four input types produce the **same output quality**. Only the interview work differs.

---

## The Pipeline

```
 ┌─────────────────────────────────────────────────────┐
 │                    DISCOVERY                        │
 │                                                     │
 │   /ideate ──────────────► vision.md                 │
 │                                                     │
 └───────────────────────┬─────────────────────────────┘
                         ▼
 ┌─────────────────────────────────────────────────────┐
 │                     DESIGN                          │
 │                                                     │
 │   /create-prd ──────────► architecture-design.md    │
 │     ├─ calls /bootstrap-agents progressively        │
 │     ├─ emits ENGINEERING-STANDARDS.md               │
 │     └─ emits data-placement-strategy.md             │
 │                                                     │
 │   /decompose-architecture ► IA shards + indexes     │
 │                                                     │
 └───────────────────────┬─────────────────────────────┘
                         ▼
 ┌─────────────────────────────────────────────────────┐
 │                SPECIFICATION                        │
 │                                                     │
 │   /write-architecture-spec ► detailed IA specs      │
 │                  ▼                                   │
 │   /audit-ambiguity ia ► quality gate ✓              │
 │                  ▼                                   │
 │   /write-be-spec ──────────► BE specs               │
 │     └─ reads data-placement-strategy.md             │
 │                  ▼                                   │
 │   /audit-ambiguity be ► quality gate ✓              │
 │                  ▼                                   │
 │   /write-fe-spec ──────────► FE specs               │
 │                  ▼                                   │
 │   /audit-ambiguity all ► cascade gate ✓             │
 │                                                     │
 └───────────────────────┬─────────────────────────────┘
                         ▼
 ┌─────────────────────────────────────────────────────┐
 │                IMPLEMENTATION                       │
 │                                                     │
 │   /plan-phase ─────────► vertical slices            │
 │                  ▼                                   │
 │   /implement-slice ────► TDD code (Red→Green→Refactor)│
 │                  ▼                                   │
 │   /validate-phase ─────► final quality gate ✓       │
 │                                                     │
 └─────────────────────────────────────────────────────┘

 Maintenance: /evolve-contract ► safe schema migration
              /sync-kit ► merge upstream kit improvements
              /update-architecture-map ► living architecture doc
```

---

## Bootstrap Provisioning

`/bootstrap-agents` is a **surgical, additive, idempotent provisioner** that fills `{{PLACEHOLDER}}` values in instruction templates and provisions skills from the skill library. It is NOT a standalone command — it fires automatically from within other workflows:

| Workflow | When It Fires | What It Does |
|---|---|---|
| `/create-prd` | After each tech decision | Fills the decided key, provisions matching skills |
| `/write-be-spec` | If spec adds new backend dependency | Fills the new key, `PIPELINE_STAGE=write-be-spec` |
| `/write-fe-spec` | If spec adds new frontend dependency | Fills the new key, `PIPELINE_STAGE=write-fe-spec` |
| `/implement-slice` | If implementation adds new dependency | Fills the new key only |

Each invocation fills ONLY the placeholders for the decisions just confirmed. It never touches unfilled placeholders or re-fills already-filled ones.

---

## Bundled Skills

These skills ship with the kit because every project needs them regardless of tech stack:

| Skill | Purpose |
|-------|---------|
| `accessibility` | WCAG 2.1 auditing, keyboard nav, screen reader |
| `api-design-principles` | API design theory and patterns |
| `architecture-mapping` | Living architecture document generation |
| `bootstrap-agents` | Placeholder filling and skill provisioning |
| `brainstorming` | Collaborative Q&A for ideation and design |
| `clean-code` | Architecture principles, YAGNI, naming |
| `code-review-pro` | Deep code analysis — security, performance, maintainability |
| `database-schema-design` | Schema design with normalization and constraints |
| `deployment-procedures` | Safe deployment workflows and rollback strategies |
| `error-handling-patterns` | Exception handling, Result types, graceful degradation |
| `find-skills` | Discovers and installs stack-specific skills |
| `git-workflow` | Branch, commit, and PR conventions |
| `idea-extraction` | Exhaustive idea extraction for `/ideate` |
| `logging-best-practices` | Structured logging, log levels, PII handling |
| `migration-management` | Database migration versioning and rollback |
| `minimalist-surgical-development` | Minimal, non-invasive code changes |
| `parallel-agents` | Orchestrate specialist agents on independent domains |
| `parallel-debugging` | Dispatch parallel agents for multi-failure diagnosis |
| `parallel-feature-development` | File ownership + merge protocol for parallel coding |
| `resolve-ambiguity` | Tiered information gathering to avoid guessing |
| `rest-api-design` | REST API conventions, HTTP methods, status codes |
| `security-scanning-security-hardening` | Security model, input validation |
| `session-continuity` | Cross-session progress tracking + pattern extraction |
| `systematic-debugging` | Structured bug diagnosis before proposing fixes |
| `tdd-workflow` | Test-driven development methodology |
| `technical-writer` | Clear, comprehensive technical documentation |
| `testing-strategist` | Testing strategy design — unit, integration, E2E |
| `typescript-advanced-patterns` | Advanced type-safe contract patterns |

### Stack-Specific Skill Discovery

Skills for your chosen stack are installed automatically by `/bootstrap-agents` during `/create-prd`. The `.agent/skill-library/MANIFEST.md` defines which stack values trigger which skill installations.

You can also discover skills manually by reading `.agent/skills/find-skills/SKILL.md` and searching for your tech (e.g., "vitest", "surrealdb", "tailwind").

---

## Universal Rules

Rules in `.agent/rules/` are **always active** — they apply to every task, every session:

| Rule | What It Enforces |
|------|-----------------|
| `security-first` | PII isolation, input validation, secret handling |
| `tdd-contract-first` | Zod schemas before implementation, tests ARE the spec |
| `vertical-slices` | All four surfaces or it's not done |
| `specificity-standards` | Testable acceptance criteria, exhaustive spec depth |
| `extensibility` | File limits, directory docs, anti-spaghetti |
| `boundary-not-placeholder` | Boundary stubs vs banned lazy placeholders |
| `question-vs-command` | Questions = discuss, Commands = act, Ambiguous = ask |
| `decision-classification` | Product = user, Architecture = options, Implementation = agent |
| `completion-checklist` | Code ≠ done. Code + tests + tracking = done |

## Instruction Templates

| File | What It Guides |
|------|--------------------|
| `workflow.md` | Execution sequence & validation |
| `tech-stack.md` | Technology decisions & skill mappings |
| `patterns.md` | Code conventions & architecture |
| `structure.md` | Directory layout & protected files |
| `commands.md` | Dev, test, lint, build commands |

All templates use `{{PLACEHOLDER}}` markers that `/bootstrap-agents` fills with your project-specific values.

---

## Cross-Platform Notes

This kit is **agent-adaptable** and **platform-agnostic**:

- **No shell commands in workflows** — All workflow steps are written as prose instructions that any agent can interpret. No `bash`, `mkdir`, `cat`, `grep`, or other shell-specific commands.
- **No agent-specific APIs** — Workflows describe *what* to do, not *how* to call it. Any agent that can read files, write files, and search can execute them.
- **Pre-scaffolded directories** — The `docs/` directory structure is created by the kit, not by workflow shell commands. Multi-surface projects create additional directories as needed.

---

## Methodology: Contract-First Progressive Architecture (CFPA)

```
Contract (Zod schema) → Tests (failing) → Implementation (make them pass)
```

**Never reverse this order.** Specs define contracts. Tests verify contracts. Implementation satisfies tests.
