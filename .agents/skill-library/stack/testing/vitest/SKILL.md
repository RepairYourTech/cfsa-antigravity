---
name: vitest
description: "Comprehensive Vitest unit testing guide covering configuration, assertions, mocking, snapshots, coverage, async testing, timer mocking, component testing, type testing, and benchmarking. Use when writing unit tests, configuring test environments, mocking modules, or setting up coverage."
version: 1.0.0
---

# Vitest Unit Testing

## 1. Configuration

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    // Environment
    environment: 'node',               // 'node' | 'jsdom' | 'happy-dom'
    globals: true,                      // Use describe/it/expect without imports

    // File patterns
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'tests/e2e'],

    // Setup files (run before each test file)
    setupFiles: ['./src/test/setup.ts'],

    // Coverage
    coverage: {
      provider: 'v8',                  // 'v8' or 'istanbul'
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.d.ts',
        'src/test/**',
        'src/**/index.ts',            // barrel files
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },

    // Timeouts
    testTimeout: 10_000,
    hookTimeout: 10_000,

    // Isolation
    pool: 'forks',                     // 'threads' | 'forks' | 'vmThreads'
    isolate: true,                     // Isolate test files
  },
});
```

### Per-File Environment Override

```typescript
// @vitest-environment jsdom
// This comment at the top of a test file overrides the global environment

import { render, screen } from '@testing-library/react';

test('renders component', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByRole('button')).toHaveTextContent('Click me');
});
```

### Workspaces (Monorepo)

```typescript
// vitest.workspace.ts
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    extends: './vitest.config.ts',
    test: {
      name: 'unit',
      include: ['src/**/*.test.ts'],
      environment: 'node',
    },
  },
  {
    extends: './vitest.config.ts',
    test: {
      name: 'components',
      include: ['src/**/*.test.tsx'],
      environment: 'jsdom',
      setupFiles: ['./src/test/setup-dom.ts'],
    },
  },
]);
```

---

## 2. Test Structure

```typescript
import { describe, it, test, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';

describe('UserService', () => {
  let service: UserService;

  // Runs once before all tests in this describe block
  beforeAll(async () => {
    await setupDatabase();
  });

  // Runs before each test
  beforeEach(() => {
    service = new UserService();
  });

  // Runs after each test
  afterEach(() => {
    service.dispose();
  });

  // Runs once after all tests
  afterAll(async () => {
    await teardownDatabase();
  });

  it('should create a user with valid data', async () => {
    const user = await service.create({ email: 'test@example.com', name: 'Test' });
    expect(user.id).toBeDefined();
    expect(user.email).toBe('test@example.com');
  });

  it('should throw on duplicate email', async () => {
    await service.create({ email: 'dup@example.com', name: 'First' });
    await expect(service.create({ email: 'dup@example.com', name: 'Second' }))
      .rejects.toThrow('Email already exists');
  });

  // Nested describe for grouping
  describe('findByEmail', () => {
    it('should return null for unknown email', async () => {
      const user = await service.findByEmail('unknown@example.com');
      expect(user).toBeNull();
    });
  });
});
```

### Test Filtering

```typescript
// Run only this test (use during development, never commit)
it.only('focused test', () => { /* ... */ });

// Skip this test
it.skip('skipped test', () => { /* ... */ });

// Mark as to-do (shows in output but does not fail)
it.todo('test to write later');

// Run tests concurrently within a describe block
describe.concurrent('parallel tests', () => {
  it('test A', async () => { /* ... */ });
  it('test B', async () => { /* ... */ });
});

// Repeat a test multiple times (useful for flakiness detection)
it.repeats(100)('should be stable', () => { /* ... */ });
```

---

## 3. Assertions

### Core Matchers

```typescript
// Equality
expect(value).toBe(2);                        // strict === (primitives, references)
expect(obj).toEqual({ a: 1, b: 2 });          // deep equality
expect(obj).toStrictEqual({ a: 1, b: 2 });    // deep equality + checks undefined properties

// Partial matching
expect(user).toMatchObject({ email: 'test@example.com' });  // subset match
expect(user).toEqual(expect.objectContaining({ email: 'test@example.com' }));

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(count).toBeGreaterThan(0);
expect(count).toBeGreaterThanOrEqual(1);
expect(count).toBeLessThan(100);
expect(0.1 + 0.2).toBeCloseTo(0.3, 5);        // floating point comparison

// Strings
expect(message).toContain('error');
expect(message).toMatch(/^Error: .+/);

// Arrays
expect(list).toContain('item');
expect(list).toHaveLength(3);
expect(list).toEqual(expect.arrayContaining(['a', 'b']));

// Exceptions
expect(() => riskyFunction()).toThrow();
expect(() => riskyFunction()).toThrow('specific message');
expect(() => riskyFunction()).toThrow(ValidationError);
expect(() => riskyFunction()).toThrowErrorMatchingInlineSnapshot(`"specific message"`);
```

### Async Assertions

```typescript
// Resolved value
await expect(asyncFn()).resolves.toBe(42);
await expect(asyncFn()).resolves.toEqual({ status: 'ok' });

// Rejected value
await expect(asyncFn()).rejects.toThrow('Not found');
await expect(asyncFn()).rejects.toBeInstanceOf(NotFoundError);

// Multiple assertions on resolved value
const result = await asyncFn();
expect(result.status).toBe(200);
expect(result.data).toHaveLength(10);
```

---

## 4. Mocking

### Function Mocks (vi.fn)

```typescript
import { vi } from 'vitest';

// Create a mock function
const mockFn = vi.fn();
mockFn('arg1', 'arg2');

expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
expect(mockFn).toHaveBeenCalledTimes(1);

// Mock with return value
const getId = vi.fn().mockReturnValue('abc-123');
const getUser = vi.fn().mockResolvedValue({ id: '1', name: 'Alice' });
const failingFn = vi.fn().mockRejectedValue(new Error('Failed'));

// Mock implementation
const calculate = vi.fn().mockImplementation((a: number, b: number) => a + b);

// Different returns on successive calls
const counter = vi.fn()
  .mockReturnValueOnce(1)
  .mockReturnValueOnce(2)
  .mockReturnValueOnce(3);
```

### Spy on Methods (vi.spyOn)

```typescript
// Spy on an object method (original implementation runs by default)
const spy = vi.spyOn(console, 'error');
doSomethingThatLogs();
expect(spy).toHaveBeenCalledWith('Expected error message');
spy.mockRestore(); // Restore original implementation

// Spy and replace implementation
const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
expect(Date.now()).toBe(1700000000000);
dateSpy.mockRestore();
```

### Module Mocking (vi.mock)

```typescript
// Mock an entire module
vi.mock('./database', () => ({
  db: {
    query: vi.fn().mockResolvedValue([{ id: '1', name: 'Test' }]),
    insert: vi.fn().mockResolvedValue({ id: '1' }),
  },
}));

// The mock is hoisted to the top of the file automatically
import { db } from './database';  // This gets the mocked version

test('uses mocked database', async () => {
  const result = await db.query('SELECT * FROM users');
  expect(result).toEqual([{ id: '1', name: 'Test' }]);
});
```

### Factory Pattern for Module Mocks

```typescript
// Mock with factory that has access to vi
vi.mock('./config', () => {
  return {
    getConfig: vi.fn(() => ({
      apiUrl: 'http://test-api.local',
      timeout: 1000,
    })),
  };
});

// Change mock behavior per test
import { getConfig } from './config';

test('handles missing config', () => {
  vi.mocked(getConfig).mockReturnValueOnce({ apiUrl: '', timeout: 0 });
  expect(() => initializeApp()).toThrow('API URL is required');
});
```

### Partial Module Mocking

```typescript
// Mock only specific exports, keep the rest real
vi.mock('./utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./utils')>();
  return {
    ...actual,
    fetchData: vi.fn().mockResolvedValue({ data: 'mocked' }),
    // All other exports remain real
  };
});
```

### Global Mocking

```typescript
// Mock global objects
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ data: 'test' }),
}));

