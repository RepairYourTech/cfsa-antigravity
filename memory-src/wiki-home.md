# Memory Vault Home

Welcome to the project's shared memory vault.

## Core notes
- [[wiki/index]] — memory index
- [[wiki/decisions]] — compiled decisions
- [[wiki/patterns]] — compiled patterns
- [[wiki/blockers]] — compiled blockers

## Graph hubs
- [[wiki/specs/ia/ia-index]] — IA specs
- [[wiki/specs/be/be-index]] — BE specs
- [[wiki/specs/fe/fe-index]] — FE specs
- [[wiki/phases]] — phase and slice notes
- [[wiki/ideation]] — ideation notes
- [[wiki/architecture]] — architecture notes
- [[wiki/audits]] — audit notes
- [[wiki/decisions]] — decision log
- [[wiki/patterns]] — pattern log
- [[wiki/blockers]] — blocker log
- [[wiki/hubs/shards]] — shard relationship hub
- [[wiki/hubs/phases]] — phase relationship hub
- [[wiki/hubs/operations]] — blocker/decision/pattern hub
- [[wiki/hubs/surfaces]] — IA/BE/FE relationship hub

## Canonical rule
- `.memory/wiki/specs/**` is the source of truth for pipeline docs
- `wiki/` also contains graph-friendly hub notes for Obsidian navigation
- runtimes should query through the shared memory daemon/client path

## Capture streams
- `raw/daily/` — daily notes
- `raw/events/` — append-only machine captures
- `raw/sessions/` — session event streams
- `raw/assets/` — attachments and supporting assets

## How to use this vault
- Open `.memory/` as an Obsidian vault
- Use `wiki/index.md` as the main navigation surface
- Treat `wiki/` as the human-readable layer
- Treat `schema/` as agent-facing derived artifacts
- Let runtimes write through the shared MCP bridge so all tools see the same memory
- Use the hub notes to traverse specs, phases, blockers, decisions, and cross-layer relationships

## MCP architecture
- shared daemon: `.memory/mcp-server/daemon.mjs`
- per-runtime MCP client entry: `.memory/mcp-server/client.mjs`
- Claude startup helper: `.memory/mcp-server/start.mjs`
- legacy stdio wrapper: `.memory/mcp-server/index.mjs`
