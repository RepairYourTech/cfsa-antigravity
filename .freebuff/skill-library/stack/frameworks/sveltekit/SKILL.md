---
name: sveltekit
description: Comprehensive SvelteKit skill covering file-based routing, layouts, load functions, form actions, server hooks, page options (SSR, CSR, prerender), environment variables, stores, error handling, adapter configuration, and deployment. Use when building applications with SvelteKit.
version: 1.0.0
---

# SvelteKit

Full-stack framework for Svelte with file-based routing, server-side rendering, form actions, and flexible deployment targets via adapters.

## Project Structure

```
src/
  app.html                 # HTML template
  app.d.ts                 # Generated types
  hooks.server.ts          # Server hooks (runs on every request)
  hooks.client.ts          # Client hooks
  lib/                     # Shared library code ($lib alias)
    components/
    server/                # Server-only code ($lib/server)
      db.ts
    utils.ts
  params/                  # Parameter matchers
    integer.ts
  routes/                  # File-based routing
    +layout.svelte         # Root layout
    +layout.server.ts      # Root layout data
    +page.svelte           # Home page
    +page.server.ts        # Home page server data
    +error.svelte          # Error page
    about/
      +page.svelte
    blog/
      +page.svelte
      +page.server.ts
      [slug]/
        +page.svelte
        +page.server.ts
    api/
      health/
        +server.ts         # API endpoint
static/                    # Static assets
svelte.config.js           # SvelteKit configuration
vite.config.ts             # Vite configuration
```

## Routing

### Basic Pages

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<h1>Welcome</h1>
<p>{data.message}</p>
```

### Dynamic Routes

```
src/routes/
  blog/[slug]/+page.svelte           # /blog/my-post
  users/[id=integer]/+page.svelte     # /users/123 (with param matcher)
  [...catchall]/+page.svelte          # Catch-all route
  [[optional]]/+page.svelte           # Optional parameter
  (marketing)/pricing/+page.svelte    # Route group (no URL segment)
  (marketing)/about/+page.svelte      # Shares (marketing) layout
```

### Parameter Matchers

```typescript
// src/params/integer.ts
import type { ParamMatcher } from '@sveltejs/kit';

export const match: ParamMatcher = (param) => {
  return /^\d+$/.test(param);
};
```

### Layouts

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import type { LayoutData } from './$types';
  import { Snippet } from 'svelte';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<nav>
  <a href="/">Home</a>
  <a href="/about">About</a>
  {#if data.user}
    <span>{data.user.name}</span>
  {/if}
</nav>

<main>
  {@render children()}
</main>
```

### Route Groups

Route groups `(groupname)` share a layout without affecting the URL:

```
src/routes/
  (auth)/
    +layout.svelte      # Shared auth layout (centered card)
    login/+page.svelte   # /login
    register/+page.svelte # /register
  (app)/
    +layout.svelte      # Shared app layout (sidebar + nav)
    dashboard/+page.svelte # /dashboard
    settings/+page.svelte  # /settings
```

## Load Functions

### Server Load (+page.server.ts)

Runs only on the server. Has access to database, secrets, and server-only modules.

```typescript
// src/routes/blog/+page.server.ts
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ url, locals }) => {
  const page = parseInt(url.searchParams.get('page') ?? '1');
  const perPage = 20;

  const [posts, total] = await Promise.all([
    db.post.findMany({
      where: { published: true },
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: { createdAt: 'desc' },
    }),
    db.post.count({ where: { published: true } }),
  ]);

  return {
    posts,
    total,
    page,
    perPage,
    user: locals.user, // set in hooks.server.ts
  };
};
```

### Universal Load (+page.ts)

Runs on both server (SSR) and client (navigation). Cannot use server-only modules.

```typescript
// src/routes/blog/[slug]/+page.ts
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
  // This `fetch` is enhanced — deduplicates during SSR, includes cookies
  const response = await fetch(`/api/posts/${params.slug}`);

  if (!response.ok) {
    throw error(404, 'Post not found');
  }

  const post = await response.json();
  return { post };
};
```

### Layout Load

```typescript
// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  return {
    user: locals.user ?? null,
  };
};
```

**Data flow**: Layout data is available to all child pages. If the layout returns `{ user }`, every page under it can access `data.user`.

### Streaming with Promises

```typescript
// src/routes/dashboard/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  return {
    // This resolves immediately
    quickData: await db.getSummary(),
    // This streams to the client as it resolves
    slowData: db.getDetailedReport(),
  };
};
```

