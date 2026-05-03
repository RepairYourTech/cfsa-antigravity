# pipeline

Unified memory pipeline utilities.

## Files
- `utils.mjs` — shared filesystem and parsing helpers
- `flush.mjs` — append raw memory entries
- `ingest.mjs` — ingest legacy or external content into raw memory
- `compile.mjs` — compile raw/wiki content into derived wiki + schema outputs
- `spec-graph.mjs` — extract typed spec graph nodes/edges and Obsidian relationship hubs
- `query.mjs` — query the compiled schema/index
- `lint.mjs` — validate the scaffold and compiled outputs
- `progress/` — canonical phase, slice, session, and spec-pipeline state scaffold

## Extension pattern
Add small focused modules and keep compile/query behavior reusable by both hooks and the MCP server.
