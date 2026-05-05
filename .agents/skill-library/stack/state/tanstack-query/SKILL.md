---
name: tanstack-query
description: |
  Build with TanStack Query (React Query v5) — server state management with caching, mutations, optimistic updates, infinite queries, and SSR hydration. Use when: fetching/caching server data, performing mutations with cache invalidation, implementing optimistic UI, paginated/infinite scroll lists, prefetching, dependent queries, or integrating with Next.js SSR/RSC hydration patterns.
version: 1.0.0
---

# TanStack Query (React Query v5)

**Status**: Production Ready
**Last Updated**: 2026-02-16
**Package**: `@tanstack/react-query@5.x`

---

## Setup

### Installation

```bash
pnpm add @tanstack/react-query
pnpm add -D @tanstack/react-query-devtools  # Optional but recommended
```

### QueryClientProvider

```typescript
// src/providers/query-provider.tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Create client inside useState to avoid sharing between requests in SSR
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute — data considered fresh
            gcTime: 5 * 60 * 1000, // 5 minutes — unused cache garbage collected
            retry: 3,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
          mutations: {
            retry: 0, // Do not retry mutations by default
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

---

## useQuery Patterns

### Basic Query

```typescript
import { useQuery } from "@tanstack/react-query";

function UserProfile({ userId }: { userId: string }) {
  const { data, isPending, isError, error, isFetching } = useQuery({
    queryKey: ["users", userId],
    queryFn: () => fetch(`/api/users/${userId}`).then((res) => res.json()),
    staleTime: 5 * 60 * 1000, // Override default per-query
    enabled: !!userId, // Only fetch when userId is truthy
  });

  if (isPending) return <Skeleton />;
  if (isError) return <ErrorDisplay error={error} />;

  return <div>{data.name}</div>;
}
```

### Query Key Conventions

```typescript
// Hierarchical keys — most specific last
["users"]                        // All users list
["users", userId]                // Single user
["users", userId, "posts"]       // User's posts
["users", { status: "active" }]  // Filtered list
["posts", postId, "comments"]    // Post comments

// Invalidation cascades up the hierarchy:
// invalidateQueries({ queryKey: ["users"] })
// ^^^ invalidates ALL queries starting with ["users"]
```

### Query Function with Type Safety

```typescript
// src/lib/api.ts
import { z } from "zod";

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});
type User = z.infer<typeof UserSchema>;

async function fetchUser(userId: string): Promise<User> {
  const res = await fetch(`/api/users/${userId}`);
  if (!res.ok) throw new Error(`Failed to fetch user: ${res.status}`);
  const data = await res.json();
  return UserSchema.parse(data); // Runtime validation
}

// src/hooks/use-user.ts
export function useUser(userId: string) {
  return useQuery({
    queryKey: ["users", userId],
    queryFn: () => fetchUser(userId),
    enabled: !!userId,
  });
}
```

---

## useMutation Patterns

### Basic Mutation with Cache Invalidation

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";

function CreatePostForm() {
  const queryClient = useQueryClient();

  const createPost = useMutation({
    mutationFn: (newPost: { title: string; body: string }) =>
      fetch("/api/posts", {
        method: "POST",
        body: JSON.stringify(newPost),
        headers: { "Content-Type": "application/json" },
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to create post");
        return res.json();
      }),
    onSuccess: (data) => {
      // Invalidate and refetch posts list
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      // Optionally seed the cache for the new post
      queryClient.setQueryData(["posts", data.id], data);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        createPost.mutate({ title, body });
      }}
    >
      <button disabled={createPost.isPending}>
        {createPost.isPending ? "Creating..." : "Create Post"}
      </button>
    </form>
  );
}
```

### Optimistic Updates

```typescript
const updateTodo = useMutation({
  mutationFn: (updatedTodo: Todo) =>
    fetch(`/api/todos/${updatedTodo.id}`, {
      method: "PATCH",
      body: JSON.stringify(updatedTodo),
    }).then((res) => res.json()),

  onMutate: async (newTodo) => {
    // Cancel any outgoing refetches to avoid overwriting optimistic update
    await queryClient.cancelQueries({ queryKey: ["todos", newTodo.id] });

    // Snapshot previous value for rollback
    const previousTodo = queryClient.getQueryData<Todo>(["todos", newTodo.id]);

    // Optimistically update the cache
    queryClient.setQueryData(["todos", newTodo.id], newTodo);

    // Return context with snapshot for rollback
    return { previousTodo };
  },

  onError: (_err, _newTodo, context) => {
    // Rollback on error
    if (context?.previousTodo) {
      queryClient.setQueryData(["todos", context.previousTodo.id], context.previousTodo);
    }
  },

  onSettled: (_data, _error, variables) => {
    // Always refetch after mutation to ensure server state consistency
    queryClient.invalidateQueries({ queryKey: ["todos", variables.id] });
  },
});
```

