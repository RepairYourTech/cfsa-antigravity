# CFSA Pipeline for ZCode

This directory contains the ZCode workspace configuration for the CFSA
(Constraint-First Specification Architecture) pipeline. It mirrors the Claude
Code runtime in `.claude/` without duplicating shared assets.

## Directory Structure

```text
.zcode/
├── config.json          # Workspace MCP servers + hooks (graphify nudges)
├── commands/            # Pipeline slash-commands (/ideate, /create-prd, ...)
└── README.md            # This file
```

Shared, runtime-agnostic assets are **not** duplicated here. ZCode discovers
them in place:

| Asset | Location | Notes |
|---|---|---|
| Skills | `.agents/skills/` | Same library Claude and Antigravity use; loaded automatically |
| Rules | `.agents/rules/` | Referenced from root `AGENTS.md` (ZCode has no separate rules auto-load) |
| Instructions | `.agents/instructions/` | Referenced from root `AGENTS.md` |
| Project instructions | `AGENTS.md` (repo root) | ZCode's workspace instruction file — the equivalent of `.claude/CLAUDE.md` |
| Canonical memory | `.memory/` | Shared cross-runtime vault, see `.claude/README.md` for the vault layout |

## MCP

`.zcode/config.json` declares the `cfsa-memory` server, which connects ZCode to
the shared memory daemon at `.memory/mcp-server/daemon.mjs` through
`.memory/mcp-server/client.mjs` — the same bridge Claude uses via `.mcp.json`.

Machine-local servers (chrome-devtools, stripe, bitwarden) intentionally live
only in the gitignored root `.mcp.json`, which ZCode does not read. If you want
them in ZCode, add them to user scope (`~/.zcode/cli/config.json`) or to the
`mcp.servers` block here — but never commit secrets.

## Hooks

The two `PreToolUse` hooks ported from `.claude/settings.json` nudge ZCode
toward the graphify knowledge graph (`graphify-out/`) instead of raw grepping
or file-by-file reads. Configuration-file hooks are disabled by default in
ZCode; this config sets `hooks.enabled: true`.

## Commands

Each file in `commands/` is a thin wrapper that invokes the corresponding skill
from `.agents/skills/` — the same shape as `.claude/commands/`, with skill
references rewritten to the `.agents/` path. `$ARGUMENTS` is substituted by
ZCode natively.

## Parallel Structure

This directory sits alongside `.claude/` (Claude Code) and `.agents/`
(runtime-agnostic shared assets). When a pipeline skill changes, update it in
`.agents/skills/` only; the command wrappers here and in `.claude/commands/`
point at the shared library and should rarely need edits.
