# Architectural Decisions

### DEC-001: Fix enforcement from strongest layer down (2026-03-19)
- **Problem**: Agent never writes to memory files, doesn't detect pipeline phase, skips skills
- **Options considered**: (1) Fix workflows only, (2) Fix GEMINI.md + rules only, (3) Fix all tiers top-down
- **Decision**: Top-down — rules first (always-on), then GEMINI.md, then workflows, then skills
- **Downstream**: All future workflows inherit completion gates; memory-capture rule fires on every conversation
- **Reversibility**: High — each tier is independent
