# Map Column Reference

Maps surface stack map columns and cross-cutting categories to the workflows that consume them.

> **How workflows use the map**: See `.agent/instructions/tech-stack.md` for the surface stack map format and resolution rules. Workflows determine their surface context (from shard directory or slice surface tag), then look up the corresponding row and column.

## Per-Surface Columns

| Column | Workflows That Consume It |
|--------|--------------------------|
| **Languages** | write-be-spec-classify, write-fe-spec-classify, implement-slice-setup, implement-slice-tdd, evolve-contract |
| **BE Frameworks** | write-be-spec-classify |
| **FE Frameworks** | write-fe-spec-classify |
| **FE Design** | write-fe-spec-classify |
| **ORMs** | create-prd-architecture, write-be-spec-classify, implement-slice-setup, verify-infrastructure, validate-phase |
| **State Mgmt** | write-fe-spec-classify, implement-slice-setup |
| **Databases** | create-prd-architecture, write-architecture-spec-design, write-be-spec-classify |
| **Unit Tests** | create-prd-compile, write-be-spec-classify, implement-slice-setup, implement-slice-tdd, evolve-contract |
| **E2E Tests** | create-prd-compile, implement-slice-tdd, validate-phase |
| **Test Cmd** | implement-slice-tdd, validate-phase, evolve-contract |
| **Validation Cmd** | implement-slice-tdd, validate-phase, evolve-contract |
| **Lint Cmd** | validate-phase |
| **Build Cmd** | validate-phase |
| **Dev Cmd** | verify-infrastructure |
| **Package Mgr** | bootstrap-agents-fill |

## Cross-Cutting Categories

| Category | Workflows That Consume It |
|----------|--------------------------|
| **Auth** | create-prd-security, write-be-spec-classify |
| **CI/CD** | create-prd-compile, decompose-architecture-structure, plan-phase-write, verify-infrastructure, validate-phase |
| **Hosting** | create-prd-architecture, decompose-architecture-structure, plan-phase-write, verify-infrastructure, validate-phase |
| **Security** | create-prd-security, write-architecture-spec-design, validate-phase |
| **API Design** | create-prd-architecture, write-architecture-spec-design, write-be-spec-classify |
| **Accessibility** | write-fe-spec-classify, write-fe-spec-write, write-architecture-spec-design, validate-phase |
| **Contract Library** | tdd-contract-first rule, implement-slice-setup |

## Surface Context Resolution

How each workflow determines which surface's row to read:

| Workflow Type | Resolution Method |
|--------------|-------------------|
| Spec-writing (`write-be-spec`, `write-fe-spec`) | Shard directory path: `docs/plans/desktop/be/` → surface `desktop`; flat `docs/plans/be/` → surface `shared` |
| Implementation (`implement-slice`) | Slice's `surface:` tag from the phase plan |
| Planning (`plan-phase`) | Iterates ALL surfaces in the map |
| Validation (`validate-phase`) | Runs per-surface commands for all surfaces |
| Cross-cutting (`verify-infrastructure`) | Uses cross-cutting table + primary surface for commands |
| Architecture (`create-prd-*`) | Map may be incomplete during these workflows — falls back to inline conversation context |
