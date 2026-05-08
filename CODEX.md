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

---

## context-mode — MANDATORY routing rules

context-mode MCP tools available. Rules protect context window from flooding. One unrouted command dumps 56 KB into context. Codex CLI enforces routing via hooks (deny rules in `preToolUse`) AND these instructions. Hooks = hard enforcement; rules = completeness for redirections hooks cannot catch.

### Think in Code — MANDATORY

Analyze/count/filter/compare/search/parse/transform data: **write code** via `ctx_execute(language, code)`, `console.log()` only the answer. Do NOT read raw data into context. PROGRAM the analysis, not COMPUTE it. Pure JavaScript — Node.js built-ins only (`fs`, `path`, `child_process`). `try/catch`, handle `null`/`undefined`. One script replaces ten tool calls.

### BLOCKED — do NOT use

#### curl / wget — FORBIDDEN (hook-enforced)
Do NOT use `curl`/`wget` in shell. Dumps raw HTTP into context.
Use: `ctx_fetch_and_index(url, source)` or `ctx_execute(language: "javascript", code: "const r = await fetch(...)")`

#### Inline HTTP — FORBIDDEN
No `node -e "fetch(..."`, `python -c "requests.get(..."`. Bypasses sandbox.
Use: `ctx_execute(language, code)` — only stdout enters context

#### Direct web fetching — FORBIDDEN
Raw HTML can exceed 100 KB.
Use: `ctx_fetch_and_index(url, source)` then `ctx_search(queries)`

### REDIRECTED — use sandbox

#### Shell (>20 lines output)
Shell ONLY for: `git`, `mkdir`, `rm`, `mv`, `cd`, `ls`, `npm install`, `pip install`.
Otherwise: `ctx_batch_execute(commands, queries)` or `ctx_execute(language: "shell", code: "...")`

#### File reading (for analysis)
Reading to **edit** → reading correct. Reading to **analyze/explore/summarize** → `ctx_execute_file(path, language, code)`.

#### Grep / find (large results)
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

### Output

Terse like caveman. Technical substance exact. Only fluff die.
Drop: articles, filler (just/really/basically), pleasantries, hedging. Fragments OK. Short synonyms. Code unchanged.
Pattern: [thing] [action] [reason]. [next step]. Auto-expand for: security warnings, irreversible actions, user confusion.
Write artifacts to FILES — never inline. Return: file path + 1-line description.

### Memory

Session history is persistent and searchable. On resume, search BEFORE asking the user:

| Need | Command |
|------|---------|
| What did we decide? | `ctx_search(queries: ["decision"], source: "decision", sort: "timeline")` |
| What constraints exist? | `ctx_search(queries: ["constraint"], source: "constraint")` |

DO NOT ask "what were we working on?" — SEARCH FIRST.
If search returns 0 results, proceed as a fresh session.

### ctx commands

| Command | Action |
|---------|--------|
| `ctx stats` | Call `stats` MCP tool, display full output verbatim |
| `ctx doctor` | Call `doctor` MCP tool, run returned shell command, display as checklist |
| `ctx upgrade` | Call `upgrade` MCP tool, run returned shell command, display as checklist |
| `ctx purge` | Call `purge` MCP tool with confirm: true. Warns before wiping knowledge base. |

After /clear or /compact: knowledge base and session stats preserved. Use `ctx purge` to start fresh.
