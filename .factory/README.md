# CFSA Pipeline for Factory Droid

This directory contains the CFSA (Constraint-First Specification Architecture) pipeline adapted for Factory Droid.

## Structure

```
.factory/
├── skills/              # All pipeline skills (workflows, utilities, rules, setup)
├── skill-library/       # Stack-specific skills provisioned by bootstrap
└── instructions/        # Template files with {{PLACEHOLDER}} markers

Project root:
└── .memory/
    └── pipeline/
        ├── progress/     # Canonical pipeline progress tracking for all runtimes
        └── kit-sync.md   # Canonical upstream sync tracking

Factory should connect as an MCP client to the shared daemon rather than spawning its own memory server.

```text
Factory MCP flow
  -> runtime MCP client config
  -> .mcp.json -> cfsa-memory -> .memory/mcp-server/client.mjs
  -> shared daemon at .memory/mcp-server/daemon.mjs
  -> .memory/wiki/* and .memory/schema/*
```

Any Factory-specific MCP client configuration should target that same project-local daemon path.

## Installation

To install the Factory Droid version:

```bash
npx cfsa-antigravity init --agent factory
```

For the Antigravity version (default):

```bash
npx cfsa-antigravity init
# or
npx cfsa-antigravity init --agent antigravity
```

For Claude Code:

```bash
npx cfsa-antigravity init --agent claude
```

## Pipeline Stages

The CFSA pipeline follows these stages regardless of the agent system:

1. `/ideate` — Discovery and fractal ideation
2. `/create-prd` — Architecture and tech stack decisions
3. `/decompose-architecture` — Domain boundary decomposition
4. `/write-architecture-spec` — Interaction specifications
5. `/write-be-spec` — Backend specifications
6. `/write-fe-spec` — Frontend specifications
7. `/plan-phase` — Implementation planning (TDD slices)
8. `/setup-workspace` — Project scaffolding
9. `/implement-slice` — TDD implementation

## Skill Organization

All skills live directly under `.factory/skills/`:

- **Pipeline workflows**: `ideate`, `create-prd`, `implement-slice`, etc.
- **Utility skills**: `brainstorming`, `session-continuity`, `systematic-debugging`, etc.
- **Rules** (background knowledge): `security-first`, `tdd-contract-first`, `vertical-slices`, etc.
- **Setup**: `setup-cfsa`, `setup-fill-placeholders`, `setup-provision-skills`, etc.

Each skill directory contains a `SKILL.md` with YAML frontmatter and markdown instructions, plus optional supporting files (references, scripts, templates).
```

This directory is the standalone Factory Droid runtime for the CFSA pipeline. It operates independently of the Antigravity (`.agents/`) and Claude Code (`.claude/`) runtimes.

## Key Differences from Other Runtimes

1. **Skills are commands**: In Factory, skills serve as both Droid-invocable capabilities and slash commands (`/skill-name`). No separate command shims are needed.
2. **Rules as skills**: Always-active rules are implemented as skills with `user-invocable: false` frontmatter, making them background knowledge the Droid loads automatically.
3. **Custom Droids**: Factory supports custom subagents via `.factory/droids/` for delegating specialized tasks.
4. **Hooks**: Factory's hook system (PreToolUse, PostToolUse, etc.) provides deterministic lifecycle control.

## Installation

To install the Factory Droid version:

```bash
npx cfsa-antigravity init --agent factory
```

For the Antigravity version (default):

```bash
npx cfsa-antigravity init
# or
npx cfsa-antigravity init --agent antigravity
```

For Claude Code:

```bash
npx cfsa-antigravity init --agent claude
```

## Pipeline Stages

The CFSA pipeline follows these stages regardless of the agent system:

1. `/ideate` — Discovery and fractal ideation
2. `/create-prd` — Architecture and tech stack decisions
3. `/decompose-architecture` — Domain boundary decomposition
4. `/write-architecture-spec` — Interaction specifications
5. `/write-be-spec` — Backend specifications
6. `/write-fe-spec` — Frontend specifications
7. `/plan-phase` — Implementation planning (TDD slices)
8. `/setup-workspace` — Project scaffolding
9. `/implement-slice` — TDD implementation

## Skill Organization

All skills live directly under `.factory/skills/`:

- **Pipeline workflows**: `ideate`, `create-prd`, `implement-slice`, etc.
- **Utility skills**: `brainstorming`, `session-continuity`, `systematic-debugging`, etc.
- **Rules** (background knowledge): `security-first`, `tdd-contract-first`, `vertical-slices`, etc.
- **Setup**: `setup-cfsa`, `setup-fill-placeholders`, `setup-provision-skills`, etc.

Each skill directory contains a `SKILL.md` with YAML frontmatter and markdown instructions, plus optional supporting files (references, scripts, templates).