### Optimistic Update on a List

```typescript
const deleteTodo = useMutation({
  mutationFn: (todoId: string) =>
    fetch(`/api/todos/${todoId}`, { method: "DELETE" }),

  onMutate: async (todoId) => {
    await queryClient.cancelQueries({ queryKey: ["todos"] });

    const previousTodos = queryClient.getQueryData<Todo[]>(["todos"]);

    queryClient.setQueryData<Todo[]>(["todos"], (old) =>
      old?.filter((t) => t.id !== todoId) ?? []
    );

    return { previousTodos };
  },

  onError: (_err, _todoId, context) => {
    queryClient.setQueryData(["todos"], context?.previousTodos);
  },

  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["todos"] });
  },
});
```

---

## Query Invalidation Strategies

```typescript
const queryClient = useQueryClient();

// Invalidate everything
queryClient.invalidateQueries();

// Invalidate all queries starting with "posts"
queryClient.invalidateQueries({ queryKey: ["posts"] });

// Invalidate a specific post
queryClient.invalidateQueries({ queryKey: ["posts", postId] });

// Invalidate only active (mounted) queries
queryClient.invalidateQueries({ queryKey: ["posts"], type: "active" });

// Invalidate with predicate for fine-grained control
queryClient.invalidateQueries({
  predicate: (query) =>
    query.queryKey[0] === "posts" &&
    (query.queryKey[1] as any)?.status === "draft",
});

// Reset queries — clear cache AND refetch
queryClient.resetQueries({ queryKey: ["posts"] });

// Remove queries — clear cache without refetching
queryClient.removeQueries({ queryKey: ["posts"] });
```

---

## Infinite Queries

```typescript
import { useInfiniteQuery } from "@tanstack/react-query";

interface PostsPage {
  posts: Post[];
  nextCursor: string | null;
}

function PostFeed() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useInfiniteQuery({
    queryKey: ["posts", "feed"],
    queryFn: ({ pageParam }): Promise<PostsPage> =>
      fetch(`/api/posts?cursor=${pageParam}&limit=20`).then((r) => r.json()),
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    // getPreviousPageParam for bidirectional scrolling
  });

  // Flatten pages into single list
  const allPosts = data?.pages.flatMap((page) => page.posts) ?? [];

  return (
    <div>
      {allPosts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? "Loading more..." : "Load More"}
        </button>
      )}
    </div>
  );
}
```

---

## Prefetching

### In Event Handlers (Hover Prefetch)

```typescript
function PostLink({ postId }: { postId: string }) {
  const queryClient = useQueryClient();

  const prefetch = () => {
    queryClient.prefetchQuery({
      queryKey: ["posts", postId],
      queryFn: () => fetchPost(postId),
      staleTime: 5 * 60 * 1000, // Only prefetch if data older than 5 min
    });
  };

  return (
    <Link href={`/posts/${postId}`} onMouseEnter={prefetch}>
      View Post
    </Link>
  );
}
```

### In Loaders / Server Components (Next.js)

```typescript
// src/app/posts/[id]/page.tsx
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";

export default async function PostPage({ params }: { params: { id: string } }) {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["posts", params.id],
    queryFn: () => fetchPost(params.id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostContent postId={params.id} />
    </HydrationBoundary>
  );
}
```

---

## Dependent Queries

```typescript
function UserPosts({ userId }: { userId: string }) {
  // First query: fetch user
  const userQuery = useQuery({
    queryKey: ["users", userId],
    queryFn: () => fetchUser(userId),
  });

  // Second query: fetch posts only after user loaded
  const postsQuery = useQuery({
    queryKey: ["users", userId, "posts"],
    queryFn: () => fetchPostsByTeam(userQuery.data!.teamId),
    enabled: !!userQuery.data?.teamId, // Only runs when teamId is available
  });

  // ...
}
```

---

## Parallel Queries

```typescript
import { useQueries } from "@tanstack/react-query";

function Dashboard({ userIds }: { userIds: string[] }) {
  const userQueries = useQueries({
    queries: userIds.map((id) => ({
      queryKey: ["users", id],
      queryFn: () => fetchUser(id),
      staleTime: Infinity,
    })),
    combine: (results) => ({
      data: results.map((r) => r.data).filter(Boolean),
      isPending: results.some((r) => r.isPending),
    }),
  });

  if (userQueries.isPending) return <Skeleton />;
  return <UserList users={userQueries.data} />;
}
```

---

## Query Cancellation

