---
"cfsa-antigravity": patch
---

Fix `mirror-plans.mjs` recursively corrupting `.memory/wiki/specs/` source files

A prior bucket-routing regression could cause generated mirrors to be written back
into the source `wiki/specs/{ia,be,fe}/` tree. On subsequent runs the generator
would re-scan those mirrors as inputs and re-mirror them, compounding the layer
prefix each time (`be-index.md` → `be-be-index.md` → `be-be-be-index.md` …) until
the source corpus was destroyed.

Two defenses are now in place:

1. **Frontmatter skip filter** — any input file whose first ~600 chars contain
   `vault_primary: true` is treated as a generated mirror and excluded from the
   source set. Robust against future bucket-routing changes.
2. **Structural guard** — `mirrorFile()` now throws before writing if the
   destination path falls inside the specs source root. A bad `graphBucket()`
   return value can no longer silently corrupt sources.

Existing installations should run `node .memory/pipeline/mirror-plans.mjs` after
updating; `vault_primary: true` markers ensure stale mirror artifacts in the
source tree are no longer re-amplified, but operators with already-corrupted
trees should delete the offending duplicated-prefix files manually before the
first post-upgrade run.
