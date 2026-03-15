---
name: lucia
description: "Lucia auth patterns covering session management, database adapters, OAuth integration, password hashing, and middleware. Use when implementing authentication with Lucia."
version: 1.0.0
source: self
date_added: "2026-03-14"
---

# Lucia

Lightweight, session-based auth library. No magic — you own the user table, session table, and auth logic. Lucia handles session tokens and cookie management.

## When to Use

- Want full control over auth without a third-party service
- Building with Astro, SvelteKit, Next.js, or Express
- Need session-based auth (not JWT-based)
- Want to store users/sessions in your own database

## When NOT to Use

- Want a managed auth service with pre-built UI (use Clerk or Auth.js)
- Need JWT-based authentication (Lucia uses opaque session tokens)
- Want OAuth without writing the callback handler yourself

## Setup

### Installation

```bash
npm install lucia
npm install @lucia-auth/adapter-drizzle  # or adapter-prisma, adapter-mongoose, etc.
```

### Database Schema (Drizzle Example)

```typescript
// db/schema.ts
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const userTable = pgTable('user', {
  id: text('id').primaryKey(), // Generate with generateIdFromEntropySize(10)
  email: text('email').notNull().unique(),
  hashedPassword: text('hashed_password'),
  name: text('name'),
});

export const sessionTable = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => userTable.id),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
});
```

### Lucia Instance

```typescript
// lib/auth.ts
import { Lucia } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { db } from './db';
import { sessionTable, userTable } from './db/schema';

const adapter = new DrizzlePostgreSQLAdapter(db, sessionTable, userTable);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === 'production',
    },
  },
  getUserAttributes: (attributes) => ({
    email: attributes.email,
    name: attributes.name,
  }),
});

// Type augmentation
declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: { email: string; name: string };
  }
}
```

## Sign-Up Flow

```typescript
import { generateIdFromEntropySize } from 'lucia';
import { hash } from '@node-rs/argon2';

async function signUp(email: string, password: string, name: string) {
  const userId = generateIdFromEntropySize(10); // 16-char random ID
  const hashedPassword = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  await db.insert(userTable).values({ id: userId, email, hashedPassword, name });

  const session = await lucia.createSession(userId, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  return sessionCookie; // Set this as a response cookie
}
```

## Sign-In Flow

```typescript
import { verify } from '@node-rs/argon2';

async function signIn(email: string, password: string) {
  const user = await db.query.userTable.findFirst({ where: eq(userTable.email, email) });
  if (!user || !user.hashedPassword) {
    throw new Error('Invalid email or password');
  }

  const validPassword = await verify(user.hashedPassword, password);
  if (!validPassword) {
    throw new Error('Invalid email or password');
  }

  const session = await lucia.createSession(user.id, {});
  return lucia.createSessionCookie(session.id);
}
```

## Session Validation Middleware

### Next.js

```typescript
// middleware.ts or lib/auth-middleware.ts
import { cookies } from 'next/headers';

export async function validateRequest() {
  const sessionId = (await cookies()).get(lucia.sessionCookieName)?.value ?? null;
  if (!sessionId) return { user: null, session: null };

  const result = await lucia.validateSession(sessionId);

  if (result.session?.fresh) {
    const cookie = lucia.createSessionCookie(result.session.id);
    (await cookies()).set(cookie.name, cookie.value, cookie.attributes);
  }
  if (!result.session) {
    const cookie = lucia.createBlankSessionCookie();
    (await cookies()).set(cookie.name, cookie.value, cookie.attributes);
  }

  return result;
}
```

### Usage in Server Components

```typescript
// app/dashboard/page.tsx
import { validateRequest } from '@/lib/auth-middleware';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const { user, session } = await validateRequest();
  if (!user) redirect('/login');

  return <h1>Welcome, {user.name}</h1>;
}
```

## Sign Out

```typescript
async function signOut() {
  const { session } = await validateRequest();
  if (session) {
    await lucia.invalidateSession(session.id);
  }
  const cookie = lucia.createBlankSessionCookie();
  (await cookies()).set(cookie.name, cookie.value, cookie.attributes);
}
```

## OAuth Integration

```typescript
// Using Arctic for OAuth providers
import { GitHub } from 'arctic';

const github = new GitHub(
  process.env.GITHUB_CLIENT_ID!,
  process.env.GITHUB_CLIENT_SECRET!,
  null
);

// 1. Redirect to provider
async function initiateOAuth() {
  const state = generateState();
  const url = github.createAuthorizationURL(state, ['user:email']);
  // Set state in cookie, redirect to url
}

// 2. Handle callback
async function handleOAuthCallback(code: string) {
  const tokens = await github.validateAuthorizationCode(code);
  const response = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${tokens.accessToken()}` },
  });
  const githubUser = await response.json();

  // Find or create user, then create session
  const session = await lucia.createSession(user.id, {});
  return lucia.createSessionCookie(session.id);
}
```

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Use `bcrypt` for password hashing | Use `@node-rs/argon2` — Argon2id is the current best |
| Skip the `session.fresh` check | Always refresh session cookies when `fresh === true` |
| Store session tokens in localStorage | Use httpOnly cookies via `lucia.createSessionCookie()` |
| Call `validateSession` on every render | Cache the result per-request (e.g., in React `cache()`) |
| Create sessions without invalidating old ones | Implement session limits or invalidate on password change |
| Skip type augmentation for `Register` | Always declare `DatabaseUserAttributes` for type safety |
| Use UUIDs for user IDs | Use `generateIdFromEntropySize()` — shorter, more entropy |
| Hash passwords with default/weak params | Set explicit Argon2 params (memoryCost ≥ 19456) |
