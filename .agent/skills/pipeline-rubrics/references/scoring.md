# Scoring Formula

- ✅ = 0 points, ⚠️ = 0.5 points, ❌ = 1 point
- `ambiguity% = (points / applicable_checkpoints) × 100`
- Gaps found during Implementer Simulation are added directly to the punch list as ❌ items and also count toward the ambiguity score.

## Cross-Layer Consistency Checks

Run after all per-document scoring is complete, whenever the current layer is BE, FE, or the scope is `all`.

| Check | How to Verify |
|-------|---------------|
| IA → BE coverage | For each user flow in each IA shard, verify a BE endpoint exists that handles it. Orphan endpoints or uncovered flows are ❌. |
| BE → FE field mapping | For each BE response field, verify at least one FE component prop consumes it. Unmapped fields or props are ❌. |
| IA → FE access control | For each access control rule in each IA shard, verify the FE spec has corresponding conditional rendering. Missing conditional rendering is ❌. |
| Error code coverage | For each BE error code, verify the FE spec has a corresponding error state. Missing error states are ❌. |

Write all cross-layer findings to a `## Cross-Layer Consistency` section in the layer's ambiguity report.

## Document-to-Layer Mapping

| Layer | Documents to load |
|-------|-------------------|
| Ideation | `docs/plans/ideation/ideation-index.md` + `ideation-cx.md` + all `*-index.md`, `*-cx.md`, and feature `.md` files recursively under `domains/` (and `surfaces/` for multi-product projects) |
| Architecture | `docs/plans/*-architecture-design.md`, `docs/plans/ENGINEERING-STANDARDS.md` |
| IA | `docs/plans/ia/index.md` + each shard listed + `docs/plans/ia/deep-dives/*.md` (list directory; include all files present) |
| BE | `docs/plans/be/index.md` + each spec listed |
| FE | `docs/plans/fe/index.md` + each spec listed |
