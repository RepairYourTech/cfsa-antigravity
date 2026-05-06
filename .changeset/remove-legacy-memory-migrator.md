---
"cfsa-antigravity": major
---

Remove the legacy memory migrator entirely.

The `memory-src/migrate/` module, the `migrate-legacy.mjs` script, and the `npx cfsa-antigravity init --migrate-memory` CLI flag are gone. They imported pre-`.memory/` runtime-local memory layouts (`.claude/memory/`, `.codex/progress/memory`, `.agents/progress/memory`, `.factory/memory`, `.factory/progress/memory`) into the unified `.memory/wiki/` tree, and that compatibility surface no longer earns its keep.

Changes:

- Deleted `memory-src/migrate/migrate-legacy.mjs` and `memory-src/migrate/README.md` (and the built `template/.memory/migrate/`).
- Deleted `scripts/check-memory-migration.mjs` and dropped it from the `npm run check` chain in `package.json`.
- Removed the `--migrate-memory` flag, `migrateMemory()` helper, parse handling, usage block, and post-scaffold call from `bin/cli.mjs`.
- Removed the `migrate-legacy.mjs` required-file assertion from `scripts/check-template-integrity.sh`.
- Repointed every documentation reference to `.memory/migrate/`: `README.md`, `docs/README.md`, `docs/kit-architecture.md`, `docs/progress-state-catalog.md`, `memory-src/README.md`, `.codex/README.md`, `.claude/README.md`, plus the Obsidian `userIgnoreFilters` in `memory-src/.obsidian/app.json` and `.memory/.obsidian/app.json`.

Breaking change: anyone still on a pre-4.0 layout (runtime-local `.agent/`, `.codex/progress/memory`, etc.) must run a one-time manual import or stay on `cfsa-antigravity@5.0.0` to use `--migrate-memory`. New installs are unaffected — the unified `.memory/` scaffold is the only supported layout going forward.
