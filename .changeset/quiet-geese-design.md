---
"cfsa-antigravity": patch
---

Make the Claude runtime standalone instead of a thin wrapper over the Antigravity runtime.

- give `.claude` its own local `skill-library`, `progress/`, and `kit-sync.md`
- remove Claude runtime references that depended on `.agent/*` paths and parity metadata
- update build and integrity checks to validate standalone Claude behavior
- clarify docs so `.agent` and `.claude` are described as separate runtimes with distinct ownership