```typescript
// queryFn receives an AbortSignal for automatic cancellation
const { data } = useQuery({
  queryKey: ["search", debouncedTerm],
  queryFn: ({ signal }) =>
    fetch(`/api/search?q=${debouncedTerm}`, { signal }).then((r) => r.json()),
  enabled: debouncedTerm.length > 2,
});

// Manual cancellation
queryClient.cancelQueries({ queryKey: ["search"] });
```

---

## Suspense Integration

```typescript
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";

function PostContent({ postId }: { postId: string }) {
  // Throws promise — caught by nearest Suspense boundary
  const { data } = useSuspenseQuery({
    queryKey: ["posts", postId],
    queryFn: () => fetchPost(postId),
  });

  // data is guaranteed non-null here
  return <article>{data.title}</article>;
}

// Parent component
function PostPage({ postId }: { postId: string }) {
  return (
    <Suspense fallback={<PostSkeleton />}>
      <PostContent postId={postId} />
    </Suspense>
  );
}
```

---

## SSR / Hydration (Next.js App Router)

```typescript
// src/app/posts/page.tsx — Server Component
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { PostList } from "./post-list";

export default async function PostsPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["posts"],
    queryFn: fetchPosts,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostList /> {/* Client component — useQuery picks up prefetched data */}
    </HydrationBoundary>
  );
}
```

---

## Cache Manipulation

```typescript
const queryClient = useQueryClient();

// Read cache
const cachedUser = queryClient.getQueryData<User>(["users", userId]);

// Write cache directly (no refetch)
queryClient.setQueryData<User>(["users", userId], (old) => ({
  ...old!,
  name: "Updated Name",
}));

// Ensure data exists (fetch if missing, return cached if present)
const user = await queryClient.ensureQueryData({
  queryKey: ["users", userId],
  queryFn: () => fetchUser(userId),
});
```

---

## Retry and Error Handling

```typescript
useQuery({
  queryKey: ["data"],
  queryFn: fetchData,
  retry: 3, // Retry 3 times on failure
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
});

// Global error handler
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Do not retry on 4xx errors
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Global error toast for background refetch failures
      if (query.state.data !== undefined) {
        toast.error(`Background update failed: ${error.message}`);
      }
    },
  }),
});
```

---

## Placeholder Data vs Initial Data

```typescript
// placeholderData — shown while real data loads, NOT put in cache
useQuery({
  queryKey: ["posts", postId],
  queryFn: () => fetchPost(postId),
  placeholderData: { id: postId, title: "Loading...", body: "" },
  // isPlaceholderData === true while showing placeholder
});

// Use cached list data as placeholder for detail view
useQuery({
  queryKey: ["posts", postId],
  queryFn: () => fetchPost(postId),
  placeholderData: () =>
    queryClient.getQueryData<Post[]>(["posts"])?.find((p) => p.id === postId),
});

// initialData — treated as real data, IS cached, affects staleTime
useQuery({
  queryKey: ["posts", postId],
  queryFn: () => fetchPost(postId),
  initialData: () =>
    queryClient.getQueryData<Post[]>(["posts"])?.find((p) => p.id === postId),
  initialDataUpdatedAt: () =>
    queryClient.getQueryState(["posts"])?.dataUpdatedAt,
});
```

---

## Custom Hook Composition

```typescript
// src/hooks/use-posts.ts
export function usePosts(filters?: PostFilters) {
  return useQuery({
    queryKey: ["posts", filters ?? {}],
    queryFn: () => fetchPosts(filters),
    staleTime: 30 * 1000,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: (_data, postId) => {
      queryClient.removeQueries({ queryKey: ["posts", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
```

---

## Anti-Patterns

| Anti-Pattern | Why It Breaks | Correct Approach |
|---|---|---|
| Putting derived/computed state in queryKey | Causes unnecessary refetches | Compute from cached data with `select` |
| Using `queryClient` in render without hooks | Breaks React rules, stale references | Use `useQueryClient()` hook |
| Setting `staleTime: 0` everywhere | Excessive network requests, poor UX | Set reasonable staleTime per data type |
| Not using `enabled` for conditional queries | Fires with undefined params, causes errors | Set `enabled: !!param` |
| Storing client state in React Query | Wrong tool — it is for server state | Use useState, Zustand, or Jotai for client state |
| Calling `queryClient.invalidateQueries()` with no key | Invalidates the entire cache | Always scope invalidation to specific keys |
| Mutating cached data directly | Bypasses React Query reactivity | Use `setQueryData` with immutable updates |
| Creating QueryClient outside component/useState | Shared across SSR requests, data leaks | Use `useState(() => new QueryClient())` |
| Forgetting `onSettled` invalidation in optimistic updates | Cache gets stuck with stale optimistic data | Always invalidate in onSettled |
| Using string query keys | No hierarchy, cannot invalidate groups | Use array keys: `["entity", id]` |

---

**Last verified**: 2026-02-16 | **Skill version**: 1.0.0
