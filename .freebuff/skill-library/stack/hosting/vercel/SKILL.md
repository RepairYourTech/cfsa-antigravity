---
name: vercel
description: Comprehensive Vercel hosting and deployment skill covering serverless/edge functions, environment variables, preview deployments, caching, headers, redirects, rewrites, monorepo setup, Vercel storage (KV, Blob, Postgres), analytics, ISR, and CI/CD integration. Use when deploying to Vercel or configuring any Vercel platform feature.
version: 1.0.0
---

# Vercel Hosting

Production deployment platform for frontend frameworks with serverless and edge compute, integrated storage, and zero-config CI/CD.

## Project Configuration

### vercel.json

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" },
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" }
      ]
    }
  ],
  "redirects": [
    { "source": "/old-path", "destination": "/new-path", "permanent": true }
  ],
  "rewrites": [
    { "source": "/api/proxy/:path*", "destination": "https://backend.example.com/:path*" }
  ]
}
```

### Framework Detection

Vercel auto-detects frameworks. Override with `framework` in vercel.json:

| Framework | Value | Output Directory |
|-----------|-------|-----------------|
| Next.js | `nextjs` | `.next` |
| Astro | `astro` | `dist` |
| SvelteKit | `sveltekit` | `.svelte-kit` |
| Remix | `remix` | `build` |
| Vite/React | `vite` | `dist` |

## Serverless Functions

### API Route (Next.js App Router)

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs'; // default, or 'edge'
export const maxDuration = 30;   // seconds (Pro: 60, Enterprise: 900)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') ?? '1', 10);

  const users = await db.users.findMany({ skip: (page - 1) * 20, take: 20 });
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const user = await db.users.create({ data: body });
  return NextResponse.json(user, { status: 201 });
}
```

### Standalone Serverless Function (non-framework)

```typescript
// api/hello.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ message: 'Hello from Vercel' });
}
```

### Function Configuration

| Setting | Hobby | Pro | Enterprise |
|---------|-------|-----|-----------|
| Max Duration | 10s | 60s | 900s |
| Memory | 1024 MB | 3009 MB | 3009 MB |
| Payload Size | 4.5 MB | 4.5 MB | 4.5 MB |
| Regions | 1 | Multiple | Multiple |

## Edge Functions

```typescript
// app/api/geo/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const country = request.geo?.country ?? 'US';
  const city = request.geo?.city ?? 'Unknown';

  return NextResponse.json({ country, city });
}
```

**Edge limitations**: No native Node.js modules (fs, net, child_process). No dynamic `require()`. Limited to Web APIs and edge-compatible npm packages. Max 128 KB compressed bundle size after tree shaking.

## Edge Middleware

```typescript
// middleware.ts (project root)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Geo-based redirect
  if (request.geo?.country === 'DE') {
    return NextResponse.redirect(new URL('/de', request.url));
  }

  // Add custom headers
  const response = NextResponse.next();
  response.headers.set('x-request-id', crypto.randomUUID());
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

## Environment Variables

### Configuration Hierarchy

| Scope | Available In | Set Via |
|-------|-------------|---------|
| `NEXT_PUBLIC_*` | Client + Server | Dashboard, CLI, vercel.json |
| No prefix | Server only | Dashboard, CLI |
| `VERCEL_*` | Auto-populated | System (read-only) |

### Environment-Specific Variables

```bash
# Set for specific environments
vercel env add DATABASE_URL production
vercel env add DATABASE_URL preview
vercel env add DATABASE_URL development

# Pull to local .env
vercel env pull .env.local

# List all
vercel env ls
```

### System Environment Variables

| Variable | Value |
|----------|-------|
| `VERCEL` | `1` (always set on Vercel) |
| `VERCEL_ENV` | `production`, `preview`, or `development` |
| `VERCEL_URL` | Deployment URL (no protocol) |
| `VERCEL_GIT_COMMIT_SHA` | Git commit hash |
| `VERCEL_GIT_COMMIT_REF` | Git branch name |

## Caching and ISR

### Incremental Static Regeneration

```typescript
// app/products/[id]/page.tsx
export const revalidate = 60; // revalidate every 60 seconds

