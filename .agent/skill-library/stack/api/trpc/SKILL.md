---
name: trpc
description: Comprehensive tRPC skill covering router definition, procedures (query, mutation, subscription), input validation with Zod, context, middleware, error handling, client setup, batching, React Query integration, SSR, inference helpers, and testing. Use when building end-to-end typesafe APIs with tRPC.
version: 1.0.0
---

# tRPC

End-to-end typesafe APIs for TypeScript. Define procedures on the server, call them from the client with full type inference -- no code generation, no runtime overhead.

## Server Setup

### Initialize tRPC

```typescript
// src/server/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';

export interface Context {
  user: { id: string; role: 'admin' | 'user' } | null;
  db: DatabaseClient;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson, // enables Date, Map, Set serialization
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
export const createCallerFactory = t.createCallerFactory;
```

### Context Creation

```typescript
// src/server/context.ts
import type { CreateNextContextOptions } from '@trpc/server/adapters/next';
import type { Context } from './trpc';
import { db } from './db';
import { verifyToken } from './auth';

export async function createContext(opts: CreateNextContextOptions): Promise<Context> {
  const token = opts.req.headers.authorization?.replace('Bearer ', '');
  const user = token ? await verifyToken(token) : null;

  return { user, db };
}
```

## Router Definition

### Basic Router

```typescript
// src/server/routers/post.ts
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const postRouter = router({
  list: publicProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(100).default(20),
        search: z.string().max(100).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { page, perPage, search } = input;
      const offset = (page - 1) * perPage;

      const [posts, total] = await Promise.all([
        ctx.db.post.findMany({
          where: search ? { title: { contains: search } } : undefined,
          skip: offset,
          take: perPage,
          orderBy: { createdAt: 'desc' },
        }),
        ctx.db.post.count({
          where: search ? { title: { contains: search } } : undefined,
        }),
      ]);

      return { posts, total, page, perPage };
    }),

  byId: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const post = await ctx.db.post.findUnique({ where: { id: input.id } });
      if (!post) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' });
      }
      return post;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        content: z.string().min(1).max(50000),
        published: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.post.create({
        data: { ...input, authorId: ctx.user.id },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        content: z.string().min(1).max(50000).optional(),
        published: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const post = await ctx.db.post.findUnique({ where: { id } });

      if (!post) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      if (post.authorId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      return ctx.db.post.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const post = await ctx.db.post.findUnique({ where: { id: input.id } });

      if (!post) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      if (post.authorId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      await ctx.db.post.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
```

### Root Router

```typescript
// src/server/routers/_app.ts
import { router } from '../trpc';
import { postRouter } from './post';
import { userRouter } from './user';

export const appRouter = router({
  post: postRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
```

## Middleware

### Authentication Middleware

```typescript
// src/server/trpc.ts
const isAuthed = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  return next({
    ctx: {
      user: ctx.user, // user is now non-nullable in downstream procedures
    },
  });
});

export const protectedProcedure = publicProcedure.use(isAuthed);
```

### Role-Based Access

```typescript
const requireRole = (role: 'admin' | 'user') =>
  middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    if (ctx.user.role !== role && ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: `Requires ${role} role` });
    }
    return next({ ctx: { user: ctx.user } });
  });

export const adminProcedure = publicProcedure.use(requireRole('admin'));
```

### Logging Middleware

```typescript
const logger = middleware(async ({ path, type, next }) => {
  const start = performance.now();
  const result = await next();
  const duration = performance.now() - start;

  if (result.ok) {
    console.log(`[${type}] ${path} - OK - ${duration.toFixed(0)}ms`);
  } else {
    console.error(`[${type}] ${path} - ERROR - ${duration.toFixed(0)}ms`);
  }

  return result;
});

// Apply to all procedures
export const publicProcedure = t.procedure.use(logger);
```

## Client Setup

### Next.js App Router Integration

```typescript
// src/trpc/server.ts — server-side caller
import { createCallerFactory } from '../server/trpc';
import { appRouter } from '../server/routers/_app';
import { createContext } from '../server/context';

const createCaller = createCallerFactory(appRouter);

export async function getServerCaller() {
  const ctx = await createContext();
  return createCaller(ctx);
}

// Usage in Server Component:
// const trpc = await getServerCaller();
// const posts = await trpc.post.list({ page: 1 });
```

### React Client Setup

```typescript
// src/trpc/client.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../server/routers/_app';

export const trpc = createTRPCReact<AppRouter>();
```

```typescript
// src/trpc/provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, loggerLink } from '@trpc/client';
import { trpc } from './client';
import superjson from 'superjson';
import { useState } from 'react';

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        loggerLink({ enabled: () => process.env.NODE_ENV === 'development' }),
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
          headers() {
            return {
              // Add auth headers here
            };
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
```

### API Handler (Next.js App Router)

```typescript
// app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers/_app';
import { createContext } from '@/server/context';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext(req),
  });

export { handler as GET, handler as POST };
```

## Client Usage (React)

### Queries

