---
name: react-best-practices
description: "Comprehensive React performance and architecture guide covering Server Component patterns, eliminating client/server waterfalls, bundle size reduction, re-render optimization, rendering performance, JavaScript runtime performance, Server Actions, error boundaries, and React 19 features. Use when building React applications with Next.js or any RSC-capable framework, optimizing performance, or architecting component trees."
version: 1.0.0
---

# React Best Practices

## 1. Philosophy

React applications must be **fast by default, not fast by accident**. Performance is not an afterthought bolted on with profiling tools -- it is an architectural decision made at the component tree level before a single line of implementation is written.

**Key principles**:
- Server Components are the default. Client Components are the exception.
- Data fetching happens at the top of the tree, not sprinkled throughout.
- Bundle size is a budget, not a metric you check after shipping.
- Re-renders are signals of architectural problems, not inevitable costs.
- The main thread is sacred. Never block it with synchronous computation.

---

## 2. Server Component Patterns

### Data Fetching at the Top

Server Components fetch data without client-side JavaScript. Push data fetching as high in the tree as possible.

```tsx
// GOOD: Server Component fetches data at the page level
// app/dashboard/page.tsx
import { DashboardView } from "./dashboard-view";

export default async function DashboardPage() {
  const [metrics, activity, alerts] = await Promise.all([
    fetchMetrics(),
    fetchRecentActivity(),
    fetchAlerts(),
  ]);

  return (
    <DashboardView
      metrics={metrics}
      activity={activity}
      alerts={alerts}
    />
  );
}
```

```tsx
// BAD: Each child component fetches its own data independently
// This creates sequential waterfalls on the server
function Dashboard() {
  return (
    <div>
      <MetricsPanel />     {/* fetches /api/metrics */}
      <ActivityFeed />     {/* fetches /api/activity -- waits for above */}
      <AlertsWidget />     {/* fetches /api/alerts -- waits for above */}
    </div>
  );
}
```

### Streaming with Suspense

Use Suspense boundaries to stream content progressively. Users see the shell immediately while slow data loads in the background.

```tsx
// app/dashboard/page.tsx
import { Suspense } from "react";
import { MetricsPanel } from "./metrics-panel";
import { ActivityFeed } from "./activity-feed";
import { MetricsSkeleton, ActivitySkeleton } from "./skeletons";

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Suspense fallback={<MetricsSkeleton />}>
        <MetricsPanel />
      </Suspense>
      <Suspense fallback={<ActivitySkeleton />}>
        <ActivityFeed />
      </Suspense>
    </div>
  );
}

// Each component is an async Server Component
async function MetricsPanel() {
  const metrics = await fetchMetrics(); // streams when ready
  return <MetricsDisplay data={metrics} />;
}
```

### Server/Client Boundary

Mark the boundary explicitly. Minimize what crosses into client territory.

```tsx
// GOOD: Thin client wrapper, maximum server rendering
// components/search-results.tsx (Server Component)
import { SearchInput } from "./search-input"; // "use client"

export async function SearchResults({ query }: { query: string }) {
  const results = await searchDatabase(query);
  return (
    <div>
      <SearchInput defaultValue={query} />
      <ul>
        {results.map((r) => (
          <li key={r.id}>{r.title}</li>
        ))}
      </ul>
    </div>
  );
}

// components/search-input.tsx
"use client";
import { useRouter, useSearchParams } from "next/navigation";

export function SearchInput({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  // Only the input is a Client Component -- the results list is server-rendered
  return (
    <input
      defaultValue={defaultValue}
      onChange={(e) => router.push(`?q=${e.target.value}`)}
    />
  );
}
```

---

## 3. Eliminating Waterfalls

### Parallel Data Loading

Never await sequentially when requests are independent.

```tsx
// BAD: Sequential -- total time = sum of all requests
async function Page() {
  const user = await fetchUser();          // 200ms
  const posts = await fetchPosts();        // 300ms
  const comments = await fetchComments();  // 150ms
  // Total: 650ms
}

// GOOD: Parallel -- total time = max of all requests
async function Page() {
  const [user, posts, comments] = await Promise.all([
    fetchUser(),          // 200ms
    fetchPosts(),         // 300ms
    fetchComments(),      // 150ms
  ]);
  // Total: 300ms
}
```

### Preloading Data

Start fetching before you need the data. Use the preload pattern to kick off requests early.

