# Slice Depth Floor

**Purpose**: Define the minimum depth a slice must have, derived from the specs it covers. This document is the authoritative source for two gates:

1. **Plan-phase floor** (`/plan-phase-write` Step 4) — minimum acceptance-criteria count per slice, computed from spec breadth. Refuses to plan a shallow slice.
2. **Implement-slice floor** (`/implement-slice-tdd` Step 5) — minimum delivered test count per slice, computed from the same formula. Refuses to mark a slice complete if test depth is below the floor.

The floor is **derived from the specs the slice references** — not invented, not estimated, not negotiable. If the specs are too thin to produce a meaningful floor, the spec is wrong and must be deepened first (see `write-be-spec-write` § Pass 4 and `write-fe-spec-write` § Pass 5).

---

## The Formula

For a single slice, the **expected criteria/test count** is the sum of every item below that the slice's referenced spec sections produce. Count each item exactly once.

### BE-derived items (per BE spec section the slice covers)

| Item | What to Count |
|------|---------------|
| **Happy-path** | 1 per endpoint covered by the slice |
| **Field validation** | 1 per validated request field × constraint (e.g., `email` with `required` + `format` + `maxLength` = 3) |
| **Field validation messages** | 1 per distinct error message a validator can produce |
| **Error codes** | 1 per error code defined in the BE spec for those endpoints (`4xx`, `5xx` differentiated) |
| **Authorization** | 1 per role × endpoint combination defined in the BE spec's `## Access Control` (including the deny case for unauthorized roles) |
| **Ownership / scoping** | 1 per ownership rule (e.g., user can only read their own records) |
| **Idempotency / concurrency** | 1 per idempotency or race-condition rule from BE Pass 2 (sequencing & concurrency) |
| **Failure cascade** | 1 per rollback or transaction-boundary rule from BE Pass 3 |
| **Rate limiting** | 1 per rate-limit rule defined for the endpoint (boundary test that asserts the limit triggers) |

### FE-derived items (per FE spec component/flow the slice covers)

| Item | What to Count |
|------|---------------|
| **States** | 1 per distinct UI state per data-fetching component: `idle`, `loading`, `error` (per error class), `empty`, `success`, `optimistic-pending`, `optimistic-rollback` (only count states the spec actually defines) |
| **Role variants** | 1 per non-trivial cell in the component's role × feature matrix (every `hidden`, `locked`, `read-only` cell in addition to `full`) |
| **Responsive variants** | 1 per breakpoint that changes interaction (not just layout) — e.g., touch swipe replacing drag |
| **Form fields** | 1 per form field × validation rule (mirrors BE field validation but exercised through the UI) |
| **Navigation** | 1 per route guard, deep-link entry, browser-back behavior, and multi-tab scenario defined in FE Pass 3 |
| **Accessibility** | 1 per row in the component's accessibility inventory (WCAG criterion + keyboard binding + screen-reader behavior count as one row) |
| **Network degradation** | 1 per loading-threshold/retry/timeout rule from FE Pass 2 |

### IA-derived items (per IA shard section the slice's domain references)

| Item | What to Count |
|------|---------------|
| **Edge cases** | 1 per `## Edge Cases` item in the IA shard relevant to this slice |
| **Acceptance criteria** | 1 per Given/When/Then in the IA shard's testability section relevant to this slice |
| **Junior/age-restricted rules** | 1 per content-gating rule that affects this slice |

---

## Computing the Floor

```
floor(slice) = sum(all items above for every spec section the slice references)
```

Annotate each slice in the phase plan with its computed floor and the breakdown:

```markdown
### Slice 3: Submit entity claim form
**Spec depth floor**: 18 criteria
  - BE 04-entities §3.2: 1 happy + 4 fields × 2 constraints + 5 error codes + 3 roles + 2 ownership = 19 → adjusted 14 (deny-case overlaps)
  - FE 04-entity-claim §EntityClaimForm: 5 states + 1 role variant + 4 form fields + 2 a11y = 12 → adjusted 4 (form fields overlap with BE)
  - IA 04-entities §Edge Cases: 0 relevant
**Floor total**: 18
```

The acceptance criteria written in `/plan-phase-write` Step 4 must equal or exceed this floor. The delivered test count in `/implement-slice-tdd` Step 5 must equal or exceed this floor.

---

## Spec Thinness Detection

If any spec section the slice references produces **zero items** in a category where items would be expected for the type of work the slice does, the spec is too thin. Apply the rule:

| Slice Type | Required Non-Zero Categories |
|------------|------------------------------|
| Any BE endpoint slice | happy-path, field validation, error codes, authorization |
| Any FE data-fetching slice | states (≥3: loading, error, success), accessibility (≥1) |
| Any FE form slice | states, form fields × validation, accessibility |
| Any role-conditional slice | role variants (≥1) |

If a required category is zero:

> ❌ **STOP** — Slice "[name]" references spec section [BE/FE/IA §...] which produces 0 [category] items. The spec is too thin to produce a meaningful slice. Run `/resolve-ambiguity` on the spec before planning this slice. Do not write acceptance criteria from a thin spec — that produces shallow code.

---

## Rationale

Without this floor, slice depth is bounded by the implementer's interpretation of "what's a reasonable test count." Two implementers can read the same FE spec and produce 3 vs 12 tests and both feel justified. The floor turns a subjective bound into a deterministic count derived from spec content.

Without this floor, the pipeline can produce passing tests for shallow slices that omit half the spec's validation rules, error cases, or role variants — and the existing "tests pass" gate green-lights it. The floor closes that loophole.

The floor is **not a maximum**. Implementers may exceed it. It is the minimum below which a slice is structurally shallow regardless of how many tests pass.
