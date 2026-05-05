---
name: zustand
description: Comprehensive Zustand state management skill covering store creation, selectors, middleware (persist, devtools, immer), actions, async patterns, store slices, computed values, store composition, testing patterns, SSR hydration, and React integration best practices. Use when managing client-side state with Zustand.
version: 1.0.0
---

# Zustand State Management

Minimal, unopinionated state management for React. Small API surface, no providers required, first-class TypeScript support.

## Store Creation

### Basic Store

```typescript
// src/stores/counter-store.ts
import { create } from 'zustand';

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  incrementBy: (amount: number) => void;
}

export const useCounterStore = create<CounterState>()((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
  incrementBy: (amount) => set((state) => ({ count: state.count + amount })),
}));
```

### Usage in Components

```typescript
function Counter() {
  // Subscribe to specific state — component re-renders only when count changes
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+1</button>
    </div>
  );
}
```

### Using get() for Accessing State Outside React

```typescript
// Read state outside of components
const currentCount = useCounterStore.getState().count;

// Subscribe to changes outside of components
const unsubscribe = useCounterStore.subscribe((state) => {
  console.log('Count changed:', state.count);
});
```

## Selectors

### Individual Selectors (Recommended)

```typescript
// Each selector causes re-render only when its return value changes
function UserProfile() {
  const name = useUserStore((s) => s.name);
  const email = useUserStore((s) => s.email);

  return <p>{name} ({email})</p>;
}
```

### Derived/Computed Selectors

```typescript
// Compute derived values in the selector
function CartTotal() {
  const total = useCartStore((s) =>
    s.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  return <p>Total: ${total.toFixed(2)}</p>;
}
```

### Shallow Comparison for Object Selectors

```typescript
import { useShallow } from 'zustand/react/shallow';

// Without useShallow — re-renders on every state change (new object every time)
// const { name, email } = useUserStore((s) => ({ name: s.name, email: s.email }));

// With useShallow — re-renders only when name or email actually change
function UserInfo() {
  const { name, email } = useUserStore(
    useShallow((s) => ({ name: s.name, email: s.email }))
  );

  return <p>{name} ({email})</p>;
}
```

## Async Actions

```typescript
interface TodoState {
  todos: Todo[];
  isLoading: boolean;
  error: string | null;
  fetchTodos: () => Promise<void>;
  addTodo: (title: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
}

export const useTodoStore = create<TodoState>()((set, get) => ({
  todos: [],
  isLoading: false,
  error: null,

  fetchTodos: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/todos');
      if (!response.ok) throw new Error('Failed to fetch');
      const todos = await response.json();
      set({ todos, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addTodo: async (title) => {
    const response = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) throw new Error('Failed to add');

    const newTodo = await response.json();
    set((state) => ({ todos: [...state.todos, newTodo] }));
  },

  deleteTodo: async (id) => {
    // Optimistic update
    const previousTodos = get().todos;
    set((state) => ({ todos: state.todos.filter((t) => t.id !== id) }));

    try {
      const response = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
    } catch {
      // Rollback on failure
      set({ todos: previousTodos });
    }
  },
}));
```

## Middleware

### Persist (localStorage, sessionStorage, etc.)

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SettingsState {
  theme: 'light' | 'dark';
  language: string;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (lang: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      language: 'en',
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'settings-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Partial persistence — only persist specific fields
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
      }),
      // Version for migrations
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0) {
          // Migration from version 0 to 1
          return { ...(persistedState as object), language: 'en' };
        }
        return persistedState as SettingsState;
      },
    }
  )
);
```

### Devtools

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      user: null,
      login: (user) => set({ user }, false, 'auth/login'),
      logout: () => set({ user: null }, false, 'auth/logout'),
    }),
    { name: 'AuthStore', enabled: process.env.NODE_ENV === 'development' }
  )
);
```

### Immer (Mutable Updates)

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface NestedState {
  user: {
    profile: {
      name: string;
      address: {
        city: string;
        zip: string;
      };
    };
    preferences: string[];
  };
  updateCity: (city: string) => void;
  addPreference: (pref: string) => void;
}

export const useNestedStore = create<NestedState>()(
  immer((set) => ({
    user: {
      profile: {
        name: 'Alice',
        address: { city: 'NYC', zip: '10001' },
      },
      preferences: [],
    },
    // With immer, mutate directly — no spread operators needed
    updateCity: (city) =>
      set((state) => {
        state.user.profile.address.city = city;
      }),
    addPreference: (pref) =>
      set((state) => {
        state.user.preferences.push(pref);
      }),
  }))
);
```

### Combining Middleware

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Order matters: devtools wraps persist wraps immer wraps the store
export const useAppStore = create<AppState>()(
  devtools(
    persist(
      immer((set) => ({
        // state and actions
      })),
      { name: 'app-storage' }
    ),
    { name: 'AppStore' }
  )
);
```