```typescript
'use client';

import { trpc } from '@/trpc/client';

function PostList() {
  const { data, isLoading, error } = trpc.post.list.useQuery({
    page: 1,
    perPage: 10,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data.posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

### Mutations

```typescript
function CreatePostForm() {
  const utils = trpc.useUtils();

  const createPost = trpc.post.create.useMutation({
    onSuccess() {
      // Invalidate the list query to refetch
      utils.post.list.invalidate();
    },
    onError(error) {
      if (error.data?.zodError) {
        // Handle validation errors
        const fieldErrors = error.data.zodError.fieldErrors;
        console.log(fieldErrors);
      }
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createPost.mutate({
      title: formData.get('title') as string,
      content: formData.get('content') as string,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" required />
      <textarea name="content" required />
      <button type="submit" disabled={createPost.isPending}>
        {createPost.isPending ? 'Creating...' : 'Create Post'}
      </button>
    </form>
  );
}
```

### Optimistic Updates

```typescript
const deletePost = trpc.post.delete.useMutation({
  onMutate: async ({ id }) => {
    await utils.post.list.cancel();
    const previousData = utils.post.list.getData({ page: 1 });

    utils.post.list.setData({ page: 1 }, (old) => {
      if (!old) return old;
      return {
        ...old,
        posts: old.posts.filter((p) => p.id !== id),
        total: old.total - 1,
      };
    });

    return { previousData };
  },
  onError: (_err, _vars, context) => {
    if (context?.previousData) {
      utils.post.list.setData({ page: 1 }, context.previousData);
    }
  },
  onSettled: () => {
    utils.post.list.invalidate();
  },
});
```

## Subscriptions (WebSocket)

```typescript
// Server
import { observable } from '@trpc/server/observable';

export const chatRouter = router({
  onMessage: publicProcedure
    .input(z.object({ roomId: z.string() }))
    .subscription(({ input }) => {
      return observable<{ text: string; userId: string }>((emit) => {
        const handler = (message: ChatMessage) => {
          if (message.roomId === input.roomId) {
            emit.next({ text: message.text, userId: message.userId });
          }
        };
        chatEmitter.on('message', handler);
        return () => chatEmitter.off('message', handler);
      });
    }),
});

// Client (requires wsLink instead of httpBatchLink)
import { wsLink, createWSClient } from '@trpc/client';

const wsClient = createWSClient({ url: 'ws://localhost:3001' });

// In component
trpc.chat.onMessage.useSubscription(
  { roomId: 'room-1' },
  {
    onData(message) {
      setMessages((prev) => [...prev, message]);
    },
    onError(err) {
      console.error('Subscription error:', err);
    },
  }
);
```

## Type Inference Helpers

```typescript
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from './server/routers/_app';

// Infer input/output types from the router
type RouterInputs = inferRouterInputs<AppRouter>;
type RouterOutputs = inferRouterOutputs<AppRouter>;

// Use in components or utilities
type PostListInput = RouterInputs['post']['list'];
type PostListOutput = RouterOutputs['post']['list'];
type Post = RouterOutputs['post']['byId'];
```

## Testing

```typescript
// tests/post.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createCallerFactory } from '../src/server/trpc';
import { appRouter } from '../src/server/routers/_app';
import { createTestContext } from './helpers';

const createCaller = createCallerFactory(appRouter);

describe('post router', () => {
  let caller: ReturnType<typeof createCaller>;
  let authedCaller: ReturnType<typeof createCaller>;

  beforeEach(async () => {
    const ctx = await createTestContext({ user: null });
    caller = createCaller(ctx);

    const authedCtx = await createTestContext({
      user: { id: 'user-1', role: 'user' },
    });
    authedCaller = createCaller(authedCtx);
  });

  it('lists posts without authentication', async () => {
    const result = await caller.post.list({ page: 1 });
    expect(result.posts).toBeDefined();
    expect(result.total).toBeGreaterThanOrEqual(0);
  });

  it('creates a post when authenticated', async () => {
    const post = await authedCaller.post.create({
      title: 'Test Post',
      content: 'Test content',
    });
    expect(post.title).toBe('Test Post');
    expect(post.authorId).toBe('user-1');
  });

  it('rejects create when unauthenticated', async () => {
    await expect(
      caller.post.create({ title: 'Test', content: 'Body' })
    ).rejects.toThrow('UNAUTHORIZED');
  });

  it('rejects invalid input', async () => {
    await expect(
      authedCaller.post.create({ title: '', content: 'Body' })
    ).rejects.toThrow();
  });
});
```

## Error Handling

### tRPC Error Codes

| Code | HTTP Status | When to Use |
|------|------------|-------------|
| `BAD_REQUEST` | 400 | Invalid input beyond Zod validation |
| `UNAUTHORIZED` | 401 | No authentication provided |
| `FORBIDDEN` | 403 | Authenticated but insufficient permissions |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Duplicate resource or state conflict |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|-----------------|
| Defining input schemas inline without reuse | Extract shared schemas to a `schemas/` directory |
| Putting business logic in procedures | Extract to service layer, keep procedures thin |
| Not using `superjson` transformer | Use superjson for Date, Map, Set, BigInt serialization |
| Using `any` for context type | Define a typed `Context` interface |
| Catching errors inside procedures to return success | Throw `TRPCError` and let the error formatter handle it |
| Not invalidating queries after mutations | Use `utils.[router].[procedure].invalidate()` after mutations |
| Creating one massive router file | Split into domain-specific routers and merge with `router()` |
| Using REST-style paths in procedure names | Use verb-less names: `post.list`, `post.byId`, not `post.getList` |
| Skipping input validation | Always use Zod `.input()` even for simple queries |
| Importing server code in client bundles | Only import `type AppRouter`, never the actual router |
