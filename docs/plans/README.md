# Plans

Core planning artifacts live here. Created by `/ideate` and `/create-prd`.

## Expected Files

| File | Created By | Description |
|---|---|---|
| `vision.md` | `/ideate` | Human-readable executive summary — the "sales pitch" (not a pipeline data source) |
| `YYYY-MM-DD-architecture-design.md` | `/create-prd` | System design document — tech stack, architecture, data strategy, security model |
| `ENGINEERING-STANDARDS.md` | `/create-prd` | Non-negotiable quality bar — test coverage, performance targets, accessibility requirements |
| `data-placement-strategy.md` | `/create-prd` | N-tier data placement map — what each tier stores, encryption, GDPR lifecycle |

## Subdirectories

| Directory | Created By | Description |
|---|---|---|
| `ideation/` | `/ideate` | Sharded ideation output — pipeline key file (`ideation-index.md`), domain files, meta, cross-cuts |
| `ia/` | `/decompose-architecture`, `/write-architecture-spec` | Information Architecture shards |
| `be/` | `/write-be-spec` | Backend specifications |
| `fe/` | `/write-fe-spec` | Frontend specifications |
| `phases/` | `/plan-phase` | Phase plans with vertical slices |
