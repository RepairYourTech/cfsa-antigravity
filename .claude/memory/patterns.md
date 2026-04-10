# Patterns

Capture repeatable best practices and anti-patterns discovered during execution.

## Entry format

### PAT-001: [Short description] (YYYY-MM-DD)
- **Type**: best-practice | anti-pattern
- **Confidence**: 0.5
- **Context**: Where this applies
- **Pattern**: What to do (or avoid)
- **Source**: What triggered this entry

### PAT-001: Make `.claude` standalone, not a `.agent` wrapper (2026-04-10)
- **Type**: anti-pattern
- **Confidence**: 0.5
- **Context**: When porting or mirroring Antigravity functionality into the Claude runtime for this kit
- **Pattern**: Do not treat `.claude` as a thin adapter over `.agent`. Claude assets, runtime state, and skill library ownership must live under `.claude/`, with parity/build checks handled as maintainer safeguards rather than runtime dependency.
- **Source**: User correction after `.claude` was implemented as a wrapper that depended on `.agent`

### PAT-002: Verify standalone runtime by build, integrity check, and `.agent` reference scan (2026-04-10)
- **Type**: best-practice
- **Confidence**: 0.5
- **Context**: When changing Claude runtime structure or decoupling Claude assets from Antigravity assets
- **Pattern**: Validate the standalone Claude runtime with `npm run build`, `./scripts/check-template-integrity.sh`, and a direct search for `.agent/` references under `.claude/`.
- **Source**: This standalone `.claude` migration work
