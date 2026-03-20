---
"cfsa-antigravity": patch
---

## Clear session-specific memory files from kit repo

### Problem
Session-specific patterns (PAT-001 through PAT-005) and decisions (DEC-001) were
committed to the reusable kit repo's `.agent/progress/memory/` files. These are
project-instance data that should never exist in the kit source — consumers would
inherit another project's session history.

### Fix
Cleared `patterns.md`, `decisions.md`, and `blockers.md` back to header-only state.
The template build already strips `.agent/progress/` content, but the source repo
itself was carrying stale session data.

### Files Changed
- `.agent/progress/memory/patterns.md`
- `.agent/progress/memory/decisions.md`
