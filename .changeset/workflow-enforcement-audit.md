---
"cfsa-antigravity": patch
---

## Workflow Enforcement Audit — Write Verification Gates

### Problem
Four workflows had steps that wrote to critical pipeline files but lacked verification
gates to confirm the writes actually happened. An agent could silently skip writing meta
files, constraint files, CX entries, or spec sections, and no downstream step would catch
the gap until much later in the pipeline.

### Fix
Added 4 blocking gates across 3 workflow files:

1. **`ideate-discover.md`** — Meta files gate: verifies `problem-statement.md`, `personas.md`,
   `competitive-landscape.md` exist and are non-empty after problem exploration
2. **`ideate-discover.md`** — CX coverage check: verifies CX entries exist when 2+ domains
   have Must Have features (catches silent CX Decision Gate skipping)
3. **`ideate-validate.md`** — Constraint file gate: verifies `constraints.md` exists with at
   least one entry before proceeding to `/create-prd-stack`
4. **`write-architecture-spec-design.md`** — Section completeness gate: verifies all required
   spec sections have content before requesting user approval

### Files Changed
- `.agent/workflows/ideate-discover.md`
- `.agent/workflows/ideate-validate.md`
- `.agent/workflows/write-architecture-spec-design.md`