```tsx
// lib/data.ts
import { cache } from "react";

// Deduplicated: calling this multiple times in one render
// only hits the database once
export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});

// Preload function -- call this early, consume later
export function preloadUser(id: string) {
  void getUser(id);
}

// app/user/[id]/page.tsx
import { preloadUser, getUser } from "@/lib/data";

export default async function UserPage({ params }: { params: { id: string } }) {
  // Start fetching immediately
  preloadUser(params.id);

  // Do other work...
  const config = await getConfig();

  // Data is likely already cached by now
  const user = await getUser(params.id);
  return <UserProfile user={user} config={config} />;
}
```

### Avoiding Client-Side Fetch Waterfalls

When client-side fetching is unavoidable, prevent parent-child waterfalls.

```tsx
// BAD: Child fetches only after parent renders
function Parent() {
  const { data: user } = useSWR("/api/user");
  if (!user) return <Spinner />;
  return <ChildProfile userId={user.id} />;
}

function ChildProfile({ userId }: { userId: string }) {
  // This request does not start until Parent finishes
  const { data: profile } = useSWR(`/api/profile/${userId}`);
  return <div>{profile?.name}</div>;
}

// GOOD: Fetch in parallel at the top
function Parent() {
  const { data: user } = useSWR("/api/user");
  const { data: profile } = useSWR(
    user ? `/api/profile/${user.id}` : null
  );
  if (!user || !profile) return <Spinner />;
  return <ProfileView user={user} profile={profile} />;
}
```

---

## 4. Bundle Size Reduction

### Dynamic Imports

Lazy-load components and libraries that are not needed on initial render.

```tsx
import dynamic from "next/dynamic";

// Component only loads when rendered
const HeavyChart = dynamic(() => import("./heavy-chart"), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Skip SSR if it depends on browser APIs
});

// React.lazy for non-Next.js
const HeavyEditor = lazy(() => import("./heavy-editor"));

function Dashboard() {
  return (
    <div>
      <Header /> {/* Always loaded */}
      <Suspense fallback={<ChartSkeleton />}>
        <HeavyChart /> {/* Loaded on demand */}
      </Suspense>
    </div>
  );
}
```

### Tree Shaking -- Import Only What You Use

```tsx
// BAD: Imports the entire library
import _ from "lodash";
const sorted = _.sortBy(items, "name");

// GOOD: Import only the function you need
import sortBy from "lodash/sortBy";
const sorted = sortBy(items, "name");

// BEST: Use native methods when possible
const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
```

### Avoid Barrel Files in Large Codebases

Barrel files (`index.ts` that re-exports everything) defeat tree shaking.

```tsx
// BAD: Barrel file pulls in everything
// components/index.ts
export { Button } from "./button";
export { Dialog } from "./dialog";
export { DataTable } from "./data-table"; // Heavy component

// Importing Button also bundles DataTable
import { Button } from "@/components";

// GOOD: Import directly from the source
import { Button } from "@/components/button";
```

### Analyzing Bundle Size

```bash
# Next.js built-in analyzer
ANALYZE=true next build

# Or use @next/bundle-analyzer
# next.config.js
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});
module.exports = withBundleAnalyzer(nextConfig);
```

---

## 5. Re-Render Optimization

### State Colocation

Keep state as close to where it is used as possible. State at the top of the tree re-renders everything below it.

```tsx
// BAD: Search state lives in the page, re-renders the entire page
function Page() {
  const [search, setSearch] = useState("");
  return (
    <div>
      <Header />                      {/* re-renders on every keystroke */}
      <SearchInput value={search} onChange={setSearch} />
      <ExpensiveList />               {/* re-renders on every keystroke */}
      <Footer />                      {/* re-renders on every keystroke */}
    </div>
  );
}

// GOOD: Search state is colocated in the search component
function Page() {
  return (
    <div>
      <Header />
      <SearchSection />  {/* Only this re-renders */}
      <ExpensiveList />
      <Footer />
    </div>
  );
}

function SearchSection() {
  const [search, setSearch] = useState("");
  return <SearchInput value={search} onChange={setSearch} />;
}
```

### React.memo for Expensive Children

Use `memo` when a component receives the same props frequently but its parent re-renders often.

```tsx
import { memo } from "react";

const ExpensiveList = memo(function ExpensiveList({
  items,
}: {
  items: Item[];
}) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
});
```

### Stable References with useCallback and useMemo

