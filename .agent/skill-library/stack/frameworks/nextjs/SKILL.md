---
name: nextjs
description: "Comprehensive Next.js App Router guide covering server/client components, data fetching, rendering strategies, middleware, optimization, and deployment. Use when building Next.js applications, choosing rendering strategies, implementing data fetching patterns, or configuring deployment."
version: 1.0.0
---

# Next.js Framework

## 1. App Router Architecture

### Directory Structure

```
app/
  layout.tsx              # Root layout (wraps entire app)
  page.tsx                # Home page (/)
  loading.tsx             # Loading UI for the root segment
  error.tsx               # Error boundary for the root segment
  not-found.tsx           # 404 page
  global-error.tsx        # Global error boundary (catches layout errors)
  dashboard/
    layout.tsx            # Nested layout for /dashboard/*
    page.tsx              # /dashboard
    loading.tsx           # Loading UI for dashboard segment
    settings/
      page.tsx            # /dashboard/settings
  blog/
    page.tsx              # /blog
    [slug]/
      page.tsx            # /blog/:slug (dynamic segment)
  api/
    users/
      route.ts            # API route: /api/users
```

### Layouts

Layouts wrap child segments and preserve state across navigations. The root layout is required and must contain `<html>` and `<body>` tags.

```tsx
// app/layout.tsx -- Root layout (required)
import { type Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'My App', template: '%s | My App' },
  description: 'Application description',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

// app/dashboard/layout.tsx -- Nested layout
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <nav className="w-64 border-r"><DashboardNav /></nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
```

### Loading and Error Boundaries

```tsx
// app/dashboard/loading.tsx -- Shown while page.tsx is loading
export default function Loading() {
  return <div className="animate-pulse">Loading dashboard...</div>;
}

// app/dashboard/error.tsx -- Catches errors in dashboard segment
'use client'; // Error boundaries must be client components

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

---

## 2. Server Components vs Client Components

**Server Components** are the default. They run only on the server, can access databases and filesystems directly, and ship zero JavaScript to the client.

**Client Components** are declared with `'use client'` at the top of the file. They run on both server (for SSR) and client. Use them when you need interactivity, browser APIs, or React hooks.

### Decision Guide

| Need | Component Type |
|------|---------------|
| Fetch data, access DB, read files | Server |
| Display static content | Server |
| Use `useState`, `useEffect`, `useRef` | Client |
| Event handlers (`onClick`, `onChange`) | Client |
| Browser APIs (`localStorage`, `window`) | Client |
| Third-party hooks (e.g., `useQuery`) | Client |
| Context providers | Client |

### The "use client" Boundary

`'use client'` marks a boundary. Everything imported into a client component file also becomes client code. Push the boundary as deep as possible.

```tsx
// BAD: Entire page is client-side
'use client';
export default function ProductPage() {
  const [count, setCount] = useState(0);
  const products = useQuery(...); // Data fetch on client
  return <div>{products.map(...)}<button onClick={() => setCount(c => c + 1)}>{count}</button></div>;
}

// GOOD: Server component fetches data, only the interactive part is client
// app/products/page.tsx (Server Component -- no 'use client')
import { AddToCartButton } from './add-to-cart-button';

export default async function ProductPage() {
  const products = await db.query.products.findMany(); // Server-side fetch

  return (
    <div>
      {products.map((p) => (
        <div key={p.id}>
          <h2>{p.name}</h2>
          <p>{p.description}</p>
          <AddToCartButton productId={p.id} /> {/* Client boundary here */}
        </div>
      ))}
    </div>
  );
}

// app/products/add-to-cart-button.tsx (Client Component)
'use client';
import { useState } from 'react';

export function AddToCartButton({ productId }: { productId: string }) {
  const [added, setAdded] = useState(false);
  return <button onClick={() => { addToCart(productId); setAdded(true); }}>{added ? 'Added' : 'Add to Cart'}</button>;
}
```

### Passing Server Data to Client Components

Server components can pass serializable data as props to client components. You cannot pass functions, Dates (serialize them), or class instances.

```tsx
// Server Component
const user = await getUser(); // { id, name, createdAt: Date }

// Pass serializable data
<ClientProfile user={{ id: user.id, name: user.name, createdAt: user.createdAt.toISOString() }} />
```

---

## 3. Data Fetching

### Server Components (Primary Pattern)

```tsx
// Direct database/API access in server components -- no useEffect needed
export default async function UsersPage() {
  const users = await db.query.users.findMany({
    where: eq(users.active, true),
    limit: 50,
  });

  return <UserList users={users} />;
}
```

### Server Actions

Server Actions are async functions that run on the server, callable from client components.

```tsx
// app/actions/user.ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
});

