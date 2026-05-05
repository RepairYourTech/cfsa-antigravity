---
name: testing-library
description: "Comprehensive Testing Library guide for React, Vue, and Angular covering the user-centric testing philosophy, query priority (getByRole, getByLabelText, getByText), user events (userEvent over fireEvent), async utilities (waitFor, findBy), rendering patterns, testing forms and modals, accessibility-driven queries, MSW for API mocking, custom render with providers, testing hooks, and common mistakes. Use when writing component and integration tests."
version: 1.0.0
---

# Testing Library (React / Vue / Angular)

## 1. Philosophy

Testing Library enforces one principle: **test the way users interact with your software, not implementation details.**

Users do not know about component state, hooks, or context providers. They see text, labels, buttons, and roles. Tests should reflect that.

```
Good: "Click the Submit button, then verify the success message appears."
Bad:  "Assert that setState was called with { submitted: true }."
```

---

## 2. Query Priority

Queries are ordered by how accessible they are. Use the highest-priority query that works.

### Priority 1: Accessible to Everyone

```typescript
// getByRole -- the BEST query. Uses ARIA roles.
screen.getByRole('button', { name: 'Submit' });
screen.getByRole('heading', { level: 2 });
screen.getByRole('textbox', { name: 'Email' });
screen.getByRole('checkbox', { name: 'Remember me' });
screen.getByRole('link', { name: 'Learn more' });
screen.getByRole('dialog', { name: 'Confirm deletion' });
screen.getByRole('tab', { selected: true });
screen.getByRole('alert');
screen.getByRole('navigation');

// getByLabelText -- form fields with proper labels
screen.getByLabelText('Email address');
screen.getByLabelText('Password');
screen.getByLabelText(/first name/i);

// getByPlaceholderText -- only if there is no label
screen.getByPlaceholderText('Search...');

// getByText -- non-interactive text content
screen.getByText('No results found');
screen.getByText(/welcome/i);

// getByDisplayValue -- current value of form elements
screen.getByDisplayValue('john@example.com');
```

### Priority 2: Semantic Queries

```typescript
// getByAltText -- images
screen.getByAltText('User avatar');

// getByTitle -- title attribute (less common)
screen.getByTitle('Close');
```

### Priority 3: Last Resort

```typescript
// getByTestId -- ONLY when no accessible query works
screen.getByTestId('custom-chart-widget');

// Configure the test ID attribute:
// configure({ testIdAttribute: 'data-testid' });
```

### Query Variants

```typescript
// getBy -- throws if not found (synchronous, for elements that exist now)
screen.getByRole('button', { name: 'Save' });

// queryBy -- returns null if not found (for asserting absence)
expect(screen.queryByText('Error message')).not.toBeInTheDocument();

// findBy -- returns a Promise, waits for element to appear (async)
await screen.findByText('Data loaded');

// getAllBy -- returns array, throws if empty
screen.getAllByRole('listitem');

// queryAllBy -- returns array, empty if none found
screen.queryAllByRole('listitem');

// findAllBy -- returns Promise of array, waits
await screen.findAllByRole('row');
```

---

## 3. User Events

### userEvent over fireEvent

`userEvent` simulates real user behavior (focus, keyboard, mouse). `fireEvent` dispatches a single DOM event. Always prefer `userEvent`.

```typescript
import userEvent from '@testing-library/user-event';

// ALWAYS create a user instance per test
const user = userEvent.setup();

// Click
await user.click(screen.getByRole('button', { name: 'Submit' }));

// Double click
await user.dblClick(screen.getByRole('button', { name: 'Select' }));

// Type text (includes focus, keydown, keypress, keyup per character)
await user.type(screen.getByLabelText('Email'), 'test@example.com');

// Clear then type
await user.clear(screen.getByLabelText('Search'));
await user.type(screen.getByLabelText('Search'), 'new query');

// Tab navigation
await user.tab();
expect(screen.getByLabelText('Password')).toHaveFocus();

// Keyboard shortcuts
await user.keyboard('{Enter}');
await user.keyboard('{Shift>}{A}{/Shift}');  // Shift+A
await user.keyboard('{Control>}{a}{/Control}');  // Ctrl+A

// Select dropdown option
await user.selectOptions(screen.getByRole('combobox'), 'option-value');

// Upload file
const file = new File(['content'], 'test.png', { type: 'image/png' });
await user.upload(screen.getByLabelText('Upload'), file);

// Hover
await user.hover(screen.getByText('Tooltip trigger'));
expect(screen.getByRole('tooltip')).toBeInTheDocument();
await user.unhover(screen.getByText('Tooltip trigger'));

// Clipboard
await user.copy();
await user.paste();

// Pointer (advanced)
await user.pointer({ target: element, offset: 5, keys: '[MouseLeft]' });
```

