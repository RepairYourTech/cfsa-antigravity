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

   ## Shard Spec Status

   | # | Shard | IA Spec | BE Spec | FE Spec |
   |---|-------|---------|---------|---------| 
   | 00 | {{shard-name}} | ❌ | ❌ | ❌ |
   | 01 | {{shard-name}} | ❌ | ❌ | ❌ |
   | ... | ... | ... | ... | ... |

   ## Spec Completion Tracking

   Shards with all three specs complete (tracking only — /plan-phase requires ALL shards to be complete, not just individual ones):
   - (none yet)
   ```

3. **Initialize memory files** if they don't exist (same as Protocol 2, step 5).
