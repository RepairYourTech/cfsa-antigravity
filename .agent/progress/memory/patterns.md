# Semantic Patterns

### PAT-001: Always-on rules are the only reliable enforcement mechanism (2026-03-19)
- **Type**: best-practice
- **Confidence**: 0.7 (first occurrence)
- **Context**: Agent behavior control — rules vs instructions vs workflows
- **Pattern**: If a behavior MUST happen, put it in a rule file (always pre-loaded). Instructions and skill protocols are voluntary reads and will be skipped under pressure.
- **Source**: Kit self-reconstruction analysis — memory files were empty despite workflow.md Step 5 saying MANDATORY

### PAT-002: GEMINI.md is the single most powerful control surface (2026-03-19)
- **Type**: best-practice
- **Confidence**: 0.7 (first occurrence)
- **Context**: Agent context loading order — GEMINI.md is the first project-specific content seen
- **Pattern**: Critical behavioral directives belong in GEMINI.md, not in instruction files that require active reads. GEMINI.md frames everything downstream.
- **Source**: User-guided analysis of agent context processing order

### PAT-003: 12K character limit constrains rule and workflow design (2026-03-19)
- **Type**: best-practice
- **Confidence**: 0.5 (first occurrence)
- **Context**: Antigravity rules and workflows are capped at 12,000 characters each
- **Pattern**: Keep rules focused on enforcement triggers, not detailed procedures. Reference skills/protocols for the detailed how-to. GEMINI.md was already over 12K before the reconstruction.
- **Source**: Antigravity docs screenshots + GEMINI.md trimming during reconstruction

### PAT-004: Batch questioning overwhelms users and obscures priorities (2026-03-19)
- **Type**: anti-pattern
- **Confidence**: 0.7 (user correction)
- **Context**: Any workflow or interaction that involves questions — ideation, PRD, ambiguity resolution
- **Pattern**: NEVER ask multiple questions at once. One question at a time, with options, pros/cons, and a recommendation. This applies to both user-facing AND internal reasoning.
- **Source**: User correction — "batch questioning is not allowed, always ask questions one at a time"