// Mock environment variables
vi.stubEnv('API_KEY', 'test-key-123');

// Clean up in afterEach
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
```

---

## 5. Timer Mocking

```typescript
import { vi, beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test('debounce waits before calling', () => {
  const callback = vi.fn();
  const debounced = debounce(callback, 300);

  debounced();
  expect(callback).not.toHaveBeenCalled();

  vi.advanceTimersByTime(299);
  expect(callback).not.toHaveBeenCalled();

  vi.advanceTimersByTime(1);
  expect(callback).toHaveBeenCalledTimes(1);
});

test('setInterval fires repeatedly', () => {
  const callback = vi.fn();
  setInterval(callback, 1000);

  vi.advanceTimersByTime(3500);
  expect(callback).toHaveBeenCalledTimes(3);
});

// Run all pending timers
test('run all timers', () => {
  const callback = vi.fn();
  setTimeout(callback, 5000);

  vi.runAllTimers();
  expect(callback).toHaveBeenCalled();
});

// Set system time
test('date-dependent logic', () => {
  vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  expect(isWeekend()).toBe(true);
});
```

---

## 6. Snapshot Testing

```typescript
// Inline snapshot (stored in the test file itself)
test('serializes user correctly', () => {
  const user = formatUser({ id: '1', email: 'test@example.com', name: 'Test User' });

  expect(user).toMatchInlineSnapshot(`
    {
      "displayName": "Test User",
      "email": "test@example.com",
      "id": "1",
    }
  `);
});

// File snapshot (stored in __snapshots__/ directory)
test('config output', () => {
  const config = generateConfig({ env: 'production' });
  expect(config).toMatchSnapshot();
});

// Update snapshots: vitest --update (or press 'u' in watch mode)
```

**When to use snapshots**: Use them for serializable output (JSON, HTML, config objects). Avoid them for assertions that should be explicit -- prefer `toEqual` for business logic.

---

## 7. Testing React Components

### Setup

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});
```

### Component Tests

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('should render email and password fields', () => {
    render(<LoginForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('should call onSubmit with form values', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<LoginForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('should show validation errors', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={vi.fn()} />);

    // Submit without filling fields
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  it('should disable button while submitting', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 1000)));
    render(<LoginForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled();
  });
});
```

### Testing Custom Hooks

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

test('useCounter increments and decrements', () => {
  const { result } = renderHook(() => useCounter(0));

  expect(result.current.count).toBe(0);

  act(() => { result.current.increment(); });
  expect(result.current.count).toBe(1);

  act(() => { result.current.decrement(); });
  expect(result.current.count).toBe(0);
});
```

