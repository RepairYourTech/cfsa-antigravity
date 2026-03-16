# Ideation

Ideation output created by `/ideate` — the pipeline's source of truth for product vision, domain exploration, and feature inventory.

## Key File

`ideation-index.md` — the pipeline key file. Downstream workflows (`/create-prd`, `/decompose-architecture`, etc.) read this file to locate domains, features, and constraints.

## Structure

The ideation folder uses a **fractal folder structure** — every domain is a folder containing an index file (`*-index.md`), a cross-cut file (`*-cx.md`), and child feature `.md` files. Sub-domains are nested folders following the same pattern.

| Path | Description |
|---|---|
| `ideation-index.md` | Pipeline key file — structural classification, structure map, MoSCoW, progress |
| `ideation-cx.md` | Global cross-cuts (cross-surface interactions for multi-product projects) |
| `domains/` | Fractal domain folders — each containing index + CX + child features/sub-domains |
| `meta/` | Structured metadata — problem statement, personas, constraints, competitive landscape |

> See `docs/kit-architecture.md` Section 2 for the full tree diagram and detailed documentation.

## Completion Requirement

All domains must reach **[DEEP]** or **[EXHAUSTED]** status before `/ideate-validate` compiles the final output. Run `/audit-ambiguity ideation` to verify.

## Related Output

`docs/plans/vision.md` — human-readable executive summary compiled from this folder. Not a pipeline data source.
