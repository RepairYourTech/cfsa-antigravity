# CFSA Antigravity

> Constraint-First Specification Architecture — production-grade from line one

A pipeline that turns a raw idea into exhaustively specified, test-driven, production-quality code through progressive gates. Stack-agnostic. Built for Antigravity on Linux/WSL. Every line of code is production-grade from the moment it's written.

## Quick Install

```bash
npx cfsa-antigravity init
```

This launches an interactive picker where you select which agent runtimes to install. Pick one or many -- each runtime is fully standalone.

For CI/CD or non-interactive use, specify runtimes directly:

```bash
npx cfsa-antigravity init --agent claude,factory
```

## CLI

| Command | Description |
|---------|-------------|
| `cfsa-antigravity init` | Interactive multi-select runtime installer |
| `cfsa-antigravity init --agent claude,factory` | Non-interactive install of specific runtimes |
| `cfsa-antigravity status` | Check all installed runtimes + unfilled placeholders |
| `cfsa-antigravity init --force` | Overwrite existing installation |
| `cfsa-antigravity init --dry-run` | Preview what would be installed |
| `cfsa-antigravity init --path ./dir` | Install into specific directory |
| `cfsa-antigravity init --memory` | Scaffold unified `.memory/` + MCP integration |
| `cfsa-antigravity init --migrate-memory` | Scaffold unified memory and import legacy runtime memory |

### Available runtimes

Runtimes are auto-detected from the template. Currently shipped:

- **Antigravity** (`.agent/`) -- Antigravity, Cursor, Gemini CLI
- **Codex** (`.codex/`) -- Standalone Codex runtime
- **Claude Code** (`.claude/`) -- Standalone Claude Code runtime
- **Factory Droid** (`.factory/`) -- Standalone Factory Droid runtime

Each runtime is fully standalone with no cross-references. Install any combination side-by-side.

## Unified Project Memory

Every install now scaffolds a shared `.memory/` root at the project level. It is intended to be an Obsidian-friendly vault inside the project, not just an internal data folder.

```text
.memory/
├── .obsidian/   # vault config so the project memory opens cleanly in Obsidian
├── raw/         # append-only captures from hooks, sessions, and imports
├── wiki/        # human-readable compiled memory plus graph-friendly mirrors of docs/plans
├── schema/      # machine-readable index/chunk artifacts
├── mcp-server/  # shared project-local MCP daemon + per-runtime client entrypoints
├── runtime/     # daemon pid/state files
├── hooks/       # Claude hook entrypoints
└── migrate/     # legacy memory import helpers
```

The installer ships the shared memory runtime into `.memory/`, including the project-local MCP server under `.memory/mcp-server/`. Tool-specific MCP client config is intentionally **not** managed by the kit — users wire their own `.mcp.json` / editor settings for the tools they actually use. The daemon writes workspace-local runtime state into `.memory/runtime/`, and clients resolve that state before proxying requests so one workspace does not silently talk to another workspace's daemon. The semantic index writes retrieval artifacts into `.memory/schema/semantic-index.json` plus `.memory/schema/semantic-manifest.json`.

The practical contract is: point your tool at `.memory/mcp-server/client.mjs`, start the daemon for that workspace, and let the client discover the correct local daemon from `.memory/runtime/cfsa-memory-daemon.json`.

If the daemon health payload reports a different `projectRoot` than the client expects, the client now fails loudly instead of proxying requests to the wrong workspace.

### MCP client setup and first graph compile

The kit installs the **server/runtime** only. You must configure your tool's MCP client yourself.

For tools that use a workspace `.mcp.json`, point the tool at the shared server entrypoint:

```json
{
  "mcpServers": {
    "cfsa-memory": {
      "command": "node",
      "args": [".memory/mcp-server/client.mjs"]
    }
  }
}
```

This is the preferred default because the client resolves the correct workspace-local daemon from `.memory/runtime/cfsa-memory-daemon.json`.

If you need a custom host/port, use env overrides:

```json
{
  "mcpServers": {
    "cfsa-memory": {
      "command": "node",
      "args": [".memory/mcp-server/client.mjs"],
      "env": {
        "CFSA_MEMORY_HOST": "127.0.0.1",
        "CFSA_MEMORY_PORT": "4317"
      }
    }
  }
}
```

For an existing project, after wiring your MCP client, start the workspace-local daemon so it writes `.memory/runtime/cfsa-memory-daemon.json`, then trigger the initial graph/index build by running the memory compile path (`memory_compile` via MCP, or the direct compile script fallback) before opening Obsidian. Verify files like `.memory/schema/spec-graph.json` and `.memory/wiki/hubs/spec-graph.md` exist, then open Obsidian at `.memory/`.

This replaces fragmented runtime-local memory as the canonical project memory layer. Runtime-local memory files remain legacy inputs for migration.

If you are using an editor that indexes agent files for slash commands, do not hide the runtime directory you actually installed.

**Recommended Solution:**
Keep the installed runtime directory out of shared `.gitignore` rules when your tool needs to index it. Prefer `.git/info/exclude` for local-only exclusions.

Examples:
1. Antigravity install → keep `.agent/` out of `.gitignore`
2. Codex install → keep `.codex/` out of `.gitignore`
3. Claude install → keep `.claude/` out of `.gitignore`
4. Factory install → keep `.factory/` out of `.gitignore`
5. Use `.git/info/exclude` for local exclusions instead of changing shared ignore rules
   
## Get Started

```
/ideate
```

The pipeline tells you what to run next at every step. You never have to guess.

## Keeping Up to Date

The kit evolves independently of your project. To pull improvements into an existing project:

```
/sync-kit
```

This performs a **semantic merge** — it applies new workflows, skills, and rules from the upstream kit while preserving your project-specific values (tech stack, validation commands, filled placeholders). It will never overwrite your project decisions.

- First sync does a full comparison; subsequent syncs are incremental (commit-scoped)
- Tracks sync state in `.memory/pipeline/kit-sync.md` so every runtime uses the same update baseline
- Flags any structural migrations needed (e.g., ideation format changes)

## What Init Adds

A fresh `init` now installs:
- your selected runtime directories (`.agent/`, `.codex/`, `.claude/`, `.factory/`)
- `docs/`
- shared `.memory/`
- the shared memory MCP server/runtime under `.memory/mcp-server/`
- canonical kit sync state at `.memory/pipeline/kit-sync.md`
- the rest of the `.memory` scaffold needed to compile graph/index artifacts locally

Tool-specific MCP client config (such as `.mcp.json`) is user-managed and documented above.

Use `--migrate-memory` when upgrading an older installation that still has runtime-local memory you want imported into `.memory/`.

If migration finds a knowledge-file destination with different existing contents, it preserves both versions by writing a `.conflict-YYYY-MM-DD.md` sibling file for manual reconciliation.

## Documentation

| Document | Contents |
|----------|----------|
| [Pipeline Guide](docs/README.md) | Full walkthrough — every command, every stage |
| [Kit Architecture](docs/kit-architecture.md) | How the kit's internals work |

## Five Principles

1. **Constraints before decisions** — map what's decided before presenting options
2. **Exhaustive iteration over shallow speed** — no ambiguity moves forward
3. **Work shifted left** — design decisions made in spec, not in code
4. **Progressive decision locking** — each stage locks decisions for downstream
5. **TDD as the implementation contract** — Red → Green → Refactor, every slice

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to set up, make changes, and submit PRs.

## License

[MIT](LICENSE)