export async function generateStaticParams() {
  const products = await db.products.findMany();
  return products.map((p) => ({ id: p.id }));
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await db.products.findUnique({ where: { id: params.id } });
  return <div>{product.name}</div>;
}
```

### On-Demand Revalidation

```typescript
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidation-secret');
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  const { path, tag } = await request.json();

  if (tag) {
    revalidateTag(tag);
  } else if (path) {
    revalidatePath(path);
  }

  return NextResponse.json({ revalidated: true, now: Date.now() });
}
```

### Cache-Control Headers

```typescript
// Manual cache headers for API routes
export async function GET() {
  const data = await fetchData();

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
```

**Cache hierarchy**: `s-maxage` controls Vercel CDN cache. `stale-while-revalidate` serves stale content while refreshing in background. `no-store` disables caching entirely.

## Preview Deployments

Every push to a non-production branch creates a preview deployment.

### Preview Protection

```json
// vercel.json
{
  "oidcTokenConfig": {
    "enabled": true
  }
}
```

### Preview Comments

Enabled by default on GitHub PRs. Disable per-project in dashboard under Settings > Git > Preview Comments.

### Branch-Specific Domains

```bash
# Assign custom domain to branch
vercel alias set <deployment-url> staging.example.com
```

## Monorepo Setup

### Turborepo Configuration

```json
// vercel.json at project root
{
  "buildCommand": "cd ../.. && npx turbo run build --filter=web",
  "installCommand": "cd ../.. && pnpm install",
  "framework": "nextjs",
  "outputDirectory": ".next"
}
```

### Root Directory Setting

Set in Vercel Dashboard > Project Settings > General > Root Directory. For a monorepo structure:

```
apps/
  web/          ← Root Directory for web project
  docs/         ← Root Directory for docs project
packages/
  ui/
  config/
```

### Ignored Build Step

```bash
# .vercel/ignore-build.sh — skip builds when no relevant changes
#!/bin/bash
git diff --quiet HEAD^ HEAD -- . ../../packages/
```

Or in vercel.json:
```json
{
  "ignoreCommand": "git diff --quiet HEAD^ HEAD -- . ../../packages/"
}
```

## Vercel Storage

### Vercel KV (Redis-compatible)

```typescript
import { kv } from '@vercel/kv';

// Set
await kv.set('user:123', { name: 'Alice', email: 'alice@example.com' });
await kv.set('session:abc', 'data', { ex: 3600 }); // expires in 1 hour

// Get
const user = await kv.get<{ name: string; email: string }>('user:123');

// Hash operations
await kv.hset('config', { theme: 'dark', lang: 'en' });
const theme = await kv.hget<string>('config', 'theme');

// List operations
await kv.lpush('queue', 'task1', 'task2');
const task = await kv.rpop('queue');
```

### Vercel Blob

```typescript
import { put, del, list, head } from '@vercel/blob';

// Upload
const blob = await put('avatars/user-123.png', fileBuffer, {
  access: 'public',
  contentType: 'image/png',
});
// blob.url → https://abc.public.blob.vercel-storage.com/avatars/user-123.png

// List blobs
const { blobs, cursor } = await list({ prefix: 'avatars/', limit: 100 });

// Delete
await del(blob.url);

// Client upload (from browser)
import { upload } from '@vercel/blob/client';

const blob = await upload('avatar.png', file, {
  access: 'public',
  handleUploadUrl: '/api/upload', // server-side handler
});
```

### Vercel Postgres

```typescript
import { sql } from '@vercel/postgres';

// Query
const { rows } = await sql`SELECT * FROM users WHERE id = ${userId}`;

// Insert
await sql`INSERT INTO users (name, email) VALUES (${name}, ${email})`;

// Transaction
import { db } from '@vercel/postgres';

const client = await db.connect();
try {
  await client.sql`BEGIN`;
  await client.sql`UPDATE accounts SET balance = balance - ${amount} WHERE id = ${from}`;
  await client.sql`UPDATE accounts SET balance = balance + ${amount} WHERE id = ${to}`;
  await client.sql`COMMIT`;
} catch (e) {
  await client.sql`ROLLBACK`;
  throw e;
} finally {
  client.release();
}
```

## Analytics and Speed Insights

### Web Analytics

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### Speed Insights (Core Web Vitals)

```typescript
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

## CLI Commands

```bash
# Deploy
vercel                    # preview deployment
vercel --prod             # production deployment

# Environment
vercel env pull           # pull env vars to .env.local
vercel env add KEY        # add env var interactively
vercel env rm KEY         # remove env var

# Domains
vercel domains add example.com
vercel domains inspect example.com

# Logs
vercel logs <deployment-url>
vercel logs <deployment-url> --follow

# Project management
vercel link               # link local project
vercel project ls         # list projects
```

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|-----------------|
| Hardcoding `VERCEL_URL` in client code | Use `NEXT_PUBLIC_APP_URL` env var, set per environment |
| Using serverless functions for WebSockets | Use a dedicated WebSocket service or Vercel's Edge Config |
| `Cache-Control: max-age=31536000` on API routes | Use `s-maxage` for CDN caching, short `max-age` for browser |
| Large serverless function bundles (>50 MB) | Tree-shake imports, use dynamic imports, split into smaller functions |
| Running database migrations in serverless functions | Use build scripts or separate CI/CD step |
| Storing sessions in serverless function memory | Use Vercel KV or external session store |
| Ignoring cold start latency | Use edge runtime for latency-sensitive routes, warm critical functions |
| Deploying without preview testing | Always verify preview deployment before promoting to production |

## Decision Guide

```
Need compute?
├─ < 10ms response, globally distributed → Edge Function (runtime = 'edge')
├─ Node.js APIs needed (fs, streams, native modules) → Serverless Function (runtime = 'nodejs')
└─ Long-running (> 60s) → Not suitable for Vercel serverless, use external service

Need storage?
├─ Session data, rate limiting, cache → Vercel KV
├─ File uploads, images, documents → Vercel Blob
├─ Relational data → Vercel Postgres
└─ Configuration, feature flags → Vercel Edge Config

Need caching?
├─ Static pages with periodic updates → ISR (revalidate = N)
├─ Static pages with webhook-triggered updates → On-demand revalidation
├─ API responses → Cache-Control with s-maxage
└─ Dynamic, user-specific content → no-store
```