---

## 4. Async Utilities

### waitFor

```typescript
import { waitFor } from '@testing-library/react';

// Wait for an assertion to pass (polls until timeout)
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});

// With options
await waitFor(
  () => {
    expect(mockFn).toHaveBeenCalledTimes(1);
  },
  {
    timeout: 3000,      // Max wait time (default: 1000ms)
    interval: 100,      // Polling interval (default: 50ms)
  }
);

// waitForElementToBeRemoved
await waitForElementToBeRemoved(() => screen.queryByText('Loading...'));
```

### findBy (Built-in Async Queries)

```typescript
// findBy = getBy + waitFor (returns a Promise)
const successMessage = await screen.findByText('Operation complete');
expect(successMessage).toBeInTheDocument();

// findAllBy
const rows = await screen.findAllByRole('row');
expect(rows).toHaveLength(5);
```

### Debugging

```typescript
// Print the current DOM tree
screen.debug();

// Print a specific element
screen.debug(screen.getByRole('form'));

// Log testing playground URL (paste into browser to visualize)
screen.logTestingPlaygroundURL();

// Increase debug output length
screen.debug(undefined, 30000);
```

---

## 5. Rendering Patterns

### React

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Save</Button>);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders as disabled when disabled prop is true', () => {
    render(<Button disabled>Save</Button>);

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
```

### Vue

```typescript
import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import Counter from './Counter.vue';

test('increments counter on click', async () => {
  const user = userEvent.setup();
  render(Counter, {
    props: { initialCount: 0 },
  });

  await user.click(screen.getByRole('button', { name: 'Increment' }));

  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

### Angular

```typescript
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { CounterComponent } from './counter.component';

test('increments counter on click', async () => {
  const user = userEvent.setup();
  await render(CounterComponent, {
    componentProperties: { initialCount: 0 },
  });

  await user.click(screen.getByRole('button', { name: 'Increment' }));

  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

---

## 6. Custom Render with Providers

```typescript
// test-utils.tsx
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './theme';

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  route?: string;
}

function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): ReturnType<typeof render> {
  const {
    queryClient = createTestQueryClient(),
    route = '/',
    ...renderOptions
  } = options;

  window.history.pushState({}, 'Test', route);

  function AllProviders({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: AllProviders, ...renderOptions });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };
```

Usage:

```typescript
// Import from your test-utils instead of @testing-library/react
import { render, screen } from '../test-utils';
import { UserProfile } from './UserProfile';

test('renders user profile', async () => {
  render(<UserProfile userId="123" />, { route: '/profile/123' });

  expect(await screen.findByRole('heading', { name: 'User Profile' }))
    .toBeInTheDocument();
});
```

---

## 7. Testing Forms

```typescript
import { render, screen, waitFor } from '../test-utils';
import userEvent from '@testing-library/user-event';
import { RegistrationForm } from './RegistrationForm';