```tsx
function Parent({ items }: { items: Item[] }) {
  // Without useCallback, a new function is created every render,
  // defeating memo on the child
  const handleClick = useCallback((id: string) => {
    console.log("clicked", id);
  }, []);

  // Without useMemo, a new array is created every render
  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );

  return <ExpensiveList items={sortedItems} onClick={handleClick} />;
}
```

### Content Pattern (Children as Stable Nodes)

```tsx
// GOOD: children does not re-render when Parent's state changes
// because children is a stable reference passed from above
function ExpandablePanel({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
      {isOpen && children}
    </div>
  );
}

// Usage -- ExpensiveContent is not re-created on toggle
<ExpandablePanel>
  <ExpensiveContent data={data} />
</ExpandablePanel>
```

---

## 6. Rendering Performance

### Virtualization for Large Lists

Never render thousands of DOM nodes. Use virtualization.

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: "400px", overflow: "auto" }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {items[virtualItem.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Key Stability

Keys must be stable, unique, and derived from the data -- never from array indices when items can reorder.

```tsx
// BAD: Index keys cause full re-mount on reorder
{items.map((item, index) => (
  <ListItem key={index} item={item} />
))}

// GOOD: Stable ID from data
{items.map((item) => (
  <ListItem key={item.id} item={item} />
))}

// BAD: Random keys cause full re-mount every render
{items.map((item) => (
  <ListItem key={Math.random()} item={item} />
))}
```

### Lazy Loading Below the Fold

```tsx
import { useInView } from "react-intersection-observer";

function LazySection({ children }: { children: React.ReactNode }) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: "200px", // Start loading 200px before visible
  });

  return (
    <div ref={ref}>
      {inView ? children : <Placeholder />}
    </div>
  );
}
```

---

## 7. JavaScript Runtime Performance

### Avoid Main Thread Blocking

Long synchronous computations block the UI. Move them off the main thread.

```tsx
// BAD: Blocks the main thread during render
function ExpensiveComponent({ data }: { data: RawData[] }) {
  // This runs synchronously every render
  const processed = data
    .filter(complexFilter)
    .map(complexTransform)
    .sort(complexSort); // 200ms+ on large datasets

  return <Chart data={processed} />;
}

// GOOD: Use useMemo to avoid recomputing
function ExpensiveComponent({ data }: { data: RawData[] }) {
  const processed = useMemo(() => {
    return data
      .filter(complexFilter)
      .map(complexTransform)
      .sort(complexSort);
  }, [data]);

  return <Chart data={processed} />;
}
```

### Web Workers for Heavy Computation

```tsx
// workers/process-data.ts
self.onmessage = (event: MessageEvent<RawData[]>) => {
  const result = heavyComputation(event.data);
  self.postMessage(result);
};

// hooks/use-worker.ts
export function useWorker<TInput, TOutput>(workerFactory: () => Worker) {
  const [result, setResult] = useState<TOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = workerFactory();
    workerRef.current.onmessage = (event: MessageEvent<TOutput>) => {
      setResult(event.data);
      setLoading(false);
    };
    return () => workerRef.current?.terminate();
  }, [workerFactory]);

  const process = useCallback((input: TInput) => {
    setLoading(true);
    workerRef.current?.postMessage(input);
  }, []);

  return { result, loading, process };
}
```

### Debounce Expensive Operations

```tsx
import { useDeferredValue, useState } from "react";

function SearchWithDeferred() {
  const [input, setInput] = useState("");
  // React deprioritizes rendering with the deferred value
  const deferredQuery = useDeferredValue(input);

  return (
    <div>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      {/* Results use the deferred value -- input stays responsive */}
      <SearchResults query={deferredQuery} />
    </div>
  );
}
```

---

## 8. Server Actions

Server Actions allow client components to call server-side functions directly without creating API routes.

```tsx
// actions/user.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
});

export async function updateProfile(formData: FormData) {
  const parsed = UpdateProfileSchema.safeParse({
    name: formData.get("name"),
    bio: formData.get("bio"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await db.user.update({
    where: { id: getCurrentUserId() },
    data: parsed.data,
  });

  revalidatePath("/profile");
  return { success: true };
}
```

```tsx
// components/profile-form.tsx
"use client";

import { useActionState } from "react";
import { updateProfile } from "@/actions/user";

export function ProfileForm() {
  const [state, action, isPending] = useActionState(updateProfile, null);

  return (
    <form action={action}>
      <input name="name" required />
      {state?.error?.name && <p className="text-red-500">{state.error.name}</p>}
      <textarea name="bio" />
      <button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
```

---

## 9. Error Boundaries

Error boundaries catch rendering errors and display fallback UI instead of crashing the entire page.

```tsx
// components/error-boundary.tsx
"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback: ReactNode | ((error: Error, reset: () => void) => ReactNode);
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error boundary caught:", error, info);
    // Report to error tracking service
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;
      if (typeof fallback === "function") {
        return fallback(this.state.error, this.reset);
      }
      return fallback;
    }
    return this.props.children;
  }
}

// Usage
<ErrorBoundary
  fallback={(error, reset) => (
    <div>
      <p>Something went wrong: {error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )}
>
  <RiskyComponent />
</ErrorBoundary>
```

### Next.js error.tsx Convention

```tsx
// app/dashboard/error.tsx
"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h2>Dashboard failed to load</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Retry</button>
    </div>
  );
}
```

---

## 10. React 19 Features

### use() Hook

The `use()` hook lets you read promises and context in render, replacing the need for useEffect-based data fetching patterns.

```tsx
import { use, Suspense } from "react";

// Pass a promise as a prop, read it with use()
function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise);
  return <div>{user.name}</div>;
}

// Parent creates the promise, child reads it
function Page() {
  const userPromise = fetchUser(); // starts immediately
  return (
    <Suspense fallback={<Skeleton />}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}
```

### useOptimistic

Instantly update the UI before the server confirms the change.

```tsx
"use client";

import { useOptimistic } from "react";
import { addTodo } from "@/actions/todos";

export function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (currentTodos: Todo[], newTodo: string) => [
      ...currentTodos,
      { id: crypto.randomUUID(), text: newTodo, pending: true },
    ]
  );

  async function handleSubmit(formData: FormData) {
    const text = formData.get("text") as string;
    addOptimisticTodo(text);  // UI updates immediately
    await addTodo(text);      // Server processes in background
  }

  return (
    <div>
      <form action={handleSubmit}>
        <input name="text" required />
        <button type="submit">Add</button>
      </form>
      <ul>
        {optimisticTodos.map((todo) => (
          <li key={todo.id} style={{ opacity: todo.pending ? 0.5 : 1 }}>
            {todo.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### useFormStatus

Access form submission state from any component inside the form.

```tsx
"use client";

import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Submitting..." : "Submit"}
    </button>
  );
}

