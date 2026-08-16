# Development Tooling Decisions

## Tooling axes

| Tool | Question |
|------|----------|
| **Package manager / build system** | pnpm, npm, yarn, bun, cargo, go modules, pip/poetry? |
| **Test runner** | Vitest, Jest, pytest, cargo test, go test, XCTest? |
| **Linter** | ESLint, Biome, Ruff, clippy, golangci-lint? |
| **Type checker** | TypeScript (tsc), mypy, Rust compiler, Go compiler? |
| **Build command** | What builds the project for production? |

## Bootstrap keys to fire after confirmation

After the user confirms all development tooling, fire bootstrap with `PIPELINE_STAGE=create-prd` and ALL of these keys:

- `PACKAGE_MANAGER` — the confirmed package manager (e.g., `pnpm`)
- `TEST_RUNNER` — the confirmed test runner (e.g., `vitest`)
- `LINTER` — the confirmed linter (e.g., `eslint`)
- `TYPE_CHECKER` — the confirmed type checker (e.g., `tsc`)
- `TEST_COMMAND` — derived from package manager + test runner (e.g., `pnpm test`)
- `TEST_WATCH_COMMAND` — derived test watch command (e.g., `pnpm test:watch`)
- `TEST_COVERAGE_COMMAND` — derived coverage command (e.g., `pnpm test:coverage`)
- `LINT_COMMAND` — derived lint command (e.g., `pnpm lint`)
- `LINT_FIX_COMMAND` — derived lint fix command (e.g., `pnpm lint:fix`)
- `FORMAT_COMMAND` — derived format command (e.g., `pnpm format`)
- `TYPE_CHECK_COMMAND` — derived type-check command (e.g., `pnpm type-check`)
- `BUILD_COMMAND` — derived build command (e.g., `pnpm build`)
- `VALIDATION_COMMAND` — the full validation pipeline (e.g., `pnpm test && pnpm lint && pnpm type-check && pnpm build`)

This fills command placeholders in `commands.md`, `workflow.md`, `implement-slice-tdd.md`, and `validate-phase.md`.

## Validation command derivation

```
{{BUILD_TOOL}} test && {{BUILD_TOOL}} lint && {{BUILD_TOOL}} type-check && {{BUILD_TOOL}} build
```
