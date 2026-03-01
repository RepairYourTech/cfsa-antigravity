# Engineering Standards Template

Use this template when creating `docs/plans/ENGINEERING-STANDARDS.md`. Fill in concrete values based on tech stack decisions — **no TBDs allowed**.

```markdown
# [Project Name] — Engineering Standards

> **Architecture**: [link to architecture-design.md]
> **Date**: YYYY-MM-DD
> **Status**: Draft | Review | Approved

## Test Coverage
- Minimum unit test coverage: [e.g., 80%]
- Integration test requirement: [e.g., every API endpoint]
- E2E test requirement: [e.g., every critical user flow]
- Coverage tool: [e.g., vitest coverage-v8]

## Linting & Formatting
- Linter: [e.g., ESLint with strict config]
- Formatter: [e.g., Prettier]
- Type checker: [e.g., TypeScript strict mode]
- Pre-commit hooks: [yes/no, tool]

## Performance Budgets

### Web surfaces (if applicable)
- LCP target: [e.g., < 2.5s]
- FID target: [e.g., < 100ms]
- CLS target: [e.g., < 0.1]
- Bundle size limit: [e.g., < 200KB initial JS]

### Desktop surfaces (if applicable)
- Cold start target: [e.g., < 2s]
- Memory ceiling: [e.g., < 200MB idle, < 500MB active]
- Installer size: [e.g., < 100MB]

### Mobile surfaces (if applicable)
- App launch target: [e.g., < 1.5s cold, < 0.5s warm]
- Battery impact: [e.g., < 5% per hour active use]
- App download size: [e.g., < 50MB]

### API / shared services
- API response time: [e.g., p95 < 500ms]
- Throughput target: [e.g., 1000 req/s]

### CLI surfaces (if applicable)
- Execution time: [e.g., < 500ms for common operations]
- Binary size: [e.g., < 20MB]
- Startup latency: [e.g., < 100ms]

## Accessibility
- WCAG level: [e.g., 2.1 AA] (web/mobile)
- Screen reader testing: [required/optional]
- Keyboard navigation: [all interactive elements]
- Platform accessibility APIs: [e.g., UIAccessibility for iOS, AccessibilityNodeInfo for Android]

## Security
- Dependency audit: [e.g., npm audit on every CI run]
- Secret scanning: [tool/approach]
- CSP policy: [strict/relaxed + details] (web surfaces)
- Code signing: [signing certificate strategy] (desktop/mobile surfaces)

## Code Quality
- Max file length: [e.g., 300 lines]
- Max function length: [e.g., 50 lines]
- Max cyclomatic complexity: [e.g., 10]
- Required documentation: [public APIs / all exports / none]

## CI/CD Gates
- Tests must pass: [yes]
- Lint must pass: [yes]
- Type-check must pass: [yes]
- Build must succeed: [yes]
- Coverage threshold met: [yes]

## Validation Command
[The single command that enforces all of the above]
```