describe('RegistrationForm', () => {
  it('submits valid form data', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<RegistrationForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Full Name'), 'Jane Doe');
    await user.type(screen.getByLabelText('Email'), 'jane@example.com');
    await user.type(screen.getByLabelText('Password'), 'SecurePass123!');
    await user.type(screen.getByLabelText('Confirm Password'), 'SecurePass123!');
    await user.click(screen.getByRole('checkbox', { name: /terms/i }));
    await user.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        termsAccepted: true,
      });
    });
  });

  it('shows validation errors for empty required fields', async () => {
    const user = userEvent.setup();
    render(<RegistrationForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    render(<RegistrationForm onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText('Password'), 'Password1');
    await user.type(screen.getByLabelText('Confirm Password'), 'Password2');
    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByText('Passwords must match')).toBeInTheDocument();
  });

  it('disables submit button while submitting', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );
    render(<RegistrationForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Full Name'), 'Jane');
    await user.type(screen.getByLabelText('Email'), 'jane@test.com');
    await user.type(screen.getByLabelText('Password'), 'Pass123!');
    await user.type(screen.getByLabelText('Confirm Password'), 'Pass123!');
    await user.click(screen.getByRole('checkbox', { name: /terms/i }));
    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(screen.getByRole('button', { name: /registering/i })).toBeDisabled();
  });
});
```

---

## 8. Testing Modals and Dialogs

```typescript
import { render, screen, waitForElementToBeRemoved } from '../test-utils';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('opens when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog trigger="Delete Item" onConfirm={vi.fn()} />);

    // Dialog should not be in DOM initially
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete Item' }));

    // Dialog should appear
    expect(screen.getByRole('dialog', { name: 'Confirm Deletion' }))
      .toBeInTheDocument();
  });

  it('calls onConfirm and closes when confirmed', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmDialog trigger="Delete" onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
  });

  it('closes without calling onConfirm when cancelled', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmDialog trigger="Delete" onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onConfirm).not.toHaveBeenCalled();
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
  });

  it('closes when Escape key is pressed', async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog trigger="Delete" onConfirm={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
  });

  it('traps focus within the dialog', async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog trigger="Delete" onConfirm={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    // First focusable element should receive focus
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    // Tab should cycle within the dialog
    await user.tab();
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });
});
```

---

## 9. Testing Navigation and Routing

```typescript
import { render, screen } from '../test-utils';
import userEvent from '@testing-library/user-event';
import { App } from './App';

describe('Navigation', () => {
  it('navigates to profile page when link is clicked', async () => {
    const user = userEvent.setup();
    render(<App />, { route: '/' });

    await user.click(screen.getByRole('link', { name: 'Profile' }));

    expect(await screen.findByRole('heading', { name: 'Your Profile' }))
      .toBeInTheDocument();
  });

  it('shows 404 page for unknown routes', () => {
    render(<App />, { route: '/unknown-page' });

    expect(screen.getByText('Page not found')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to login', async () => {
    render(<App />, { route: '/dashboard' });

    // Should redirect to login
    expect(await screen.findByRole('heading', { name: 'Sign In' }))
      .toBeInTheDocument();
  });
});
```

---

## 10. MSW for API Mocking

```typescript
// mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: '1', name: 'Alice', email: 'alice@example.com' },
      { id: '2', name: 'Bob', email: 'bob@example.com' },
    ]);
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { id: '3', ...body },
      { status: 201 }
    );
  }),

  http.delete('/api/users/:id', ({ params }) => {
    return new HttpResponse(null, { status: 204 });
  }),
];

// mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### Test Setup

```typescript
// test/setup.ts
import { server } from '../mocks/server';
import { afterAll, afterEach, beforeAll } from 'vitest';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Per-Test Overrides

```typescript
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

test('shows error message when API fails', async () => {
  // Override for this specific test
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    })
  );

  render(<UserList />);

  expect(await screen.findByRole('alert'))
    .toHaveTextContent('Failed to load users');
});

test('shows empty state when no users exist', async () => {
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json([]);
    })
  );

  render(<UserList />);

  expect(await screen.findByText('No users found')).toBeInTheDocument();
});
```

---

## 11. Testing Hooks

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCounter } from './useCounter';
import { useDebounce } from './useDebounce';

describe('useCounter', () => {
  it('initializes with the given value', () => {
    const { result } = renderHook(() => useCounter(5));

    expect(result.current.count).toBe(5);
  });

  it('increments the counter', () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('resets to initial value', () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => {
      result.current.increment();
      result.current.increment();
      result.current.reset();
    });

    expect(result.current.count).toBe(0);
  });
});

// Testing hooks with props that change
describe('useDebounce', () => {
  it('returns debounced value after delay', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 300 });

    // Value should not change immediately
    expect(result.current).toBe('initial');

    // Wait for debounce
    await waitFor(() => {
      expect(result.current).toBe('updated');
    });
  });
});

// Testing hooks that need providers
describe('useAuth', () => {
  it('returns current user', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider user={{ id: '1', name: 'Test' }}>
        {children}
      </AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toEqual({ id: '1', name: 'Test' });
  });
});
```