---

## 8. Type Testing

```typescript
import { expectTypeOf, test } from 'vitest';
import { getUser, type User } from './user';

test('getUser returns a User', () => {
  expectTypeOf(getUser).returns.toEqualTypeOf<Promise<User>>();
});

test('User has expected shape', () => {
  expectTypeOf<User>().toHaveProperty('id').toBeString();
  expectTypeOf<User>().toHaveProperty('email').toBeString();
  expectTypeOf<User>().toHaveProperty('active').toBeBoolean();
});

test('function parameter types', () => {
  expectTypeOf(getUser).parameter(0).toBeString(); // first param is string
});

test('schema inference produces correct type', () => {
  type Inferred = z.infer<typeof userSchema>;
  expectTypeOf<Inferred>().toEqualTypeOf<{ name: string; email: string; age: number }>();
});
```

---

## 9. Performance Benchmarking

```typescript
import { bench, describe } from 'vitest';

describe('string concatenation', () => {
  const items = Array.from({ length: 1000 }, (_, i) => `item-${i}`);

  bench('Array.join', () => {
    items.join(', ');
  });

  bench('template literal reduce', () => {
    items.reduce((acc, item) => `${acc}, ${item}`);
  });

  bench('string concatenation', () => {
    let result = '';
    for (const item of items) {
      result += result ? `, ${item}` : item;
    }
  });
});

// Run benchmarks: vitest bench
```

---

## 10. In-Source Testing

Write tests alongside the code in the same file. Tests are removed from production builds by Vite.

```typescript
// src/lib/math.ts
export function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// In-source test block (stripped from production build)
if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;

  it('fibonacci(0) = 0', () => { expect(fibonacci(0)).toBe(0); });
  it('fibonacci(1) = 1', () => { expect(fibonacci(1)).toBe(1); });
  it('fibonacci(10) = 55', () => { expect(fibonacci(10)).toBe(55); });
}
```

Requires config:
```typescript
// vitest.config.ts
export default defineConfig({
  test: { includeSource: ['src/**/*.ts'] },
  define: { 'import.meta.vitest': 'undefined' }, // strip in production
});
```

---

## 11. Common Patterns

### Testing Zod Schemas

```typescript
import { describe, it, expect } from 'vitest';
import { userSchema } from './user.schema';

describe('userSchema', () => {
  it('should accept valid input', () => {
    const result = userSchema.safeParse({
      email: 'test@example.com',
      name: 'Test User',
      age: 25,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = userSchema.safeParse({
      email: 'not-an-email',
      name: 'Test',
      age: 25,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['email']);
    }
  });

  it('should reject missing required fields', () => {
    const result = userSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should apply defaults', () => {
    const result = userSchema.parse({ email: 'a@b.com', name: 'A' });
    expect(result.role).toBe('user'); // default value
  });
});
```

### Testing Error Boundaries

```typescript
import { vi } from 'vitest';

// Suppress console.error for expected errors
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

afterEach(() => {
  consoleSpy.mockRestore();
});

test('handles async errors', async () => {
  const result = await safeAsync(() => { throw new Error('test'); });
  expect(result.ok).toBe(false);
  expect(result.error?.message).toBe('test');
});
```

---

## 12. Critical Reminders

### ALWAYS

- Clean up mocks with `vi.restoreAllMocks()` in `afterEach` (or use `mockReset: true` in config)
- Use `vi.mocked()` to get typed mock references
- Prefer `userEvent` over `fireEvent` for component interaction tests
- Use `vi.useFakeTimers()` and `vi.useRealTimers()` in matched pairs
- Test both success and error paths
- Use `waitFor` for async DOM updates, not `setTimeout`
- Run coverage to find untested code paths
- Match test file names to source files (`user.ts` -> `user.test.ts`)

### NEVER

- Leave `test.only` or `describe.only` in committed code
- Mock what you own -- test your code, mock external dependencies
- Use `any` in test code -- tests should be type-safe too
- Ignore flaky tests -- fix the root cause (usually missing `await` or `waitFor`)
- Write tests that depend on execution order
- Mock `Date.now()` without restoring it
- Skip cleanup of spies and mocks (causes test pollution)
- Use `toBe` for object comparison (use `toEqual` or `toStrictEqual`)
