# CODEX.md

This file provides guidance to Codex when working with code in this repository.

## Project Overview

**CFSA Antigravity** is a Constraint-First Specification Architecture pipeline that transforms raw ideas into exhaustively specified, test-driven, production-quality code through progressive gates. This repository is the kit source, not a destination product.

- **Entry Point**: `npx cfsa-antigravity init`
- **Codex support model**: Codex uses `CODEX.md` for repo guidance and the standalone `.codex/` runtime for workflow skills, rules, instructions, and skill library content
- **Core Philosophy**: production-grade from line one, no throwaway code, no deferred quality

## Essential Commands

```bash
npm run build
npm run check
npm run changeset
```

## Runtime Model

Codex is a first-class supported agent target with its own `.codex/` runtime tree.

Instead:

- `cfsa-antigravity init --agent codex` installs the standalone `.codex/` runtime
- `CODEX.md` provides Codex-specific repository guidance
- `AGENTS.md` remains the generic pipeline config shipped to installed projects
- `.memory/` is the canonical shared memory root installed into the project for cross-runtime continuity
- `.mcp.json` registers the `cfsa-memory` MCP client entry so Codex can connect to the shared project-local memory daemon
- the shared daemon lives at `.memory/mcp-server/daemon.mjs`; client requests flow through `.memory/mcp-server/client.mjs`

This means Codex should act as an MCP client to the one project-local memory daemon, not spawn an isolated per-runtime memory server.

```text
Codex MCP flow
  -> .mcp.json
  -> cfsa-memory
  -> .memory/mcp-server/client.mjs
  -> shared daemon at .memory/mcp-server/daemon.mjs
  -> .memory/wiki/* and .memory/schema/*
```

If the Codex runtime has its own MCP client configuration surface beyond `.mcp.json`, point that client at the same `cfsa-memory` registration rather than defining a second server.

## What To Read First

1. `AGENTS.md`
2. `.codex/instructions/workflow.md`
3. `.codex/instructions/commands.md`
4. `docs/README.md`
5. `docs/kit-architecture.md`

## Contribution Notes

- Do not edit `template/` directly
- Update source files first, then run `npm run build`
- Run `npm run check` before considering the task complete
- Preserve `{{PLACEHOLDER}}` markers in kit source files

## Codex Alignment

If you change Codex support, keep these aligned:

- CLI help and argument parsing in `bin/cli.mjs`
- Root documentation (`README.md`, `docs/README.md`, `docs/kit-architecture.md`)
- Root config sync (`CODEX.md` copied into `template/`)
- Runtime sync (`.codex/` copied into `template/.codex/`)
- Template integrity checks in `scripts/check-template-integrity.sh`
- shared MCP daemon/client contract in `.memory/mcp-server/`
