# CFSA Pipeline for Claude Code

This directory contains the CFSA (Constraint-First Specification Architecture) pipeline adapted for Claude Code.

## Directory Structure

```text
.claude/
├── skills/              # Pipeline workflow skills and utilities
│   ├── workflows/       # Main pipeline workflows (ideate, create-prd, etc.)
│   ├── setup/           # Setup and bootstrap skills
│   └── utilities/       # Helper skills (resolution, templates, etc.)
├── rules/               # Always-active rules that apply to every task
├── instructions/        # Core directives (workflow, tech-stack, patterns)
├── skill-library/       # Claude-owned skill library
```

Project root canonical memory / Obsidian vault:

```text
.memory/
├── .obsidian/           # Vault config stored inside the project
├── raw/                 # Append-only session and event captures
├── wiki/                # Compiled patterns, decisions, blockers, and knowledge
├── schema/              # Machine-readable retrieval artifacts
├── mcp-server/          # Shared memory MCP server
├── hooks/               # Claude hook entrypoints
└── migrate/             # Legacy memory import helpers
```

The `.memory/` directory is the canonical project memory layer and is designed to function as an Obsidian-friendly vault inside the project. `.claude/memory/` exists only for Claude-native bridge guidance and session-specific conventions.

A Claude install also gets the shared `.memory/` runtime scaffold, including:
- the `cfsa-memory` server under `.memory/mcp-server/`
- daemon startup helpers under `.memory/mcp-server/start.mjs`
- compile/runtime helpers under `.memory/pipeline/` and `.memory/hooks/`

Tool-specific MCP client config and Claude hook wiring are user-managed. If you want Claude to talk to the shared memory daemon, add the appropriate MCP client config yourself and then run the initial compile before opening Obsidian at `.memory/`.

Claude should point at `.memory/mcp-server/client.mjs`. That client now resolves the daemon from the current workspace's `.memory/runtime/cfsa-memory-daemon.json` and validates the daemon's `projectRoot` from `/health`, so a Claude session in one repo will not silently proxy into another repo's daemon.

All runtimes should read and write shared project memory through `.memory/` and the MCP bridge.

```text
Shared memory access path
Claude / Antigravity / Factory / Codex
        -> runtime MCP client config
        -> .mcp.json -> cfsa-memory -> .memory/mcp-server/client.mjs
        -> shared daemon at .memory/mcp-server/daemon.mjs
        -> .memory/wiki/* and .memory/schema/*
```

## Parallel Structure

This directory is the standalone Claude Code runtime for the CFSA pipeline. It sits alongside the Antigravity runtime in this repository, but `.claude/` owns its Claude execution assets locally.

## Key Differences from Antigravity Version

1. **Skills vs Workflows**: Claude Code uses skills instead of passive workflow markdown files
2. **Task System**: Uses Claude Code's built-in Tasks system for progress tracking
3. **Progress + Shared Memory**: Uses `.claude/progress/` for Claude pipeline state and project-level `.memory/` for canonical cross-runtime memory
4. **Invocation**: Workflows are invoked as skills rather than slash commands in markdown
5. **Hooks + MCP**: Claude adds native hooks on top of the shared `cfsa-memory` MCP bridge

## Installation

To install the Claude Code version:

```bash
npx cfsa-antigravity init --agent claude
```

For the Antigravity version (default):

```bash
npx cfsa-antigravity init
# or
npx cfsa-antigravity init --agent antigravity
```

## Pipeline Stages

The CFSA pipeline follows these stages regardless of the agent system:

1. **Discovery** (`/ideate`) — Raw idea → structured ideation
2. **Design** (`/create-prd`) → Architecture, tech stack, security model
3. **Specification** (`/write-*-spec`) → Detailed specs per layer
4. **Planning** (`/plan-phase`) → Dependency-ordered TDD slices
5. **Setup** (`/setup-workspace`) → Project scaffold, CI/CD, infrastructure
6. **Implementation** (`/implement-slice`) → TDD vertical slices
7. **Validation** (`/validate-phase`) → Quality gates and readiness checks

## Getting Started

After installation, start the pipeline with the ideate workflow to begin your project.

## Documentation

See the main project documentation in `docs/` for complete pipeline guides.
