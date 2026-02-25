# Protocol 2: Progress Generation

> Part of [Session Continuity](../SKILL.md) — read the index for overview, directory structure, and integration points.

**Invoked by**: `/plan-phase` step 7

**Purpose**: Create progress tracking files from a newly planned phase.

## Steps

1. **Read the phase plan** that was just created (the output of `/plan-phase`).

2. **Create or update `.agent/progress/index.md`**:
   ```markdown
   # Implementation Progress

   **Project**: {{PROJECT_NAME}}
   **Last updated**: {{DATE}}
   **Overall**: 0/{{TOTAL}} slices (0%)

   ## Phases

   | Phase | Status | Progress | Link |
   |-------|--------|----------|------|
   | Phase 1: {{NAME}} | not-started | 0/{{N}} | [→](phases/phase-01.md) |
   ```

3. **Create `.agent/progress/phases/phase-NN.md`**:
   ```markdown
   # Phase {{N}}: {{NAME}}

   **Status**: not-started
   **Progress**: 0/{{TOTAL}} slices

   ## Slices

   - [ ] **Slice 1**: {{DESCRIPTION}} ({{S|M|L}})
     - [ ] Contract: Zod schema for {{entity}}
     - [ ] `BE` API endpoints for {{entity}}
       - [ ] Subtask 1
       - [ ] Subtask 2
     - [ ] `FE` {{entity}} page and components
       - [ ] Subtask 1
       - [ ] Subtask 2
     - [ ] `QA` Integration tests for {{entity}}
       - [ ] Subtask 1
     → [log](../slices/phase-01-slice-01.md)
   ```

   **Surface tag rules for Progress Generation:**
   - Tag tasks (Level 3) with `BE`, `FE`, or `QA` as a backtick-wrapped prefix
   - Untagged tasks are sequential (handled by orchestrator before parallel dispatch)
   - `files:` blocks are NOT written during generation — only during claim (Protocol 9)
   - Subtasks under tagged tasks inherit the parent's surface ownership

4. **Create `.agent/progress/slices/phase-NN-slice-NN.md`** for each slice with ≥3 criteria:
   ```markdown
   # Phase {{P}} / Slice {{S}}: {{NAME}}

   **Status**: not-started
   **Complexity**: {{S|M|L}}

   ## Tasks
   - [ ] Contract: Zod schema for [entity]
   - [ ] `FE` [entity] page and components
   - [ ] `BE` API endpoints for [entity]

   ## Acceptance Criteria
   - [ ] Criterion 1
   - [ ] Criterion 2
   - [ ] Criterion 3

   ## Implementation Notes
   <!-- Filled during /implement-slice -->

   ## Files Changed
   <!-- List of files created/modified -->
   ```

5. **Initialize memory files** (only if they don't already exist):
   - `.agent/memory/patterns.md` — empty with header
   - `.agent/memory/blockers.md` — empty with header
   - `.agent/memory/decisions.md` — empty with header