// Works inside any form -- no prop drilling needed
function MyForm() {
  return (
    <form action={serverAction}>
      <input name="email" type="email" required />
      <SubmitButton />
    </form>
  );
}
```

---

## 11. Anti-Patterns

### NEVER

- Fetch data inside useEffect when a Server Component could do it
- Use `"use client"` at the top of every file -- default to Server Components
- Pass serializable data through context when props would work
- Create new objects or arrays in JSX props without memoizing them
- Use index as key for lists that can reorder, filter, or insert
- Import entire libraries when you need a single function
- Store derived state in useState -- compute it during render or with useMemo
- Nest client components deeply just to add one event handler
- Use `dangerouslySetInnerHTML` without sanitization
- Block the main thread with synchronous loops over large datasets

### ALWAYS

- Start with Server Components and push Client Components to the leaves
- Use Suspense boundaries around async components
- Parallelize independent data fetches with Promise.all
- Colocate state with the components that use it
- Use stable keys derived from data, not indices
- Validate all inputs on the server (Server Actions, API routes)
- Provide loading and error states for every async boundary
- Profile before optimizing -- use React DevTools Profiler
- Use `useTransition` for non-urgent state updates
- Keep Client Component bundles small -- lazy load heavy dependencies

---

## 12. Performance Checklist

Before shipping any React feature, verify:

- [ ] Data fetching happens in Server Components (not useEffect)
- [ ] Independent fetches run in parallel (Promise.all or separate Suspense)
- [ ] No barrel file imports pulling unused code into the bundle
- [ ] Heavy components are lazy loaded with dynamic imports
- [ ] Lists with more than 100 items use virtualization
- [ ] State is colocated -- not lifted higher than necessary
- [ ] Expensive computations are memoized with useMemo
- [ ] Callback props are stable with useCallback where memo is used
- [ ] Error boundaries wrap risky async boundaries
- [ ] Loading skeletons match the layout of the loaded content
- [ ] No layout shift on load (CLS score < 0.1)
- [ ] Largest Contentful Paint under 2.5 seconds
- [ ] Total JavaScript bundle under budget (check with bundle analyzer)
