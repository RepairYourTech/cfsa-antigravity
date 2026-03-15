# Protocol 11: Parallel Synthesis

Run after all parallel agents have completed and QA-GREEN has passed.

## Pre-Synthesis Plan

Before beginning any synthesis work, write a `## Synthesis Plan` section to the slice file (`.agent/progress/slices/phase-NN-slice-NN.md`) listing:
- All `// BOUNDARY:` stubs found across agent outputs (file path + stub description)
- All cross-surface integrations to wire (e.g., "BE auth middleware → FE token refresh handler")

This gives you a checklist to resume from if the session is interrupted during synthesis.

## Synthesis Steps

1. **Verify no file conflicts** — confirm no file was modified by multiple agents
2. **Resolve `// BOUNDARY:` stubs** — agents may have created boundary stubs for frozen files (contracts, config). Resolve these now:
   - Update shared contracts if needed
   - Install any new dependencies
   - Wire cross-surface integrations
3. **Run full validation** — run `{{VALIDATION_COMMAND}}` after synthesis
4. **Create synthesis report** per the `parallel-agents` skill (Synthesize step)
