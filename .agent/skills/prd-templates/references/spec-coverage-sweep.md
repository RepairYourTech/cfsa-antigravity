# Spec Coverage Sweep

Verifies that a phase's implementation delivered what the specs required — not just that tests pass.

## Procedure

For each slice in the phase plan (`docs/plans/phases/phase-N.md`):

### FE Spec Coverage

1. Read the slice's acceptance criteria
2. Identify the FE spec(s) referenced by this slice (via the FE spec's `## Source Map`)
3. For each named user flow in the relevant FE spec `## Interaction Specification` section that belongs to this slice:
   - Verify a test exists in the test suite that covers this flow by name or by its acceptance criterion
   - Verify the flow is implemented (not stubbed with `BOUNDARY:`) unless a valid boundary stub exists with a tracking issue

### BE Spec Coverage

4. Identify the BE spec section(s) for each endpoint in this slice
5. For each endpoint:
   - Verify every Zod-validated field in the BE spec has a corresponding test
   - Verify every error code defined in the BE spec has a corresponding test
   - Verify every auth rule (role, ownership check) defined in the BE spec has a corresponding permission test

### IA Shard Coverage

6. For each slice, identify which IA shard(s) the slice's features originate from (using either the phase plan's domain references or the FE spec's `## Source Map`). For each identified IA shard:
   - Read the shard's `## Accessibility` section (surface-conditional: apply only for `web`, `mobile`, or `desktop` surfaces). For each accessibility requirement, verify a corresponding test exists (e.g., axe-core check, keyboard navigation test, screen reader label test).
   - Read the shard's acceptance criteria or testability section (look for Given/When/Then format or numbered acceptance criteria). For each criterion, verify it maps to at least one named test in the test suite.
   - Flag any IA criterion with no test coverage as an uncovered item — apply the hard-stop rule below.

## Hard Stop Rule

If any flow, field, error code, auth rule, IA acceptance criterion, or accessibility requirement has no corresponding test:

> ❌ STOP — Do not mark this phase as complete. List the uncovered items. Either write the missing tests and re-run `{{TEST_COMMAND}}`, or if the item was genuinely deferred (valid boundary stub + tracking issue), document the deferral explicitly in the phase validation report.

## Pass Criteria

Every named user flow, BE endpoint field, error code, auth rule, IA acceptance criterion, and accessibility requirement in the phase's scope has a corresponding passing test or a documented valid boundary stub.

## Report Section

Update report (`docs/audits/phase-N-validation.md`): Add a `## Spec Coverage` section listing the sweep results — covered items, uncovered items, boundary stubs, accessibility coverage, IA testability trace results, and the pass/fail verdict.
