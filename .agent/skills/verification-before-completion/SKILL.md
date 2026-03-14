---
name: verification-before-completion
description: "Use when about to claim work is complete, fixed, or passing — requires running verification commands and confirming output before making any success claims. Evidence before claims, always."
version: 2.0.0
source: self
date_added: "2026-02-27"
date_rewritten: "2026-03-14"
---

# Verification Before Completion

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this response, you cannot claim it passes. Period.

## When to Apply

**Before ANY of these:**
- Claiming tests pass, build succeeds, or linter is clean
- Expressing satisfaction ("Great!", "Done!", "All good!")
- Committing, pushing, or creating a PR
- Moving to the next task or slice
- Reporting completion to the user

## The Gate

```
1. IDENTIFY → What command proves this claim?
2. RUN     → Execute it. Fresh. Complete. Not a cached result.
3. READ    → Full output. Check exit code. Count failures.
4. VERIFY  → Does the output support the claim?
5. CLAIM   → Only now may you state the result.
```

Skip any step = the claim is unverified.

## Evidence Standards

| Claim | Required Evidence | Not Sufficient |
|-------|-------------------|----------------|
| "Tests pass" | Full test output showing 0 failures | Previous run, "should pass", partial suite |
| "Build succeeds" | Build command output, exit code 0 | Linter passing (linter ≠ compiler) |
| "Lint clean" | Linter output showing 0 errors/warnings | Build passing (build ≠ lint) |
| "Bug fixed" | Reproduce original symptom → now passes | "I changed the code" |
| "Regression test works" | Red-green cycle: fail → fix → pass | Test passes once without verifying it can fail |
| "Requirements met" | Line-by-line checklist against acceptance criteria | "Tests pass" (tests may not cover requirements) |
| "Migration works" | Run migration up AND down successfully | "Schema looks correct" |

## Red-Green Verification (TDD)

When claiming a regression test is valid:

```
1. Write test
2. Run test → MUST FAIL (Red)
3. Implement fix
4. Run test → MUST PASS (Green)
5. Revert fix temporarily
6. Run test → MUST FAIL AGAIN (proves test is meaningful)
7. Restore fix
8. Run test → Passes (final confirmation)
```

If the test never fails, it proves nothing.

## Red Flags — Stop and Verify

Catch yourself if you're about to say:

| Phrase | What to Do Instead |
|--------|-------------------|
| "Should work now" | Run the command |
| "I'm confident this is correct" | Confidence ≠ evidence |
| "Looks like it should pass" | Looks ≠ verified |
| "Just this once I'll skip" | No exceptions |
| "The linter passed so the build should too" | They check different things |
| "I changed the right file" | Run the test |
| "The agent said it succeeded" | Verify independently |

## Integration with Pipeline

This skill reinforces the pipeline's `completion-checklist` rule:

1. **Code** — implementation meets the contract ← verified by tests
2. **Tests** — all pass ← verified by running them RIGHT NOW
3. **Tracking** — progress files updated ← verified by reading them
4. **Locks** — claims removed ← verified by checking

## The Bottom Line

**Run the command. Read the output. Count the failures. THEN make the claim.**

This is non-negotiable. The cost of verification is 30 seconds. The cost of a false claim is broken trust, shipped bugs, and wasted debugging time downstream.
