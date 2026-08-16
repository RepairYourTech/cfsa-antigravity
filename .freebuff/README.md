# CFSA Pipeline for Freebuff

This directory contains the CFSA (Constraint-First Specification Architecture) pipeline adapted for Freebuff. It mirrors `.claude/`, the Claude Code runtime, so Freebuff sessions get the same skills, rules, instructions, and slash commands.

## Directory Structure

```text
.freebuff/
├── FREEBUFF.md          # Freebuff-native routing guidance
├── settings.json        # Freebuff permission allow-list
├── commands/            # Slash-command entrypoints (ideate, create-prd, etc.)
├── skills/              # Pipeline workflow skills and utilities
├── rules/               # Always-active rules that apply to every task
├── instructions/        # Core directives (workflow, tech-stack, patterns)
└── skill-library/       # Freebuff-owned skill library
```

Project root canonical memory / Obsidian vault:

```text
.memory/
├── .obsidian/           # Vault config stored inside the project
├── raw/                 # Append-only session and event captures
├── wiki/                # Compiled patterns, decisions, blockers, and knowledge
├── schema/              # Machine-readable retrieval artifacts
├── mcp-server/          # Shared memory MCP server
└── hooks/               # Freebuff hook entrypoints
```

The `.memory/` directory is the canonical project memory layer and is designed to function as an Obsidian-friendly vault inside the project. `.freebuff/memory/` exists only for Freebuff-native bridge guidance and session-specific conventions.

A Freebuff install also gets the shared `.memory/` runtime scaffold, including:
- the `cfsa-memory` server under `.memory/mcp-server/`
- daemon startup helpers under `.memory/mcp-server/start.mjs`
- compile/runtime helpers under `.memory/pipeline/` and `.memory/hooks/`

Tool-specific MCP client config and Freebuff hook wiring are user-managed. If you want Freebuff to talk to the shared memory daemon, add the appropriate MCP client config yourself and then run the initial compile before opening Obsidian at `.memory/`.

Freebuff should point at `.memory/mcp-server/client.mjs`. That client resolves the daemon from the current workspace's `.memory/runtime/cfsa-memory-daemon.json` and validates the daemon's `projectRoot` from `/health`, so a Freebuff session in one repo will not silently proxy into another repo's daemon.

All runtimes should read and write shared project memory through `.memory/` and the MCP bridge.

```text
Shared memory access path
Freebuff / Antigravity / Factory / Codex
        -> runtime MCP client config
        -> .mcp.json -> cfsa-memory -> .memory/mcp-server/client.mjs
        -> shared daemon at .memory/mcp-server/daemon.mjs
        -> .memory/wiki/* and .memory/schema/*
```

## Parallel Structure

This directory is the standalone Freebuff runtime for the CFSA pipeline. It sits alongside the Antigravity runtime in this repository, but `.freebuff/` owns its Freebuff execution assets locally.

## Key Differences from Antigravity Version

1. **Skills vs Workflows**: Freebuff uses skills instead of passive workflow markdown files
2. **Task System**: Uses Freebuff's task-tracking conventions (`write_todos`) for progress tracking
3. **Progress + Shared Memory**: Uses `.memory/pipeline/progress/` for Freebuff pipeline state and project-level `.memory/` for canonical cross-runtime memory
4. **Invocation**: Workflows are invoked as skills or slash commands
5. **Hooks + MCP**: Freebuff adds native hooks on top of the shared `cfsa-memory` MCP bridge

## Installation

To install the Freebuff version:

```bash
npx cfsa-antigravity init --agent freebuff
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
