---
name: supabase-auth
description: "Supabase Auth patterns covering email/password, OAuth, magic link, session management, RLS integration, server-side auth, and middleware. Use when implementing authentication with Supabase."
version: 1.0.0
source: self
date_added: "2026-03-14"
---

# Supabase Auth

Authentication and authorization using Supabase's built-in auth service. Covers sign-up flows, session management, Row Level Security integration, and server-side auth patterns.

## When to Use

- Project uses Supabase as backend/database
- Need email/password, OAuth, or magic link authentication
- Need RLS policies tied to authenticated users
- Need server-side auth verification in API routes or middleware

## When NOT to Use

- Using a separate auth provider (Clerk, Auth.js, Firebase Auth) with Supabase as DB only
- Building auth from scratch without Supabase

## Setup

### Client-Side (Browser)

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Server-Side (Next.js App Router)

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Server-only, never expose to client
```

## Authentication Flows

### Email/Password Sign-Up

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password-123',
  options: {
    data: { full_name: 'Jane Doe', role: 'member' },
    emailRedirectTo: `${origin}/auth/callback`,
  },
});
// data.user exists but email unconfirmed until link clicked
```

### Email/Password Sign-In

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password-123',
});
// data.session contains access_token and refresh_token
```

### OAuth (Google, GitHub, etc.)

```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${origin}/auth/callback`,
    queryParams: { access_type: 'offline', prompt: 'consent' },
  },
});
// Redirects to provider, then back to /auth/callback
```

### Magic Link

```typescript
const { error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: { emailRedirectTo: `${origin}/auth/callback` },
});
```

### Sign Out

```typescript
const { error } = await supabase.auth.signOut();
```

## Auth Callback Route

Handle the OAuth/magic link redirect:

```typescript
// app/auth/callback/route.ts
import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }
  return NextResponse.redirect(new URL('/auth/error', request.url));
}
```

## Middleware (Route Protection)

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/protected/:path*'],
};
```

## Row Level Security (RLS)

### Enable RLS and Create Policies

```sql
-- Enable RLS on a table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
```

### Auto-Create Profile on Sign-Up

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Session Management

```typescript
// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') { /* redirect to dashboard */ }
  if (event === 'SIGNED_OUT') { /* redirect to login */ }
  if (event === 'TOKEN_REFRESHED') { /* session renewed */ }
  if (event === 'PASSWORD_RECOVERY') { /* show reset form */ }
});

// Get current session
const { data: { session } } = await supabase.auth.getSession();

// Get current user (verifies JWT — preferred over getSession)
const { data: { user } } = await supabase.auth.getUser();
```

## Service Role (Admin Operations)

```typescript
// Server-only — bypasses RLS
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Never expose to client
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Admin: delete user
await supabaseAdmin.auth.admin.deleteUser(userId);

// Admin: list users
const { data } = await supabaseAdmin.auth.admin.listUsers();
```

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Use `getSession()` for auth verification | Use `getUser()` — it validates the JWT against the server |
| Expose `SUPABASE_SERVICE_ROLE_KEY` to client | Keep it server-side only, use `anon` key on client |
| Skip RLS on tables with user data | Always enable RLS and create explicit policies |
| Store roles in JWT custom claims only | Store roles in a DB table and check via RLS policies |
| Skip the auth callback route | Always handle `exchangeCodeForSession` for OAuth/magic link |
| Use `supabase.auth.getUser()` in middleware without cookie sync | Pass cookies to the server client via `@supabase/ssr` |
| Hardcode redirect URLs | Use `emailRedirectTo` with dynamic origin for portability |
| Trust client-side auth state alone | Always verify server-side with middleware or API route checks |
