# memory-src

Source files for the unified `.memory/` scaffold that `npm run build` copies into `template/.memory/`.

## What lives here
- `pipeline/` — raw/wiki/schema processing utilities
- `pipeline/progress/` — canonical pipeline progress scaffold shared by all runtimes
- `mcp-server/` — stdio MCP server exposing memory tools
- `hooks/` — Claude Code hook entrypoints
- `migrate/` — legacy memory migration
- `schema/` — JSON schemas for compiled memory records

## Extension pattern
Add source files here, then run `npm run build` to regenerate `template/.memory/`.

## Conventions
- Keep day-1 implementation Node-native
- Treat `.memory/raw/` as append-only
- Only compile steps should rewrite `.memory/wiki/` or `.memory/schema/`
