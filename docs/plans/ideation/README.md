# Ideation

Ideation output created by `/ideate` — the pipeline's source of truth for product vision, domain exploration, and feature inventory.

## Key File

`ideation-index.md` — the pipeline key file. Downstream workflows (`/create-prd`, `/decompose-architecture`, etc.) read this file to locate domains, features, and constraints.

## Structure

| Directory | Description |
|---|---|
| `domains/` | One file per domain, created during `/ideate-discover` as domains are explored |
| `meta/` | Structured metadata — problem statement, personas, constraints, competitive landscape |
| `cross-cuts/` | Cross-cutting concern ledger, accumulated continuously during exploration |

## Completion Requirement

All domains must reach **[DEEP]** or **[EXHAUSTED]** status before `/ideate-validate` compiles the final output. Run `/audit-ambiguity ideation` to verify.

## Related Output

`docs/plans/vision.md` — human-readable executive summary compiled from this folder. Not a pipeline data source.
