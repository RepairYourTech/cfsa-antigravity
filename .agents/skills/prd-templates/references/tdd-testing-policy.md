# TDD Testing Policy

## Assertion Depth Rule

Every test must assert **at minimum**:
- Response status code AND response body structure (not just status)
- At least one specific field value from the response body
- For error paths: the full error shape (code + message), not just the status code
- Contract tests must assert both valid input accepted AND invalid input rejected with the correct error shape

Tests that only assert `status == 200` without checking the response body are **insufficient** and will be flagged during QA anti-cheat audit.

## Anti-Mock-Abuse Rules

| Test Type | Mocking Policy |
|-----------|---------------|
| **Unit tests** | Mocking external dependencies allowed and expected |
| **Integration tests** | At least one test per endpoint must hit a real test database — no mocked DB responses |
| **E2E tests** | No mocks allowed — full stack or it doesn't count |

**Banned patterns**:
- Mocking the module under test (testing a mock of what you're building)
- Mock chains (mocking a mock that mocks another dependency)
- Tests where the mock returns exactly the expected value (circular, proves nothing)

**Test order**: Unit → Integration → E2E (if applicable)

## QA Anti-Cheat Audit

Before marking tests as passing, verify:

- [ ] No tests with zero assertions
- [ ] No tautological tests (e.g., `expect(true).toBe(true)`, `expect(mock).toEqual(mock)`)
- [ ] No `test.skip` without a `BOUNDARY:` reference and tracking issue
- [ ] Every test that asserts a response also asserts the response body, not just the status code
- [ ] No tests that mock the thing they're supposed to test (e.g., mocking the handler to test the handler)
- [ ] Error path tests actually trigger the error condition — they don't just mock the error response

In sequential mode, the agent self-audits against this checklist. In parallel mode, the QA-GREEN agent runs this explicitly.
