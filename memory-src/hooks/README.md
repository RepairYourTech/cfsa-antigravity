# hooks

Claude Code hook entrypoints for unified memory capture.

## Files
- `session-start.mjs` — build context on session start
- `pre-compact.mjs` — flush before compaction
- `session-end.mjs` — flush and compile on stop/session end

## Conventions
Hooks should do fast local work and avoid long-running synchronous operations.
