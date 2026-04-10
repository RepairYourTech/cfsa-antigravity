---
name: nuxt
description: Build full-stack Vue applications with Nuxt.js including file-based routing, server routes, composables, data fetching, middleware, and deployment. Use when developing SSR/SSG/SPA applications with the Nuxt meta-framework.
version: 1.0.0
---

# Nuxt.js

Build full-stack Vue applications with Nuxt.js. Nuxt provides file-based routing, auto-imports, server routes (Nitro), SSR/SSG/SPA rendering modes, and a powerful module ecosystem.

## When to Use This Skill

- Building server-rendered (SSR) Vue applications
- Generating static sites (SSG) with Vue
- Creating full-stack applications with API routes
- Implementing SEO-optimized web applications
- Developing applications that need flexible rendering strategies per route

## Project Structure

```
nuxt-app/
  app.vue              # Root component
  nuxt.config.ts       # Nuxt configuration
  pages/               # File-based routes
  components/          # Auto-imported components
  composables/         # Auto-imported composables
  server/
    api/               # API routes (/api/*)
    routes/            # Server routes
    middleware/        # Server middleware
    utils/             # Server utilities
  middleware/          # Route middleware (client + server)
  layouts/             # Layout components
  plugins/             # App plugins
  utils/               # Auto-imported utilities
  public/              # Static assets
  assets/              # Processed assets (CSS, images)
```

## Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    'nuxt-icon',
  ],

  runtimeConfig: {
    // Server-only (not exposed to client)
    databaseUrl: process.env.DATABASE_URL,
    apiSecret: process.env.API_SECRET,

    // Client-accessible (exposed via useRuntimeConfig())
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? '/api',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    },
  },

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      htmlAttrs: { lang: 'en' },
    },
  },

  routeRules: {
    '/': { prerender: true },              // Static at build time
    '/blog/**': { isr: 3600 },             // ISR: revalidate every hour
    '/dashboard/**': { ssr: false },       // Client-only SPA
    '/api/**': { cors: true },             // CORS for API routes
    '/old-page': { redirect: '/new-page' },
  },

  nitro: {
    preset: 'cloudflare-pages', // Deployment target
  },
});
```

## File-Based Routing

### Route Structure

```
pages/
  index.vue                 # /
  about.vue                 # /about
  blog/
    index.vue               # /blog
    [slug].vue              # /blog/:slug
  users/
    [id]/
      index.vue             # /users/:id
      settings.vue          # /users/:id/settings
  [...slug].vue             # Catch-all: /any/nested/path
```

### Page Component

```vue
<!-- pages/blog/[slug].vue -->
<script setup lang="ts">
const route = useRoute();
const slug = route.params.slug as string;

const { data: post, error } = await useAsyncData(
  `post-${slug}`,
  () => $fetch(`/api/posts/${slug}`),
);

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found' });
}

// SEO
useSeoMeta({
  title: post.value?.title,
  description: post.value?.excerpt,
  ogTitle: post.value?.title,
  ogDescription: post.value?.excerpt,
  ogImage: post.value?.coverImage,
});
</script>

<template>
  <article v-if="post">
    <h1>{{ post.title }}</h1>
    <time :datetime="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
    <div v-html="post.content" />
  </article>
</template>
```

### Navigation

```vue
<template>
  <nav>
    <!-- NuxtLink provides prefetching and active state -->
    <NuxtLink to="/">Home</NuxtLink>
    <NuxtLink to="/blog" active-class="text-blue-600">Blog</NuxtLink>
    <NuxtLink :to="`/users/${userId}`">Profile</NuxtLink>
  </nav>
</template>
```

## Data Fetching

### useFetch (Composable Wrapper)

```vue
<script setup lang="ts">
// useFetch is a convenience wrapper around useAsyncData + $fetch
const { data, status, error, refresh } = await useFetch('/api/posts', {
  query: { page: 1, limit: 10 },
  // Transform response
  transform: (response) => response.posts,
  // Cache key (auto-generated from URL if omitted)
  key: 'posts-page-1',
  // Lazy: don't block navigation
  lazy: true,
  // Watch reactive sources to refetch
  watch: [page],
});
</script>
```

### useAsyncData (Full Control)

```vue
<script setup lang="ts">
const page = ref(1);

const { data: posts, status, refresh } = await useAsyncData(
  'posts',
  () => $fetch('/api/posts', { query: { page: page.value } }),
  {
    // Re-fetch when page changes
    watch: [page],
    // Default value while loading
    default: () => [],
    // Transform
    transform: (result) => result.data,
  },
);

// Manual refresh
async function loadMore() {
  page.value++;
  await refresh();
}
</script>
```

### $fetch (Direct API Calls)

```typescript
// $fetch is Nuxt's universal fetch (works on server and client)
// It auto-handles JSON serialization/deserialization

// In event handlers or non-setup contexts
async function submitForm(formData: FormData) {
  try {
    const result = await $fetch('/api/contact', {
      method: 'POST',
      body: formData,
    });
    return result;
  } catch (error) {
    // $fetch throws on non-2xx responses
    if (error.statusCode === 422) {
      return { errors: error.data.errors };
    }
    throw error;
  }
}
```

## Server Routes (Nitro)

### API Routes

```typescript
// server/api/posts/index.get.ts
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const page = Number(query.page) ?? 1;
  const limit = Number(query.limit) ?? 10;

  const posts = await db.post.findMany({
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { publishedAt: 'desc' },
  });

  return { data: posts, page, limit };
});
```

```typescript
// server/api/posts/index.post.ts
import { z } from 'zod';

const CreatePostSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(1),
  status: z.enum(['draft', 'published']).default('draft'),
});

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  const parsed = CreatePostSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation failed',
      data: { errors: parsed.error.flatten().fieldErrors },
    });
  }

  const post = await db.post.create({ data: parsed.data });
  setResponseStatus(event, 201);
  return post;
});
```

```typescript
// server/api/posts/[slug].get.ts
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug');

  const post = await db.post.findUnique({ where: { slug } });
  if (!post) {
    throw createError({ statusCode: 404, statusMessage: 'Post not found' });
  }

  return post;
});
```

### Server Middleware

```typescript
// server/middleware/auth.ts
export default defineEventHandler(async (event) => {
  // Runs on EVERY server request
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '');

  if (event.path.startsWith('/api/admin')) {
    if (!token) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    }

    const user = await verifyToken(token);
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid token' });
    }

    // Attach user to event context
    event.context.user = user;
  }
});
```

### Server Utilities

```typescript
// server/utils/db.ts
// Auto-imported in all server/ files
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

export function useDB(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}
```

## Composables

```typescript
// composables/useAuth.ts
// Auto-imported everywhere in the app
export function useAuth() {
  const user = useState<User | null>('auth-user', () => null);
  const isAuthenticated = computed(() => user.value !== null);

  async function login(email: string, password: string) {
    const result = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    user.value = result.user;
    return result;
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' });
    user.value = null;
    navigateTo('/login');
  }

  async function fetchUser() {
    try {
      user.value = await $fetch('/api/auth/me');
    } catch {
      user.value = null;
    }
  }

  return { user, isAuthenticated, login, logout, fetchUser };
}
```

```typescript
// composables/useToast.ts
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => []);

  function show(message: string, type: Toast['type'] = 'info') {
    const id = crypto.randomUUID();
    toasts.value.push({ id, message, type });
    setTimeout(() => dismiss(id), 5000);
  }

  function dismiss(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  return { toasts: readonly(toasts), show, dismiss };
}
```

## Route Middleware

```typescript
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }
});
```

```typescript
// middleware/admin.ts
export default defineNuxtRouteMiddleware(() => {
  const { user } = useAuth();

  if (user.value?.role !== 'admin') {
    return navigateTo('/');
  }
});
```

```vue
<!-- Apply middleware to a page -->
<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'dashboard',
});
</script>
```

## Layouts

```vue
<!-- layouts/default.vue -->
<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
```

```vue
<!-- layouts/dashboard.vue -->
<template>
  <div class="flex min-h-screen">
    <DashboardSidebar />
    <div class="flex-1 p-6">
      <slot />
    </div>
  </div>
</template>
```

## Error Handling

```vue
<!-- error.vue (root-level error page) -->
<script setup lang="ts">
import type { NuxtError } from '#app';

defineProps<{ error: NuxtError }>();

function handleClear() {
  clearError({ redirect: '/' });
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen">
    <h1 class="text-4xl font-bold">{{ error.statusCode }}</h1>
    <p class="mt-2 text-gray-600">{{ error.statusMessage }}</p>
    <button class="mt-4 px-4 py-2 bg-blue-600 text-white rounded" @click="handleClear">
      Go Home
    </button>
  </div>
</template>
```

## SEO

```vue
<script setup lang="ts">
// useHead for full control
useHead({
  title: 'My Page Title',
  link: [{ rel: 'canonical', href: 'https://example.com/page' }],
  script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(jsonLd) }],
});

// useSeoMeta for common meta tags (type-safe)
useSeoMeta({
  title: 'My Page',
  description: 'Page description for search engines',
  ogTitle: 'My Page',
  ogDescription: 'Page description for social sharing',
  ogImage: 'https://example.com/og.png',
  ogUrl: 'https://example.com/page',
  twitterCard: 'summary_large_image',
  twitterTitle: 'My Page',
  twitterDescription: 'Page description for Twitter',
  twitterImage: 'https://example.com/twitter.png',
  robots: 'index, follow',
});
</script>
```

## State Management (useState)

```typescript
// useState persists across SSR and client hydration
const counter = useState('counter', () => 0);
const theme = useState<'light' | 'dark'>('theme', () => 'light');

// For complex state, use Pinia
// stores/useCartStore.ts
export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([]);
  const total = computed(() => items.value.reduce((sum, item) => sum + item.price, 0));

  function addItem(item: CartItem) {
    items.value.push(item);
  }

  function removeItem(id: string) {
    items.value = items.value.filter((item) => item.id !== id);
  }

  return { items, total, addItem, removeItem };
});
```

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|-----------------|
| Using `axios` or `node-fetch` instead of `$fetch` | `$fetch` handles SSR/client, serialization, and base URL automatically |
| Calling `useFetch` inside event handlers | `useFetch` is for `<script setup>` only; use `$fetch` in handlers |
| Mutating `useState` values on the server without SSR awareness | Server state is serialized and sent to client -- avoid large objects |
| Importing composables manually | They are auto-imported from `composables/` directory |
| Using `process.env` in client code | Use `useRuntimeConfig().public` for client-accessible values |
| Putting database logic in `composables/` | Database access belongs in `server/` only |
| Using global middleware for auth on every route | Use named middleware and `definePageMeta` per page |

## Deployment

```typescript
// nuxt.config.ts -- set Nitro preset for your platform
export default defineNuxtConfig({
  nitro: {
    preset: 'cloudflare-pages',  // or 'vercel', 'netlify', 'node-server', 'bun', 'deno'
  },
});
```

```bash
# Build
pnpm build

# Preview production build locally
pnpm preview

# Static generation (SSG)
pnpm generate
```
