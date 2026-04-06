---
name: cross-layer-consistency
description: Systematic methodology for verifying that IA, BE, and FE specification layers are mutually consistent. Covers coverage matrices, field mapping checks, error code propagation, access control consistency, and data contract drift detection.
---

# Cross-Layer Consistency

This skill provides the systematic consistency verification pass run by `audit-ambiguity-execute`, `remediate-pipeline-execute`, `propagate-decision-scan`, and `evolve-feature-cascade`, and its output is a set of labeled consistency issues with layer attribution.

## When to Use

- After all three spec layers (IA, BE, FE) have at least one document written
- As part of every audit, every remediation, every decision propagation, and every feature evolution cascade
- As a standalone pre-gate check before advancing any pipeline stage

## Instructions

### 1. IA → BE Coverage Matrix

Open `docs/plans/ia/index.md` to enumerate all IA shards. For each shard, read its data model and state transition sections. Then open `docs/plans/be/` and verify:

- Every IA data model entity has a corresponding BE spec section describing its schema, storage contract, and CRUD operations.
- Every IA state transition has a corresponding BE endpoint that drives it.
- Every IA user action (described in the interactions section) has a corresponding API contract in the BE spec.

Build a coverage table:

| IA Shard | IA Section | BE Spec Section | Status |
|----------|-----------|-----------------|--------|
| [name]   | [section] | [BE section]    | ✅ / ❌ |

Document each gap as:

```
COVERAGE GAP: IA shard [name] § [section] → no corresponding BE spec section found.
```

### 2. BE → FE Field Mapping Check

For every BE endpoint documented in `docs/plans/be/`, enumerate all response fields. For each field, verify it appears in `docs/plans/fe/` — in a component prop definition, a display element, a table column, or an explicit "field not rendered" exclusion.

Then for each FE component, verify every input prop maps to a BE request field.

Build a mapping table:

| BE Endpoint | Field | FE Spec Location | Status |
|-------------|-------|-------------------|--------|
| [endpoint]  | [field] | [FE location]   | ✅ / ❌ |

Document each gap as:

```
MAPPING GAP: BE endpoint [name] field [field] → not referenced in FE spec.
```

### 3. Error Code Consistency Cross-Reference

Build an error code table across layers: for every HTTP status code and application error type defined in BE specs, create a row. Then for each row, identify the FE spec location that handles it (error boundary, toast handler, inline error state, retry logic).

| BE Endpoint | Error Code | FE Handler | FE Spec Location | Status |
|-------------|-----------|------------|-------------------|--------|
| [endpoint]  | [code]    | [handler]  | [location]        | ✅ / ❌ |

Any BE error code with no corresponding FE entry is a gap. Document as:

```
CONSISTENCY ISSUE: BE § [endpoint] error [code] ↔ FE — no handling found — remediation: add [code] handler to [FE spec section].
```

### 4. Access Control Propagation Check

For every access control rule defined in IA shards (role-resource-operation triplets), verify the rule appears in both:

- **BE**: as a middleware guard, route-level permission check, or explicit authorization step in the endpoint contract.
- **FE**: as a conditional render, route guard, or disabled state on the triggering UI element.

A rule missing from either layer is a gap. Document as:

```
CONSISTENCY ISSUE: IA § [access control section] permission [role→resource:operation] ↔ [BE or FE] — not found — remediation: add guard to [target layer § section].
```

### 5. Data Contract Drift Detection

When invoked in the context of a schema change (e.g., after `evolve-contract` or a `propagate-decision` run), scan all files under `docs/plans/` for references to the changed type, field name, or validation rule. Check for:

- Field name string matches
- Type annotation references
- Validation rule references

For each file that references the old definition and has not been updated, document as:

```
CONSISTENCY ISSUE: [source layer] § [section] ↔ [target file] § [section] — [field/type] changed in source but not reflected in target — remediation: update [target] to match [source].
```

### 6. Documenting Inconsistencies

All consistency issues must be written using this exact format:

```
CONSISTENCY ISSUE: [source layer] § [section] ↔ [target layer] § [section] — [what is inconsistent] — [remediation: update [target] to match [source] OR raise for user decision]
```

- **Source layer** is the authoritative layer (the one that should not change).
- **Target layer** is the one that needs updating.
- When it is unclear which layer is authoritative, write `raise for user decision` as the remediation and present both versions to the user. Never silently pick one.

## Anti-Patterns

- **One-direction-only checking** — Checking only one direction of the matrix (IA→BE but not BE→IA). Coverage gaps exist in both directions.
- **Skipping the error code table** — Skipping the error code table because "the FE will just show a generic error." Every BE error code must have an explicit FE handling specification.
- **Treating access control propagation as optional** — Treating access control propagation as optional when the spec "looks simple." Missing FE route guards are a security gap, not a style preference.

## Related Skills

- **`resolve-ambiguity`** — Hand off to `resolve-ambiguity` when a consistency issue cannot be resolved by simply updating the target layer to match the source. Specifically: when both layers present plausible but conflicting definitions and it is unclear which is authoritative, or when the inconsistency reveals a gap that requires new information from the user. This skill detects *what is inconsistent*; `resolve-ambiguity` determines *what the correct answer should be* through its tiered information-gathering methodology.
