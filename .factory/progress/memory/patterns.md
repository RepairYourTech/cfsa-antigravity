# Semantic Patterns

### PAT-001: Create-PRD shards ignoring ideation source documents (2026-03-20)
- **Type**: anti-pattern
- **Confidence**: 0.9
- **Context**: When create-prd shards run in separate conversations, they lose the ideation context loaded by the orchestrator. They then make architecture/security/tech decisions based solely on `architecture-draft.md` (their own compressed output) instead of the actual ideation domain files, deep dives, and CX files.
- **Pattern**: AVOID — every create-prd shard must independently reload ideation context. A MoSCoW bullet summary is never sufficient context for a tech stack, architecture, or security decision. The agent must read domain indexes and deep dives relevant to the decision axis.
- **Source**: User correction — agent recommended AI framework without ever reading the diagnostic engine deep dives that described multi-agent architecture, graph-driven diagnostics, and BYOK patterns. Fixed by adding mandatory ideation context reload steps to all 5 create-prd shards.
