> **Framework context required**: This is a protocol excerpt. Before following these steps, read `.agent/skills/session-continuity/SKILL.md` for the complete framework — including the Adaptive Granularity Rule, Level Hierarchy Reference, Frozen Files concept, and Parallel Claim protocol. Protocol files are reference documents for specific steps, not standalone instructions.

# Protocol 7: Spec Pipeline Generation

> Part of [Session Continuity](../SKILL.md) — read the index for overview, directory structure, and integration points.

**Invoked by**: `/decompose-architecture` (after creating indexes)

**Purpose**: Create a spec pipeline tracker so you always know which shards
have IA specs, BE specs, and FE specs completed.

## Steps

1. **Read the IA index** — `docs/plans/ia/index.md` — to get the list of shards.

2. **Create `.agent/progress/spec-pipeline.md`**:
   ```markdown
   # Spec Pipeline Progress

   **Project**: {{PROJECT_NAME}}
   **Last updated**: {{DATE}}
   **Overall**: 0/{{N×3}} specs (0%)

   ## Legend

   | Symbol | Meaning |
   |--------|---------|
   | `not-started` | No spec file exists yet |
   | `skeleton` | Skeleton file exists but sections are placeholder only |
   | `complete` | Spec file exists with all sections filled and approved |

   ## Shard Spec Status

   | # | Shard | File | IA Spec | BE Spec | FE Spec |
   |---|-------|------|---------|---------|---------|
   | 00 | {{shard-name}} | `docs/plans/ia/00-{{shard-name}}.md` | skeleton | not-started | not-started |
   | 01 | {{shard-name}} | `docs/plans/ia/01-{{shard-name}}.md` | skeleton | not-started | not-started |
   | ... | ... | ... | ... | ... | ... |

   ## Spec Completion Tracking

   Shards with all three specs complete (tracking only — /plan-phase requires ALL shards to be complete, not just individual ones):
   - (none yet)
   ```

   > The `File` column is populated with the expected file path at generation time (derived from the shard number and domain name). Downstream protocols use this path to verify file existence before marking a spec as `complete`.

3. **Initialize memory files** if they don't exist (same as Protocol 2, step 5).
