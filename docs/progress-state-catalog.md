# Progress State Catalog

**Status:** canonicalized

## Canonical Path

All runtimes must read and write pipeline progress at:

```text
.memory/pipeline/progress/
```

This path owns phase progress, slice checklists, session logs, and the spec-pipeline tracker.

Kit installation sync state is also project-owned and lives at:

```text
.memory/pipeline/kit-sync.md
```

This path owns the upstream URL, last synced commit, last synced timestamp, kit version, and installed runtime list.

## Runtime Paths

The following paths are not canonical progress stores and must not be referenced by workflow, skill, rule, or instruction files as active state locations:

```text
.agent/progress/
.codex/progress/
.claude/progress/
.factory/progress/
```

These paths may appear only as legacy migration source paths.

## Audited Surfaces

| Surface | Fix Applied |
|---|---|
| Root agent guides | Repointed progress phase detection and progress tracker references to `.memory/pipeline/progress/` |
| Runtime instructions | Repointed session resumption, session close, and next-step checks to `.memory/pipeline/progress/` |
| Runtime rules | Repointed completion checklist tracking and session log requirements |
| Runtime skills | Repointed plan-phase, spec writing, session-continuity, setup, and parallel-agent progress references |
| Antigravity workflows | Repointed all progress reads/writes in workflow markdown |
| Kit architecture docs | Reclassified runtime-local progress folders as legacy migration inputs only |
| Template build/check scripts | Moved scaffold and integrity checks to `.memory/pipeline/progress/` |
| Shipped scaffold | Removed pre-shipped runtime progress folders; added `.memory/pipeline/progress/` scaffold |
| Kit sync state | Moved upstream sync baseline from runtime folders to `.memory/pipeline/kit-sync.md` |

## Intentional Legacy References

Old runtime progress paths are intentionally retained in:

- `memory-src/migrate/migrate-legacy.mjs`
- `docs/kit-architecture.md`

Those references describe migration inputs only. They are not instructions for active workflow state.