```svelte
<!-- src/routes/dashboard/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

<h1>Summary: {data.quickData.title}</h1>

{#await data.slowData}
  <p>Loading detailed report...</p>
{:then report}
  <Report data={report} />
{:catch error}
  <p>Failed to load report: {error.message}</p>
{/await}
```

## Form Actions

### Server-Side Actions

```typescript
// src/routes/blog/new/+page.server.ts
import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/server/db';

const PostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required').max(50000),
  published: z.coerce.boolean().default(false),
});

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');
  return {};
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });

    const formData = await request.formData();
    const raw = Object.fromEntries(formData);

    const result = PostSchema.safeParse(raw);
    if (!result.success) {
      return fail(422, {
        data: raw,
        errors: result.error.flatten().fieldErrors,
      });
    }

    const post = await db.post.create({
      data: {
        ...result.data,
        authorId: locals.user.id,
      },
    });

    throw redirect(303, `/blog/${post.slug}`);
  },
};
```

### Form Component

```svelte
<!-- src/routes/blog/new/+page.svelte -->
<script lang="ts">
  import type { ActionData } from './$types';
  import { enhance } from '$app/forms';

  let { form }: { form: ActionData } = $props();
</script>

<form method="POST" use:enhance>
  <div>
    <label for="title">Title</label>
    <input id="title" name="title" value={form?.data?.title ?? ''} />
    {#if form?.errors?.title}
      <p class="error">{form.errors.title[0]}</p>
    {/if}
  </div>

  <div>
    <label for="content">Content</label>
    <textarea id="content" name="content">{form?.data?.content ?? ''}</textarea>
    {#if form?.errors?.content}
      <p class="error">{form.errors.content[0]}</p>
    {/if}
  </div>

  <label>
    <input type="checkbox" name="published" value="true" />
    Publish immediately
  </label>

  <button type="submit">Create Post</button>
</form>
```

### Named Actions

```typescript
// +page.server.ts
export const actions: Actions = {
  create: async ({ request }) => { /* ... */ },
  delete: async ({ request }) => { /* ... */ },
};
```

```svelte
<form method="POST" action="?/create" use:enhance>
  <!-- create form -->
</form>

<form method="POST" action="?/delete" use:enhance>
  <input type="hidden" name="id" value={post.id} />
  <button type="submit">Delete</button>
</form>
```

### Progressive Enhancement

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';

  let loading = $state(false);
</script>

<form
  method="POST"
  use:enhance={() => {
    loading = true;
    return async ({ update }) => {
      loading = false;
      await update(); // update form state from server response
    };
  }}
>
  <button type="submit" disabled={loading}>
    {loading ? 'Saving...' : 'Save'}
  </button>
</form>
```

## Server Hooks

```typescript
// src/hooks.server.ts
import type { Handle, HandleServerError, HandleFetch } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { db } from '$lib/server/db';

// Authentication hook
const auth: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get('session_id');

  if (sessionId) {
    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (session && session.expiresAt > new Date()) {
      event.locals.user = session.user;
    } else {
      event.cookies.delete('session_id', { path: '/' });
    }
  }

  return resolve(event);
};

// Security headers hook
const securityHeaders: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );

  return response;
};

// Compose hooks in order
export const handle: Handle = sequence(auth, securityHeaders);

// Global error handler (server-side)
export const handleError: HandleServerError = async ({ error, event, status, message }) => {
  const errorId = crypto.randomUUID();
  console.error(`Error ${errorId}:`, error);

  return {
    message: 'An unexpected error occurred',
    errorId,
  };
};

// Custom fetch behavior (for load functions)
export const handleFetch: HandleFetch = async ({ request, fetch }) => {
  // Rewrite internal API calls to bypass network
  if (request.url.startsWith('https://api.example.com/')) {
    request = new Request(
      request.url.replace('https://api.example.com/', 'http://localhost:3000/api/'),
      request
    );
  }
  return fetch(request);
};
```

### App.d.ts (Type Declarations)

```typescript
// src/app.d.ts
declare global {
  namespace App {
    interface Error {
      message: string;
      errorId?: string;
    }
    interface Locals {
      user: {
        id: string;
        email: string;
        name: string;
        role: 'admin' | 'user';
      } | null;
    }
    interface PageData {
      user: App.Locals['user'];
    }
    interface Platform {}
  }
}

