# Protocol 8: Spec Pipeline Update

> Part of [Session Continuity](../SKILL.md) — read the index for overview, directory structure, and integration points.

**Invoked by**: `/write-architecture-spec`, `/write-be-spec`, `/write-fe-spec`
(after updating the layer index)

**Purpose**: Mark a spec column done and report pipeline progress.

## Steps

1. **Identify the shard and layer** — which shard just got its spec completed,
   and which layer (IA, BE, or FE)?

2. **Update `.agent/progress/spec-pipeline.md`** — change the relevant ❌ to ✅:
   ```markdown
   | 03 | user-profiles | ✅ | ✅ | ❌ |
   ```

3. **Recalculate overall progress**:
   ```markdown
   **Overall**: 8/45 specs (18%)
   ```

4. **Update "Ready for Implementation"** — if a shard now has all three specs
   complete (IA ✅ + BE ✅ + FE ✅), add it to the ready list:
   ```markdown
   ## Ready for Implementation

   Shards with all three specs complete are ready for `/plan-phase`:
   - ✅ Shard 00: API conventions
   - ✅ Shard 01: Authentication
   ```

5. **Report status** — log what was completed and what's next.
