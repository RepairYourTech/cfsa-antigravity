---
"cfsa-antigravity": patch
---

## Fix: Audit-ambiguity document coverage enforcement

**Problem**: Agent running `/audit-ambiguity` on ideation layer skipped 62+ domain files by rationalizing "key synthesized documents" were sufficient. No gate enforced reading every file.

**Fix**:
- `scoring.md`: Anti-shortcut language blocking "key documents" optimization
- `audit-ambiguity-rubrics.md`: Document enumeration gate — mandatory filesystem discovery + minimum count thresholds
- `audit-ambiguity-execute.md`: Coverage counter (X/N tracking) + completeness gate that blocks report compilation if any documents were skipped

**Files changed**: `.agent/skills/pipeline-rubrics/references/scoring.md`, `.agent/workflows/audit-ambiguity-rubrics.md`, `.agent/workflows/audit-ambiguity-execute.md`
