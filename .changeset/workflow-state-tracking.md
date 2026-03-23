---
"cfsa-antigravity": patch
---

fix: add workflow state tracking to survive context truncation in /create-prd

**Problem**: Context truncation during `/create-prd` destroys process memory — the agent knows what was decided but not where it is in the workflow or what to do next. Synthesis steps get silently skipped and `source-before-ask` has no enforcement gate.

**Fix**:

- **`workflow-checkpoint-protocol.md`** [NEW]: Shared reference defining checkpoint file format (`docs/plans/prd-working/workflow-state.md`), write/read triggers, resumption logic, and a hard synthesis verification gate that prevents user-facing output until synthesis is written.
- **`create-prd.md`**: Parent orchestrator now initializes checkpoint directory, reads checkpoint state during shard failure recovery (showing exact step/item/action), and cleans up the checkpoint file after the quality gate passes.
- **`create-prd-stack.md`**: Added Step 2.4 (checkpoint resumption on entry), step 5 (synthesis verification gate — hard stop if `synthesis_written: false`), and step 10 (checkpoint update per completed axis with next-axis pending reads).
- **`create-prd-design-system.md`**: Checkpoint resumption after ideation context loading, checkpoint update at shard completion marking all 7 decisions.
- **`create-prd-architecture.md`**: Checkpoint resumption after ideation context reload, checkpoint update at shard completion.
- **`create-prd-security.md`**: Checkpoint resumption after ideation context reload, checkpoint update at shard completion.
- **`create-prd-compile.md`**: Checkpoint resumption after map guard, checkpoint update before final output presentation.
