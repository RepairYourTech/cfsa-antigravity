---
"cfsa-antigravity": patch
---

fix: map guard auto-recovery + bootstrap provisioning enforcement

- `map-guard-protocol.md`: Auto-recoverable cells now auto-invoke `/bootstrap-agents` silently instead of hard-stopping. Hard stops reserved for genuinely unrecoverable cells.
- `bootstrap-agents.md`: Hard gate between fill (Step A) and provision (Step B) — provision is mandatory.
- `bootstrap-agents-fill.md`: Step 6 changed from conditional to mandatory — provision runs next, always.