## Store Slices

### Slice Pattern for Large Stores

```typescript
// src/stores/slices/auth-slice.ts
import type { StateCreator } from 'zustand';

export interface AuthSlice {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const createAuthSlice: StateCreator<
  AuthSlice & CartSlice, // full combined store type
  [],
  [],
  AuthSlice
> = (set) => ({
  user: null,
  token: null,
  login: async (email, password) => {
    const { user, token } = await api.login(email, password);
    set({ user, token });
  },
  logout: () => set({ user: null, token: null }),
});

// src/stores/slices/cart-slice.ts
export interface CartSlice {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

export const createCartSlice: StateCreator<
  AuthSlice & CartSlice,
  [],
  [],
  CartSlice
> = (set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
  clearCart: () => set({ items: [] }),
});

// src/stores/app-store.ts
import { create } from 'zustand';
import { createAuthSlice, type AuthSlice } from './slices/auth-slice';
import { createCartSlice, type CartSlice } from './slices/cart-slice';

export const useAppStore = create<AuthSlice & CartSlice>()((...args) => ({
  ...createAuthSlice(...args),
  ...createCartSlice(...args),
}));
```

## SSR Hydration

```typescript
// Avoid hydration mismatches with persist middleware
import { useEffect, useState } from 'react';

function useHydratedStore<T>(store: { persist: { hasHydrated: () => boolean } }, selector: (s: any) => T): T | undefined {
  const [hydrated, setHydrated] = useState(false);
  const value = store(selector);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated ? value : undefined;
}

// Or check hydration state directly
function Settings() {
  const hasHydrated = useSettingsStore.persist.hasHydrated();
  const theme = useSettingsStore((s) => s.theme);

  if (!hasHydrated) return <div>Loading settings...</div>;

  return <div>Theme: {theme}</div>;
}
```

## Testing

```typescript
// tests/todo-store.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useTodoStore } from '../src/stores/todo-store';

describe('todo store', () => {
  beforeEach(() => {
    // Reset store state between tests
    useTodoStore.setState({
      todos: [],
      isLoading: false,
      error: null,
    });
  });

  it('adds a todo', () => {
    const { addTodo } = useTodoStore.getState();
    addTodo('Test todo');

    const { todos } = useTodoStore.getState();
    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('Test todo');
  });

  it('removes a todo', () => {
    useTodoStore.setState({
      todos: [{ id: '1', title: 'Test', completed: false }],
    });

    useTodoStore.getState().deleteTodo('1');

    expect(useTodoStore.getState().todos).toHaveLength(0);
  });

  it('handles loading state', async () => {
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: '1', title: 'From API', completed: false }]),
    });

    const fetchPromise = useTodoStore.getState().fetchTodos();
    expect(useTodoStore.getState().isLoading).toBe(true);

    await fetchPromise;
    expect(useTodoStore.getState().isLoading).toBe(false);
    expect(useTodoStore.getState().todos).toHaveLength(1);
  });
});
```

### Testing with Components

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach } from 'vitest';
import { useCounterStore } from '../src/stores/counter-store';
import Counter from '../src/components/Counter';

beforeEach(() => {
  useCounterStore.setState({ count: 0 });
});

it('increments counter on click', async () => {
  render(<Counter />);
  await userEvent.click(screen.getByText('+1'));
  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|-----------------|
| Selecting the entire store: `useStore()` | Select individual fields: `useStore((s) => s.count)` |
| Creating new objects in selectors without `useShallow` | Use `useShallow` for object/array selectors |
| Putting derived state in the store | Compute derived values in selectors |
| Large monolithic store for unrelated state | Split into domain-specific stores or use slice pattern |
| Using `set(state)` instead of `set((prev) => ...)` for updates based on previous state | Always use the callback form when the update depends on current state |
| Calling `set` in a loop | Batch updates: compute final state first, call `set` once |
| Not resetting stores in tests | Reset with `store.setState()` in `beforeEach` |
| Using `persist` without `version` and `migrate` | Always version persisted stores for future schema changes |
| Storing server data in Zustand | Use React Query/SWR for server state; Zustand is for client state |
| Subscribing to store changes in useEffect for derived state | Use selectors or `subscribe` outside React |

## Decision Guide

```
When to use Zustand vs alternatives:

Client-side UI state (modals, themes, form drafts) → Zustand
Server state (API data, caching, pagination) → React Query / SWR
Complex state machines (multi-step flows) → XState
Simple shared state (2-3 values) → React Context
Form state → React Hook Form / Formik
URL state (filters, pagination) → URL search params
```
