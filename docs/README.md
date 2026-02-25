# Pipeline Output Map

This directory contains all specification and planning artifacts produced by the pipeline.

## Directory Structure

| Directory | Created By | Contents |
|---|---|---|
| `plans/` | `/ideate`, `/create-prd` | Vision, architecture design, engineering standards, data placement strategy |
| `plans/ia/` | `/decompose-architecture`, `/write-architecture-spec` | IA shards (numbered `00-*.md` through `NN-*.md`) |
| `plans/ia/deep-dives/` | `/write-architecture-spec` | Deep dive documents for complex features |
| `plans/be/` | `/write-be-spec` | Backend specifications (numbered `00-*.md` through `NN-*.md`) |
| `plans/fe/` | `/write-fe-spec` | Frontend specifications (numbered `00-*.md` through `NN-*.md`) |
| `plans/phases/` | `/plan-phase` | Phase plans with vertical slices and acceptance criteria |
| `audits/` | `/audit-ambiguity`, `/validate-phase` | Ambiguity reports and phase validation results |

## Pipeline Flow

```
/ideate          → plans/vision.md
/create-prd      → plans/YYYY-MM-DD-architecture-design.md
                   plans/ENGINEERING-STANDARDS.md
                   plans/data-placement-strategy.md
/decompose-arch  → plans/ia/index.md + shard skeletons
/write-arch-spec → plans/ia/00-*.md through NN-*.md (filled)
/audit-ambiguity → audits/[layer]-ambiguity-report.md
/write-be-spec   → plans/be/00-*.md through NN-*.md
/write-fe-spec   → plans/fe/00-*.md through NN-*.md
/plan-phase      → plans/phases/phase-N.md
/validate-phase  → audits/phase-N-validation.md
```