export {};
```

## API Endpoints

```typescript
// src/routes/api/posts/+server.ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
  const page = parseInt(url.searchParams.get('page') ?? '1');
  const posts = await db.post.findMany({
    skip: (page - 1) * 20,
    take: 20,
  });
  return json(posts);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  const body = await request.json();
  const post = await db.post.create({
    data: { ...body, authorId: locals.user.id },
  });

  return json(post, { status: 201 });
};
```

## Page Options

```typescript
// Per-page options in +page.ts or +page.server.ts
export const prerender = true;    // Static HTML at build time
export const ssr = true;          // Server-side render (default: true)
export const csr = true;          // Client-side render (default: true)
export const trailingSlash = 'never'; // 'always' | 'never' | 'ignore'
```

| Combination | Result |
|------------|--------|
| `prerender = true` | Static HTML generated at build time |
| `ssr = true, csr = true` | SSR + hydrate on client (default) |
| `ssr = false, csr = true` | SPA mode (client-only rendering) |
| `ssr = true, csr = false` | Server-only (no JavaScript sent to client) |

## Environment Variables

```typescript
// Static (replaced at build time) — must not contain secrets
import { PUBLIC_API_URL } from '$env/static/public';

// Static (replaced at build time) — server-only
import { DATABASE_URL, JWT_SECRET } from '$env/static/private';

// Dynamic (read at runtime) — for adapters that support it
import { env } from '$env/dynamic/private';
const dbUrl = env.DATABASE_URL;

import { env as publicEnv } from '$env/dynamic/public';
const apiUrl = publicEnv.PUBLIC_API_URL;
```

**CRITICAL**: `$env/static/private` and `$env/dynamic/private` can only be imported in server-side files (`+page.server.ts`, `+server.ts`, `hooks.server.ts`, `$lib/server/`). Importing them in client code causes a build error.

## Error Handling

### Error Pages

```svelte
<!-- src/routes/+error.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
</script>

<h1>{$page.status}</h1>
<p>{$page.error?.message}</p>

{#if $page.status === 404}
  <a href="/">Go home</a>
{/if}
```

### Throwing Errors

```typescript
import { error, redirect } from '@sveltejs/kit';

// In load functions or actions
throw error(404, 'Not found');
throw error(403, { message: 'Forbidden', errorId: 'abc-123' });
throw redirect(303, '/login');
```

## Adapter Configuration

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-auto'; // auto-detect platform
// import adapter from '@sveltejs/adapter-node';
// import adapter from '@sveltejs/adapter-vercel';
// import adapter from '@sveltejs/adapter-cloudflare';
// import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({
      // Node adapter options
      // out: 'build',
      // precompress: true,
      // envPrefix: '',
    }),
    alias: {
      $components: 'src/lib/components',
      $stores: 'src/lib/stores',
    },
    csrf: {
      checkOrigin: true, // default: true — protects against CSRF
    },
  },
};

export default config;
```

| Adapter | Platform | Features |
|---------|----------|----------|
| `adapter-auto` | Auto-detect | Detects Vercel, Netlify, Cloudflare |
| `adapter-node` | Node.js server | Long-running server, WebSockets |
| `adapter-vercel` | Vercel | Serverless, edge, ISR |
| `adapter-cloudflare` | Cloudflare Pages | Workers, KV, D1 |
| `adapter-static` | Any static host | Full prerendering, no server |

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|-----------------|
| Importing `$env/static/private` in shared code | Keep private env in `$lib/server/` or server-side files only |
| Using `fetch('/api/...')` in server load functions | Call database directly; use `fetch` only for external APIs |
| Putting auth checks in `+page.svelte` only | Check auth in `+page.server.ts` or `hooks.server.ts`, redirect early |
| Not using `use:enhance` on forms | Always use progressive enhancement for better UX |
| Returning non-serializable data from load | Load functions must return plain objects (no class instances, functions) |
| Using `+page.ts` for database access | Use `+page.server.ts` for anything that touches secrets or databases |
| Large `hooks.server.ts` without `sequence()` | Split hooks into focused functions, compose with `sequence()` |
| Ignoring the `+error.svelte` boundary | Always provide error pages at root and nested layout levels |
| Not typing `app.d.ts` | Always define `Locals`, `PageData`, and `Error` interfaces |
| Using `onMount` for data fetching | Use load functions; `onMount` runs only on client, loses SSR benefits |
