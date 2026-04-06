---
name: tdd-workflow
description: Use this skill when writing new features, fixing bugs, or refactoring code. Enforces test-driven development with 80%+ coverage including unit, integration, and E2E tests.
---

# Test-Driven Development Workflow

This skill ensures all code development follows TDD principles with comprehensive test coverage. It is stack-agnostic — after reading the methodology below, read the language reference matching your surface's Languages column.

## When to Activate

- Writing new features or functionality
- Fixing bugs or issues
- Refactoring existing code
- Adding API endpoints
- Creating new components

## Stack-Specific References

After reading the methodology below, read the reference matching your surface's Languages column in the surface stack map (`.agent/instructions/tech-stack.md`):

| Language | Reference |
|----------|-----------|
| TypeScript / JavaScript | `references/typescript.md` |
| Python | `references/python.md` |
| Go | `references/go.md` |
| Rust | `references/rust.md` |

## Core Principles

### 1. Tests BEFORE Code
ALWAYS write tests first, then implement code to make tests pass.

### 2. Coverage Requirements
- Minimum 80% coverage (unit + integration + E2E)
- All edge cases covered
- Error scenarios tested
- Boundary conditions verified

### 3. Test Types

| Type | Scope | What to Test | Speed |
|------|-------|-------------|-------|
| **Unit** | Individual functions, pure logic, utilities | Input/output, edge cases, error paths | < 50ms each |
| **Integration** | API endpoints, DB operations, service interactions | Request/response, validation, error handling | < 500ms each |
| **E2E** | Full user flows, browser automation | Critical paths, complete workflows, UI interactions | < 30s each |

## TDD Workflow Steps

### Step 1: Write User Journeys
```
As a [role], I want to [action], so that [benefit]

Example:
As a user, I want to search for markets semantically,
so that I can find relevant markets even without exact keywords.
```

### Step 2: Generate Test Cases
For each user journey, identify test cases covering:
- **Happy path** — expected input produces expected output
- **Edge cases** — empty input, boundary values, large input
- **Error paths** — invalid input, service failures, timeouts
- **Fallback behavior** — what happens when dependencies fail

Write these as test stubs that describe the behavior but don't implement yet. See language references for syntax.

### Step 3: Run Tests (They Should Fail)
Run the test suite. All new tests should fail — this is the **Red** phase. If any pass before you've written implementation, your test isn't testing what you think it is.

### Step 4: Implement Code
Write **minimal** code to make tests pass. Don't over-engineer. Don't add features the tests don't require.

> **"Minimal" means correct, not shallow.** The implementation must be production-grade — proper error handling, type safety, input validation. "Minimal" means don't add features beyond what the tests verify, not "write the least amount of code possible regardless of quality."

### Step 5: Run Tests Again (They Should Pass)
Run the test suite. All tests should now pass — this is the **Green** phase.

### Step 6: Refactor
Improve code quality while keeping tests green:
- Remove duplication
- Improve naming
- Optimize performance
- Enhance readability
- Extract abstractions

Run tests after every refactor to ensure nothing breaks.

### Step 7: Verify Coverage
Run coverage report. Verify 80%+ coverage achieved. Identify untested paths and add tests as needed.

## Test File Organization

Tests live next to their source files:

```
source-file.ext      → source-file.test.ext     (unit tests)
route-handler.ext    → route-handler.test.ext   (integration tests)
e2e/                 → feature-name.e2e.ext     (E2E tests)
```

## Mocking Strategy

### When to Mock
- External services (APIs, databases, caches) — always in unit tests
- Time-dependent operations (dates, timers)
- Non-deterministic operations (random, UUIDs)

### When NOT to Mock
- The module under test (circular logic)
- Pure functions (just test them directly)
- Everything in integration tests (that's the point)

### Anti-Mock-Abuse Rules
1. **Never mock what you own** — if you wrote the module, test it directly
2. **One mock = one boundary** — only mock at the boundary between your code and external systems
3. **Verify mock interactions** — assert that mocked dependencies were called with correct arguments
4. **Mock return values, not internals** — mock the return value of a dependency, not its internal implementation

## Assertion Depth Rules

### ❌ Shallow Assertions (BANNED)
- `expect(result).toBeDefined()` — proves nothing about correctness
- `expect(result).toBeTruthy()` — empty arrays are truthy
- `expect(response.status).toBe(200)` alone — doesn't verify response body

### ✅ Deep Assertions (REQUIRED)
- Assert on specific field values, not just existence
- Assert on array lengths AND contents
- Assert on error messages AND error codes
- Assert on side effects (was the database actually updated?)

Every test must assert:
1. **The correct output** — specific values, not just types
2. **The correct side effects** — what changed in the system
3. **The correct error behavior** — specific error type and message

## Common Testing Mistakes

### Testing Implementation Details
❌ Don't test internal state, private methods, or how code achieves the result.
✅ Test what the user/caller observes — return values, rendered output, API responses.

### Brittle Selectors (E2E)
❌ CSS class selectors, nth-child, layout-dependent selectors.
✅ Semantic selectors: roles, labels, test IDs, visible text.

### Test Coupling
❌ Tests that depend on execution order or shared state from previous tests.
✅ Each test creates its own data and cleans up after itself.

### Testing the Framework
❌ Testing that React renders a component, or that Express routes requests.
✅ Testing YOUR logic — the behavior your code adds on top of the framework.

## Continuous Testing

- **Watch mode during development** — tests re-run on file changes
- **Pre-commit hooks** — tests must pass before commits
- **CI/CD pipeline** — full test suite runs on every push

## Best Practices

1. **Write Tests First** — Always TDD: Red → Green → Refactor
2. **One Behavior Per Test** — Focus each test on a single behavior
3. **Descriptive Test Names** — Test name should explain what behavior is verified
4. **Arrange-Act-Assert** — Clear three-part test structure
5. **Mock at Boundaries** — Only mock external dependencies
6. **Test Edge Cases** — Null, empty, boundary values, large inputs
7. **Test Error Paths** — Not just happy paths
8. **Keep Tests Fast** — Unit tests < 50ms each
9. **Clean Up After Tests** — No persistent side effects
10. **Review Coverage Reports** — Identify and close gaps

## Success Metrics

- 80%+ code coverage achieved
- All tests passing (green)
- No skipped or disabled tests without `BOUNDARY:` tracking
- Fast test execution (< 30s for unit suite)
- E2E tests cover critical user flows
- Tests catch bugs before production

---

**Remember**: Tests are not optional. They are the safety net that enables confident refactoring, rapid development, and production reliability.
