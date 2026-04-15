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
2. start the workspace-local daemon so it writes `.memory/runtime/cfsa-memory-daemon.json`
3. run the initial memory compile (`memory_compile` or the direct compile fallback)
4. verify graph/index artifacts exist under `.memory/schema/` and `.memory/wiki/`

## Workspace-local routing contract
- preferred client config is just `command: node` plus `args: [".memory/mcp-server/client.mjs"]`
- `daemon.mjs` publishes `projectRoot`, `memoryRoot`, `endpoint`, and `healthUrl` into `.memory/runtime/cfsa-memory-daemon.json`
- `client.mjs` reads that runtime state for the current workspace before proxying MCP requests
- `client.mjs` validates `/health` and rejects mismatched `projectRoot` values instead of silently talking to another workspace's daemon
- host/port env can still be used when you intentionally need custom daemon startup behavior

## Extension pattern
Expose new memory capabilities by adding a tool file under `tools/` and wiring it into `index.mjs`.
