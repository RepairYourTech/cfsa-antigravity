# mcp-server

Stdio MCP server for the unified `.memory/` system.

## Files
- `index.mjs` — stdio JSON-RPC MCP entrypoint
- `tools/` — individual tool adapters that call the pipeline

## Extension pattern
Expose new memory capabilities by adding a tool file under `tools/` and wiring it into `index.mjs`.
