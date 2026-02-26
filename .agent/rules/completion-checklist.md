---
description: Code plus tests plus tracking equals done — never mark complete without updating progress files
alwaysApply: true
---

# Completion Checklist

> Code complete ≠ done. Tests pass ≠ done.
> Code complete + tests pass + tracking updated = DONE.

## The Problem

Working code is only half the job of a software engineer. The other half is communicating
that work, updating shared state, releasing locks, and documenting decisions so the rest of
the team (or your future self) can understand what happened.

When an agent reports a task as "complete" without updating the progress tracking files,
it breaks the pipeline. The next agent won't know what's done, dependencies get blocked,
and the human operator loses visibility.

## The Rule

**You are never "done" just because the code works and the tests pass.**

Before concluding any workflow, task, or slice — and especially before calling `notify_user`
to report completion — you must verify you have completed the administrative checklist.

## The Definition of Done

A unit of work is only DONE when:

1. **The Code**: Implementation meets the contract and acceptance criteria.
2. **The Tests**: All tests pass (validation step is green).
3. **The Tracking**: Progress markdown files in `.agent/progress/` are updated.
   - Acceptance criteria marked `[x]`
   - Slice/Task marked `[x]`
   - Phase progress fractions updated (e.g., `3/10` → `4/10`)
   - Overall progress fractions updated
4. **The Locks**: All task claims (`[!]` flags and `files:` blocks) are removed.
5. **The Memory**: Blockers and patterns are logged to `.agent/progress/memory/`.

## Enforcement

If you are following a workflow that includes a "Completion Gate" or a checklist for
updating progress files, **you may not skip it**.

If you skip the progress tracking steps, you have failed the task, regardless of how
good the code is.
