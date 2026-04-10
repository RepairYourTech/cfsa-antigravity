# Decisions

Capture non-trivial decisions with downstream impact.

## Entry format

### DEC-001: [Decision summary] (YYYY-MM-DD)
- **Problem**: What needed deciding
- **Options considered**: At least 2
- **Decision**: What was chosen and why
- **Downstream**: What this affects
- **Reversibility**: High | Medium | Low

### DEC-001: `.claude` owns its own runtime assets and state (2026-04-10)
- **Problem**: `.claude` was coupled to `.agent` through symlinked skill-library content, `.agent/*` runtime references, and parity enforcement that made Claude non-standalone.
- **Options considered**: Keep `.agent` as the canonical runtime backing for Claude; make `.claude` fully standalone while preserving build/check safeguards.
- **Decision**: Make `.claude` self-contained. Runtime assets, progress state, and sync state now live under `.claude/`, while build/integrity scripts enforce standalone Claude invariants instead of `.agent` parity requirements.
- **Downstream**: Affects `.claude` workflows, instructions, session continuity protocols, skill provisioning, template build behavior, and integrity verification.
- **Reversibility**: Medium
