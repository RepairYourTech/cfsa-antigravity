---
name: Testing Strategist
description: Design and implement comprehensive testing strategies. Use when setting up tests, choosing test types, implementing TDD, or improving code quality. Covers unit tests, integration tests, E2E tests, test-driven development, and testing best practices.
version: 1.0.0
---

# Testing Strategist

Test the right things at the right level — write tests that give you confidence to ship.

## Stack-Specific References

After reading the methodology below, read the reference matching your surface's Languages column in the surface stack map (`.agent/instructions/tech-stack.md`):

| Language | Reference |
|----------|-----------|
| TypeScript / JavaScript | `references/typescript.md` |
| Python | `references/python.md` |
| Go | `references/go.md` |
| Rust | `references/rust.md` |

## Core Principle

**The Testing Pyramid:** 70% unit tests, 20% integration tests, 10% E2E tests.

Tests should be:

- **Fast** — Run in milliseconds (unit) to seconds (integration) to minutes (E2E)
- **Isolated** — Test one thing at a time
- **Repeatable** — Same input = same output
- **Self-checking** — Pass/fail automatically, no manual verification
- **Timely** — Written alongside code (or before, with TDD)

---

## The Testing Pyramid

```
           /\
          /  \         E2E Tests (10%)
         /----\        - Slow, brittle, expensive
        /      \       - Test critical user journeys
       /--------\      - Example: "User can complete checkout"
      /          \
     /------------\    Integration Tests (20%)
    /              \   - Medium speed, test components together
   /----------------\  - Example: "API endpoint returns correct data"
  /                  \
 /--------------------\ Unit Tests (70%)
/______________________\ - Fast, isolated, test functions/components
                        - Example: "calculateTotal returns sum"
```

### Why This Ratio?

- **Unit tests:** Fast feedback, pinpoint bugs precisely, easy to maintain
- **Integration tests:** Ensure components work together, catch interface issues
- **E2E tests:** Verify actual user flows, catch UI bugs, but slow and brittle

---

## Level 1: Unit Tests (70%)

### What to Test

Test individual functions, components, or classes in isolation.

**Good candidates:**

- ✅ Business logic functions (calculations, validation, transformations)
- ✅ Utility functions (formatting, parsing, etc.)
- ✅ UI components (rendering, props, state)
- ✅ Pure functions (same input = same output)

**Skip:**

- ❌ Third-party libraries (assume they work)
- ❌ Framework internals
- ❌ Simple getters/setters with no logic

### Unit Test Best Practices

✅ **Do:**

- Test behavior, not implementation
- Use descriptive test names
- Follow AAA pattern: Arrange, Act, Assert
- Test edge cases (empty, null, negative, boundary values)
- Keep tests simple and readable

❌ **Don't:**

- Test private methods directly
- Over-mock (makes tests brittle)
- Test framework internals
- Write tests that depend on other tests

---

## Level 2: Integration Tests (20%)

### What to Test

Test multiple units working together — typically API routes, database operations, or service integrations.

**Good candidates:**

- ✅ API endpoints (request → handler → database → response)
- ✅ Database operations (queries, transactions)
- ✅ Third-party integrations (payment, email, etc.)
- ✅ Authentication flows
- ✅ File upload/download

### Integration Test Best Practices

✅ **Do:**

- Use test database (separate from development/production)
- Clean up test data before/after each test
- Test happy path + error cases
- Test authentication/authorization
- Use factories/fixtures for test data

❌ **Don't:**

- Test against production database
- Leave test data behind
- Mock database (defeats purpose of integration test)
- Depend on external services (mock external APIs)

---

## Level 3: E2E Tests (10%)

### What to Test

Test complete user journeys through the actual UI.

**Good candidates:**

- ✅ Critical user flows (signup, login, checkout)
- ✅ Core business processes
- ✅ Multi-step workflows

**Skip:**

- ❌ Every possible UI interaction (too slow/brittle)
- ❌ Edge cases (cover with unit/integration tests)

### E2E Test Best Practices

✅ **Do:**