---

## 12. Accessibility-Driven Testing

```typescript
// Testing Library queries naturally enforce accessibility
describe('Accessible Form', () => {
  it('has properly labeled inputs', () => {
    render(<LoginForm />);

    // These queries FAIL if labels are not properly associated
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('has proper ARIA roles', () => {
    render(<LoginForm />);

    expect(screen.getByRole('form', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('announces errors to screen readers', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    // Error messages should have role="alert"
    expect(screen.getByRole('alert')).toHaveTextContent('Email is required');
  });

  it('manages focus after submission error', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    // Focus should move to the first error field
    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toHaveFocus();
    });
  });
});
```

---

## 13. Common Mistakes

### Testing Implementation Details

```typescript
// BAD: Testing internal state
test('sets isLoading to true', () => {
  const { result } = renderHook(() => useData());
  expect(result.current.isLoading).toBe(true);  // Implementation detail
});

// GOOD: Testing user-visible behavior
test('shows loading spinner while fetching', () => {
  render(<DataList />);
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});

// BAD: Testing component internals
test('calls handleSubmit', () => {
  const wrapper = shallow(<Form />);
  wrapper.instance().handleSubmit();  // Never do this
});

// GOOD: Testing as user would
test('submits form data', async () => {
  const user = userEvent.setup();
  render(<Form />);
  await user.type(screen.getByLabelText('Name'), 'Test');
  await user.click(screen.getByRole('button', { name: 'Submit' }));
  expect(await screen.findByText('Submitted!')).toBeInTheDocument();
});
```

### Wrong Query Choice

```typescript
// BAD: Using test IDs when accessible queries exist
screen.getByTestId('submit-button');  // Users do not see test IDs

// GOOD: Using role-based queries
screen.getByRole('button', { name: 'Submit' });

// BAD: Using container.querySelector
const { container } = render(<Component />);
container.querySelector('.my-class');  // CSS class is an implementation detail

// GOOD: Using semantic queries
screen.getByRole('heading', { level: 1 });
```

### Incorrect Async Handling

```typescript
// BAD: No await on async operations
test('loads data', () => {
  render(<DataList />);
  expect(screen.getByText('Data loaded')).toBeInTheDocument();  // Race condition
});

// GOOD: Await async results
test('loads data', async () => {
  render(<DataList />);
  expect(await screen.findByText('Data loaded')).toBeInTheDocument();
});

// BAD: Using setTimeout to wait
test('shows toast', async () => {
  render(<App />);
  await new Promise((r) => setTimeout(r, 1000));  // Fragile timing
  expect(screen.getByText('Saved')).toBeInTheDocument();
});

// GOOD: Using waitFor
test('shows toast', async () => {
  render(<App />);
  await waitFor(() => {
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });
});
```

### Excessive Mocking

```typescript
// BAD: Mocking your own components
vi.mock('./ChildComponent', () => ({
  ChildComponent: () => <div>mocked</div>,  // Defeats the purpose
}));

// GOOD: Render real component tree, mock external dependencies
server.use(
  http.get('/api/data', () => HttpResponse.json({ items: [] }))
);
render(<ParentComponent />);
```

---

## 14. Critical Reminders

### ALWAYS

- Use `userEvent.setup()` at the start of each test (not the global import)
- Use `getByRole` as the first choice for all queries
- Use `findBy` for elements that appear asynchronously
- Use `queryBy` only when asserting something is NOT in the DOM
- Use `waitFor` for async state changes (not `setTimeout`)
- Use `screen` instead of destructuring from `render()`
- Clean up mocks and server handlers after each test
- Test loading, error, and empty states -- not just happy path
- Create a custom `render` that wraps providers once

### NEVER

- Use `fireEvent` when `userEvent` works (userEvent simulates real behavior)
- Use `container.querySelector` or `container.innerHTML` (breaks the abstraction)
- Test CSS classes, state variables, or internal methods (implementation details)
- Use `act()` warnings as an excuse to wrap everything in `act` (find root cause)
- Use snapshot tests as a substitute for behavioral assertions
- Use `getByTestId` when a role or label query exists
- Leave `screen.debug()` in committed test code
- Use `waitFor` with side effects inside the callback (only assertions)