export async function updateProfile(formData: FormData) {
  const parsed = UpdateProfileSchema.safeParse({
    name: formData.get('name'),
    bio: formData.get('bio'),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await db.update(users).set(parsed.data).where(eq(users.id, currentUserId));
  revalidatePath('/profile');
}

// Usage in client component
'use client';
import { updateProfile } from '@/app/actions/user';
import { useActionState } from 'react';

export function ProfileForm() {
  const [state, action, pending] = useActionState(updateProfile, null);

  return (
    <form action={action}>
      <input name="name" required />
      {state?.error?.name && <p className="text-red-500">{state.error.name}</p>}
      <button type="submit" disabled={pending}>
        {pending ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

### Route Handlers

```tsx
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const users = await db.query.users.findMany({ limit: 20, offset: (page - 1) * 20 });
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = CreateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const user = await db.insert(users).values(parsed.data).returning();
  return NextResponse.json(user, { status: 201 });
}
```

### Fetch with Caching and Revalidation

```tsx
// Cache indefinitely (default in app router)
const data = await fetch('https://api.example.com/data');

// Revalidate every 60 seconds (ISR)
const data = await fetch('https://api.example.com/data', { next: { revalidate: 60 } });

// Never cache (dynamic data)
const data = await fetch('https://api.example.com/data', { cache: 'no-store' });

// Revalidate by tag
const data = await fetch('https://api.example.com/products', { next: { tags: ['products'] } });

// In a server action:
import { revalidateTag } from 'next/cache';
revalidateTag('products');
```

---

## 4. Rendering Strategies

| Strategy | When | How |
|----------|------|-----|
| **Static (SSG)** | Content known at build time | Default for pages with no dynamic data |
| **ISR** | Content changes occasionally | `fetch` with `next: { revalidate: N }` |
| **SSR** | Content changes per-request | `cookies()`, `headers()`, `searchParams`, `cache: 'no-store'` |
| **Streaming** | Large pages, progressive rendering | `loading.tsx` or `<Suspense>` boundaries |

### Force Dynamic or Static

```tsx
// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Force static rendering
export const dynamic = 'force-static';

// Set revalidation interval for the entire route
export const revalidate = 3600; // seconds

// Generate static params for dynamic routes
export async function generateStaticParams() {
  const posts = await db.query.posts.findMany({ columns: { slug: true } });
  return posts.map((post) => ({ slug: post.slug }));
}
```

### Streaming with Suspense

```tsx
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      {/* Shows immediately */}
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />  {/* Streams in when ready */}
      </Suspense>
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />    {/* Streams independently */}
      </Suspense>
    </div>
  );
}

// Each component can be an async server component
async function DashboardStats() {
  const stats = await getStats(); // Slow query
  return <StatsGrid data={stats} />;
}
```

---

## 5. Middleware

Middleware runs before every request. Use it for auth checks, redirects, headers, and geolocation.

```tsx
// middleware.ts (must be at project root or src/)
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth check
  const token = request.cookies.get('session')?.value;
  if (pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Add custom headers
  const response = NextResponse.next();
  response.headers.set('x-request-id', crypto.randomUUID());

  // Geolocation-based redirect
  const country = request.geo?.country;
  if (pathname === '/' && country === 'DE') {
    return NextResponse.redirect(new URL('/de', request.url));
  }

  return response;
}

// Only run middleware on specific paths
export const config = {
  matcher: [
    // Match all paths except static files and api routes
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
```

---

## 6. Image and Font Optimization

### Images

```tsx
import Image from 'next/image';

// Local image (automatically optimized, dimensions inferred)
import heroImage from '@/public/hero.jpg';
<Image src={heroImage} alt="Hero" priority />

// Remote image (must configure domains in next.config)
<Image
  src="https://cdn.example.com/photo.jpg"
  alt="Photo"
  width={800}
  height={600}
  sizes="(max-width: 768px) 100vw, 50vw"
/>

// Fill mode (for unknown dimensions)
<div className="relative w-full aspect-video">
  <Image src={src} alt={alt} fill className="object-cover" sizes="100vw" />
</div>
```

### Fonts

```tsx
// app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

---

## 7. Metadata and SEO

```tsx
// Static metadata
export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about our company',
  openGraph: {
    title: 'About Us',
    description: 'Learn about our company',
    images: [{ url: '/og-about.png', width: 1200, height: 630 }],
  },
};

// Dynamic metadata
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { images: [post.coverImage] },
  };
}
```

---

## 8. Parallel and Intercepting Routes

### Parallel Routes

Render multiple pages simultaneously in the same layout using named slots.

```
app/
  @analytics/
    page.tsx          # Renders in the analytics slot
  @team/
    page.tsx          # Renders in the team slot
  layout.tsx          # Receives both slots as props
  page.tsx
```

```tsx
// app/layout.tsx
export default function Layout({
  children,
  analytics,
  team,
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
  team: React.ReactNode;
}) {
  return (
    <div>
      {children}
      <div className="grid grid-cols-2 gap-4">
        {analytics}
        {team}
      </div>
    </div>
  );
}
```

### Intercepting Routes

Show a route in a modal while preserving context. Uses `(.)`, `(..)`, `(..)(..)`, or `(...)` conventions.

```
app/
  feed/
    page.tsx              # Feed page
    @modal/
      (.)photo/[id]/
        page.tsx          # Intercepts /photo/:id when navigating from /feed
  photo/[id]/
    page.tsx              # Direct access to /photo/:id (full page)
```

---

## 9. Environment Variables

```bash
# .env.local (never committed)
DATABASE_URL=postgresql://...         # Server-only (no prefix)
API_SECRET=sk_live_...                # Server-only

NEXT_PUBLIC_API_URL=https://api.example.com  # Available in browser
NEXT_PUBLIC_APP_NAME=MyApp                   # Available in browser
```

**Rule**: Variables without `NEXT_PUBLIC_` are server-only. They are never bundled into client JavaScript. Variables with `NEXT_PUBLIC_` are inlined into the client bundle at build time.

```tsx
// Server component or route handler -- works
const dbUrl = process.env.DATABASE_URL;

// Client component -- undefined (server-only variable)
const dbUrl = process.env.DATABASE_URL; // undefined

// Client component -- works (has NEXT_PUBLIC_ prefix)
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

---

## 10. Deployment

### Vercel (Recommended)

Zero-config deployment. Supports all Next.js features natively.

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Self-Hosted with Docker

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

```js
// next.config.ts -- enable standalone output for Docker
import type { NextConfig } from 'next';
const config: NextConfig = { output: 'standalone' };
export default config;
```

---

## 11. Common Anti-Patterns

| Anti-Pattern | Why It's Wrong | Correct Approach |
|-------------|---------------|-----------------|
| `'use client'` on every component | Ships unnecessary JS, loses server rendering | Default to server components, add `'use client'` only for interactivity |
| `useEffect` for data fetching | Causes loading spinners, waterfalls, no SEO | Fetch in server components or use Server Actions |
| Putting secrets in `NEXT_PUBLIC_` vars | Exposes secrets in client bundle | Use non-prefixed env vars, access in server code only |
| Giant `layout.tsx` with all providers | Makes entire subtree client-rendered | Create a `providers.tsx` client component, keep layout as server |
| `fetch` in client components for initial data | Double renders, no streaming, poor UX | Fetch in server components, pass as props |
| Ignoring `loading.tsx` | Users see blank pages during navigation | Add `loading.tsx` for instant feedback |
| Not setting `sizes` on `<Image>` | Downloads oversized images | Always set `sizes` for responsive images |
| Using `router.push` for simple navigation | Loses prefetching, adds client JS | Use `<Link href="...">` for navigation |
| Catching errors only in `global-error.tsx` | Loses the layout, poor UX | Add `error.tsx` at each segment level |
| Mixing Pages Router and App Router patterns | Confusing, inconsistent behavior | Commit to App Router for new projects |

---

## 12. Critical Reminders

### ALWAYS

- Default to Server Components; add `'use client'` only when needed
- Validate all inputs with Zod in Server Actions and Route Handlers
- Use `<Link>` for navigation (enables prefetching)
- Add `loading.tsx` and `error.tsx` at appropriate segment levels
- Set `sizes` prop on all `<Image>` components
- Use `revalidatePath` or `revalidateTag` after mutations
- Keep `'use client'` boundary as deep in the component tree as possible
- Use `Suspense` boundaries for progressive streaming

### NEVER

- Put database credentials or API secrets in `NEXT_PUBLIC_` variables
- Use `useEffect` + `fetch` when a server component can do the fetch
- Mark a layout as `'use client'` (pushes entire subtree to client)
- Use `router.push` where `<Link>` or `redirect()` works
- Mutate data in GET route handlers (use POST/PUT/DELETE)
- Skip input validation in Server Actions (they are public HTTP endpoints)
- Use `window` or `document` in server components