- Test critical paths only (< 20 tests)
- Use stable selectors (test IDs, roles, labels — not CSS classes)
- Run in CI/CD pipeline
- Test across browsers if web surface
- Take screenshots on failure

❌ **Don't:**

- Test every UI variation
- Use fragile selectors (nth-child, CSS classes)
- Run E2E tests on every commit (too slow)
- Ignore flaky tests (fix or remove them)

---

## Test-Driven Development (TDD)

### The Red-Green-Refactor Cycle

1. **Red:** Write a failing test that defines expected behavior
2. **Green:** Write minimal code to make it pass
3. **Refactor:** Improve code while keeping tests green

### When to Use TDD

**Good for:**

- ✅ Complex business logic
- ✅ Bug fixes (write test that reproduces bug first)
- ✅ Well-defined requirements
- ✅ Critical algorithms

**Skip for:**

- ❌ Exploratory coding (don't know requirements yet)
- ❌ Throwaway prototypes
- ❌ Simple CRUD operations

---

## Mocking Strategies

### When to Mock

- ✅ External APIs (slow, unreliable, cost money)
- ✅ Time/randomness (make tests deterministic)
- ✅ File system operations
- ✅ Database (in unit tests only — NEVER in integration tests)

### Anti-Mock-Abuse Rules

1. **Never mock what you own** — if you wrote the module, test it directly
2. **One mock = one boundary** — only mock at the boundary between your code and external systems
3. **Verify mock interactions** — assert that mocked deps were called with correct arguments
4. **Mock return values, not internals** — mock the return value, not the internal implementation

### Mocking Best Practices

✅ **Do:**

- Mock at boundaries (APIs, file system, network)
- Restore mocks after tests
- Make mocks realistic (same shape as real data)

❌ **Don't:**

- Over-mock (makes tests brittle and meaningless)
- Mock your own code (test real behavior)
- Leave mocks unreset between tests

---

## Assertion Depth Rules

### ❌ Shallow Assertions (BANNED)

Assertions that prove nothing about correctness:
- "Result is defined" — undefined would also be defined
- "Result is truthy" — empty arrays and objects are truthy
- "Status is 200" alone — doesn't verify response body

### ✅ Deep Assertions (REQUIRED)

Every test must assert:
1. **The correct output** — specific values, not just types
2. **The correct side effects** — what changed in the system
3. **The correct error behavior** — specific error type and message

---

## Code Coverage

### Coverage Targets

- **70% minimum** — Below this, you're missing important tests
- **80% good** — Solid coverage of critical paths
- **90%+ diminishing returns** — Chasing 100% often not worth it

### What to Focus On

**High priority (90%+ coverage):**

- Business logic
- Authentication/authorization
- Payment processing
- Data validation

**Medium priority (70%+):**

- API routes
- Database queries
- Utility functions

**Low priority (okay to skip):**

- UI components (test behavior, not rendering)
- Configuration files
- Type definitions

---

## Common Testing Patterns

### Testing Async Code
Write tests that properly wait for async operations to complete before asserting. Use your framework's async test utilities.

### Testing Error Handling
Mock dependencies to throw errors, then assert your code handles them correctly — shows the right error message, returns the right status code, logs appropriately.

### Testing Forms
Fill form fields programmatically, submit, and assert both the submission data and any validation errors.

---

## Test Organization

### File Structure

Tests co-locate with source files:

```
source-file.ext      → source-file.test.ext     (unit tests)
route-handler.ext    → route-handler.test.ext   (integration tests)
e2e/                 → feature-name.e2e.ext     (E2E tests)
```

### Naming Conventions

- Unit/Integration: `*.test.*` or `*.spec.*`
- E2E: `*.e2e.*` or `*.spec.*` (in tests/e2e/)
- Test names should describe behavior: "returns X when Y" or "throws error for invalid input"

---

## When to Use This Skill

- ✅ Setting up testing for new project
- ✅ Choosing test frameworks
- ✅ Deciding what to test and at what level
- ✅ Implementing TDD
- ✅ Improving code coverage
- ✅ Fixing flaky tests

---

**Good tests give you confidence to ship.** ✅
