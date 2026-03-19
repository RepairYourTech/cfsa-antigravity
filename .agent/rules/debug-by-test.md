---
description: Failing test before any fix — reproduce the bug first, then fix it
trigger: always_on
---

# Debug-by-Test

> Reproduce first. Fix second. Never touch production code until you have a failing test that proves the bug exists.

## The Rule

**When a bug, error, or unexpected behavior is encountered:**

1. **STOP.** Do not touch the source code.
2. **Write a failing test** that reproduces the exact bug.
3. **Run it.** Confirm it fails for the right reason.
4. **Now fix the code.** Make the failing test pass.
5. **Run all tests.** Confirm nothing else broke.

This is non-negotiable. No "I can see the problem, let me just fix it."

## Why

| Without this rule | With this rule |
|---|---|
| You guess at the fix, change code, hope it works | You prove the bug exists before touching anything |
| "Fixed" bugs silently reappear | The test catches regressions forever |
| You fix the symptom, not the cause | The test forces you to understand the actual behavior |
| No proof the fix works | Green test IS the proof |

## Applies To

| Scenario | What To Do |
|----------|-----------|
| User reports a bug | Write a test reproducing it → fix → green |
| Test failure during development | Isolate with a minimal test → fix → green |
| Unexpected runtime error | Write a test triggering the error → fix → green |
| "This isn't working right" | Write a test showing the wrong behavior → fix → green |
| Spec/workflow bug (non-code) | Document the expected vs actual behavior before changing the spec |

## What Gets Flagged

| Pattern | Verdict |
|---------|---------|
| Changing source code before writing a failing test | ❌ Rejected. Write the test first. |
| "I can see the issue, let me fix it quickly" | ❌ Rejected. Quick fixes skip understanding. |
| Writing a test AFTER the fix to prove it works | ❌ Rejected. That's backwards — you don't know what you actually fixed. |
| Failing test → source fix → all tests green | ✅ Correct. |
| Non-code bug → document expected vs actual → then fix | ✅ Correct. |
