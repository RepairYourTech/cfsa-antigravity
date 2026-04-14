# mcp-server

Stdio MCP server for the unified `.memory/` system.

## Files
- `index.mjs` — stdio JSON-RPC MCP entrypoint
- `tools/` — individual tool adapters that call the pipeline

## Ownership boundary
The kit installs the MCP **server/runtime** into the workspace. Tool-specific MCP client configuration (for example `.mcp.json` or editor-specific MCP settings) is user-managed.

## Initial bootstrap
For an existing project:
1. wire your tool's MCP client to this server entrypoint
2. run the initial memory compile (`memory_compile` or the direct compile fallback)
3. verify graph/index artifacts exist under `.memory/schema/` and `.memory/wiki/`

## Extension pattern
Expose new memory capabilities by adding a tool file under `tools/` and wiring it into `index.mjs`.
