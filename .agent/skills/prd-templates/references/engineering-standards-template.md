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

> **Baseline**: Budgets target [device tier] on [network condition]. Every threshold must have a named enforcement tool — a threshold without an enforcement tool is incomplete.

### Web Vitals per page type (web/desktop surfaces only)

| Page Type | LCP target | INP target | CLS target | Enforcement Tool |
|-----------|-----------|-----------|-----------|-----------------|
| [e.g., Landing] | [e.g., ≤ 2.0 s] | [e.g., ≤ 150 ms] | [e.g., ≤ 0.05] | [e.g., Lighthouse CI] |
| [e.g., Dashboard] | [e.g., ≤ 2.5 s] | [e.g., ≤ 200 ms] | [e.g., ≤ 0.1] | [e.g., Lighthouse CI] |
| [e.g., Detail/Form] | [e.g., ≤ 2.0 s] | [e.g., ≤ 100 ms] | [e.g., ≤ 0.05] | [e.g., Lighthouse CI] |

### JS Bundle Size per page type (web/desktop surfaces only)

| Page Type | Initial JS (gzipped) | Total JS (gzipped) | Enforcement Tool |
|-----------|---------------------|-------------------|-----------------|
| [e.g., Landing] | [e.g., ≤ 80 KB] | [e.g., ≤ 150 KB] | [e.g., size-limit] |
| [e.g., Dashboard] | [e.g., ≤ 150 KB] | [e.g., ≤ 300 KB] | [e.g., size-limit] |

### API Response Time per tier

| Tier | Description | p50 | p95 | p99 | Enforcement Tool |
|------|------------|-----|-----|-----|-----------------|
| [e.g., Auth/session] | [e.g., Token issue, session check] | [e.g., ≤ 50 ms] | [e.g., ≤ 100 ms] | [e.g., ≤ 200 ms] | [e.g., k6] |
| [e.g., CRUD reads] | [e.g., Single-entity fetch] | [e.g., ≤ 30 ms] | [e.g., ≤ 80 ms] | [e.g., ≤ 150 ms] | [e.g., k6] |
| [e.g., List/search] | [e.g., Paginated queries] | [e.g., ≤ 100 ms] | [e.g., ≤ 300 ms] | [e.g., ≤ 500 ms] | [e.g., k6] |
| [e.g., Writes] | [e.g., Create, update, delete] | [e.g., ≤ 80 ms] | [e.g., ≤ 200 ms] | [e.g., ≤ 400 ms] | [e.g., k6] |

### DB Query Time per tier

| Tier | Description | p50 | p95 | Enforcement Tool |
|------|------------|-----|-----|-----------------|
| [e.g., Indexed lookup] | [e.g., PK or unique-index fetch] | [e.g., ≤ 5 ms] | [e.g., ≤ 15 ms] | [e.g., pgbench] |
| [e.g., Indexed list] | [e.g., Range scan on indexed column] | [e.g., ≤ 15 ms] | [e.g., ≤ 50 ms] | [e.g., pgbench] |
| [e.g., Aggregation] | [e.g., COUNT, SUM, GROUP BY] | [e.g., ≤ 50 ms] | [e.g., ≤ 150 ms] | [e.g., pgbench] |
| [e.g., Full-text/vector] | [e.g., Search or similarity] | [e.g., ≤ 100 ms] | [e.g., ≤ 300 ms] | [e.g., pgbench] |

### Desktop surfaces (if applicable)

| Metric | Threshold | Enforcement Tool |
|--------|----------|-----------------|
| Cold start | [e.g., ≤ 2 s] | [e.g., platform profiler] |
| Memory (idle) | [e.g., ≤ 200 MB] | [e.g., platform profiler] |
| Memory (active) | [e.g., ≤ 500 MB] | [e.g., platform profiler] |
| Installer size | [e.g., ≤ 100 MB] | [e.g., CI size check] |

### Mobile surfaces (if applicable)

| Metric | Threshold | Enforcement Tool |
|--------|----------|-----------------|
| Cold launch | [e.g., ≤ 1.5 s] | [e.g., platform profiler] |
| Warm launch | [e.g., ≤ 0.5 s] | [e.g., platform profiler] |
| Battery drain (active) | [e.g., ≤ 5 %/hr] | [e.g., platform profiler] |
| Download size | [e.g., ≤ 50 MB] | [e.g., CI size check] |

### CLI surfaces (if applicable)

| Metric | Threshold | Enforcement Tool |
|--------|----------|-----------------|
| Execution time | [e.g., ≤ 500 ms for common operations] | [e.g., hyperfine] |
| Binary size | [e.g., ≤ 20 MB] | [e.g., CI size check] |
| Startup latency | [e.g., ≤ 100 ms] | [e.g., hyperfine] |

### CI Enforcement

| Budget Category | Enforcement Tool | Fail Condition | Fail vs. Warn |
|----------------|-----------------|----------------|---------------|
| Web Vitals | [e.g., Lighthouse CI] | [e.g., Score below threshold] | [Fail] |
| Bundle size | [e.g., size-limit] | [e.g., Exceeds per-page-type cap] | [Fail] |
| API response time | [e.g., k6] | [e.g., p95 exceeds tier target] | [Warn / Fail after baseline] |
| DB query time | [e.g., pgbench] | [e.g., p95 exceeds tier target] | [Warn / Fail after baseline] |
| Desktop/mobile | [e.g., platform profiler] | [e.g., Any metric exceeds threshold] | [Warn] |

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
