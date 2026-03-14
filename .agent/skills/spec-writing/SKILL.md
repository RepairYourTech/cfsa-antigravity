---
name: spec-writing
description: Methodology for writing complete, unambiguous IA, BE, and FE specification documents in the CFSA pipeline. Covers completeness testing, progressive section writing, cross-reference checking, and ambiguity gate application.
---

# Spec Writing

This skill encodes the shared writing methodology for IA, BE, and FE spec documents in the CFSA pipeline, and is invoked by all `write-*-spec-write.md` and `decompose-architecture-validate.md` workflows.

## When to Use

- Writing any IA shard, BE spec, or FE spec
- Any time the agent writes a section that will be consumed by a downstream pipeline stage
- Whenever performing a completeness self-check before proposing review

## Instructions

### 1. Progressive Section-by-Section Writing Pattern

Write one section at a time in document order. Before writing section N+1, re-read section N and verify it against the upstream source document:

- For BE specs, the upstream source is the IA shard
- For FE specs, the upstream source is the BE spec
- For IA shards, the upstream sources are `ideation-index.md` (+ domain files) and `architecture-design.md`

**Hard rules:**

- Never leave a section as a stub, a placeholder, or a "TBD" — a section boundary is a hard stop, not a TODO marker.
- If a section cannot be completed from available upstream context, trigger the ambiguity gate (Step 4) before proceeding.
- Do not advance to section N+1 until section N passes the two-implementer completeness test (Step 2).

### 2. Two-Implementer Completeness Test

After writing each section, apply this test:

> *"Would two independent, competent developers reading only this section produce the same implementation?"*

If the answer is "probably not," the section is incomplete regardless of how much text it contains.

Apply the test to each element type in turn:

- **Fields** — every field must have a type and default
- **Endpoints** — every endpoint must have success response shape and all error codes
- **State transitions** — every state transition must have a named trigger and a named outcome
- **Permissions** — every permission must identify a subject (role), an object (resource), and the allowed operation

A section passes when no element requires a developer to make an undocumented choice.

### 3. Cross-Reference Checking

After completing the full draft, perform two cross-reference passes:

#### IA → BE Pass

For every data model entity and every state transition in the IA shard, verify a corresponding BE spec section exists. For every field in an IA data model, verify it appears in a BE endpoint request or response schema or a storage schema.

Document each gap as:

```
COVERAGE GAP: IA shard [name] § [section] → no corresponding BE spec section found.
```

#### BE → FE Pass

For every BE endpoint, verify every response field is referenced in the FE spec (in a component prop, display element, or form field). Verify every error code the endpoint can return has an explicit FE handling entry (error boundary, toast, inline error state).

Document each gap as:

```
MAPPING GAP: BE endpoint [name] field [field] → not referenced in FE spec.
```

### 4. Ambiguity Gate Trigger Conditions

Hard-stop spec writing and raise to the user if any of the following are true:

**(a)** A requirement cannot be resolved from `docs/plans/ideation/ideation-index.md`, `docs/plans/architecture-design.md`, or the upstream spec document for the current layer — it is not a judgment the spec writer can make.

**(b)** Two valid, meaningfully different implementations exist for a requirement and neither is obviously more correct given the upstream context.

**(c)** A security or access control decision requires explicit product confirmation — never silently default a permission, role binding, or data exposure boundary.

When triggered, write:

```
AMBIGUITY GATE: [layer] § [section] — [requirement] — [two options if applicable] — awaiting user decision.
```

### 5. Spec Quality Rubric

A spec section is complete when all four element classes are fully specified:

**(a) Fields** — every field has name, type, nullable/optional flag, default value or "no default", and validation constraints.

**(b) Endpoints** — every endpoint has method, path, auth requirement, request schema, success response with HTTP code and body shape, and all error codes with their conditions.

**(c) State transitions** — every transition has a named trigger event, a pre-condition, a post-condition, and any side-effects (emails sent, events emitted, records written).

**(d) Permissions** — every access control rule specifies subject role, target resource, allowed operation(s), and the condition under which access is denied.

## Anti-Patterns

- **Placeholder sections** — Writing placeholder sections ("details TBD") rather than stopping at the ambiguity gate. If you cannot complete a section, trigger Step 4 — do not leave a stub.
- **End-only completeness testing** — Applying the two-implementer test only at the end rather than section-by-section. The test must be applied after every section, not as a final pass.
- **Skipping cross-reference checking** — Skipping cross-reference checking because "the layers are being written by the same session." Cross-reference checking is mandatory regardless of authorship.

## Related Skills

- **`pipeline-rubrics`** — Use when you need the formal scoring rubrics for evaluating spec quality across all five pipeline layers. The rubric in Step 5 of this skill defines *what* completeness means; `pipeline-rubrics` provides the *scoring framework* for quantifying it during audits.
- **`technical-writer`** — Use when the spec content is complete but needs clarity, structure, or formatting improvements. This skill governs *what to write*; `technical-writer` governs *how to present it* for maximum readability and consumability.
