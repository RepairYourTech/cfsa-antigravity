---
"cfsa-antigravity": major
---

Remove the `mirror-plans.mjs` spec-mirroring system entirely.

Specs in `.memory/wiki/specs/` are now the single source of truth and ARE the vault representation. The previous mirror layer wrote slugified copies into `.memory/wiki/spec-mirrors/{ia,be,fe}/` and, due to flat slugification of nested paths, leaked duplicate copies back into the source `specs/{be,fe,ia}/` trees on subsequent compiles — producing `be-be-*`, `fe-fe-*`, and `ia-ia-*` collisions.

Changes:
- Deleted `memory-src/pipeline/mirror-plans.mjs` (and the built `template/.memory/pipeline/mirror-plans.mjs`).
- Removed all `mirrorPlansIntoVault` references from `compile.mjs` (import, call site, two summary stats).
- Repointed vault hub links in `wiki-home.md` and the generated `wiki/hubs/surfaces.md` from `spec-mirrors/{ia,be,fe}` to the canonical `specs/{ia,be,fe}/<layer>-index`.

Existing projects should run a one-time cleanup to delete `.memory/wiki/spec-mirrors/` and any in-tree mirror duplicates (files in `.memory/wiki/specs/` whose frontmatter contains `vault_primary: true`).
