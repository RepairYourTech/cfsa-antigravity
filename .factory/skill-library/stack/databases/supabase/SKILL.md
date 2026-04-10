---
name: supabase
description: Comprehensive Supabase skill covering PostgreSQL database, authentication (GoTrue), realtime subscriptions, file storage, edge functions, row-level security, client libraries, database functions, webhooks, and TypeScript type generation. Use when building with Supabase as your backend-as-a-service.
version: 1.0.0
---

# Supabase

Open-source Firebase alternative built on PostgreSQL, providing auth, realtime, storage, and edge functions with a unified client library.

## Quick Start

### Install and Initialize

```bash
npm install @supabase/supabase-js
```

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### Server-Side Client (with Service Role)

```typescript
// src/lib/supabase-admin.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Service role bypasses RLS — use only on server
export const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**CRITICAL**: The service role key bypasses all Row Level Security. Never expose it to the client. Never include it in `NEXT_PUBLIC_*` variables.

### Server-Side Client (per-request, with user context)

```typescript
// Next.js App Router — server component or route handler
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';

export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
```

## Authentication

### Email/Password

```typescript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password',
  options: {
    data: { display_name: 'Alice' }, // stored in auth.users.raw_user_meta_data
  },
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password',
});

// Sign out
const { error } = await supabase.auth.signOut();

// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Listen for auth changes
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (event, session) => {
    // event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED' | 'PASSWORD_RECOVERY'
    console.log(event, session);
  }
);
// Cleanup: subscription.unsubscribe();
```

### OAuth Providers

```typescript
// Google
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
});

// GitHub
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    scopes: 'read:user user:email',
  },
});
```

### Auth Callback Handler (Next.js)

```typescript
// app/auth/callback/route.ts
import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL('/auth/error', request.url));
}
```

### Password Reset

```typescript
// Request reset
await supabase.auth.resetPasswordForEmail('user@example.com', {
  redirectTo: `${window.location.origin}/auth/reset-password`,
});

// Update password (after redirect)
await supabase.auth.updateUser({ password: 'new-secure-password' });
```

## Database Queries

### CRUD Operations

```typescript
// SELECT
const { data, error } = await supabase
  .from('posts')
  .select('id, title, content, created_at, author:profiles(name, avatar_url)')
  .eq('published', true)
  .order('created_at', { ascending: false })
  .range(0, 9); // pagination: first 10 rows

// INSERT
const { data, error } = await supabase
  .from('posts')
  .insert({ title: 'New Post', content: 'Body text', author_id: userId })
  .select()
  .single();

// UPDATE
const { data, error } = await supabase
  .from('posts')
  .update({ title: 'Updated Title' })
  .eq('id', postId)
  .select()
  .single();

// DELETE
const { error } = await supabase
  .from('posts')
  .delete()
  .eq('id', postId);

// UPSERT
const { data, error } = await supabase
  .from('profiles')
  .upsert({ id: userId, name: 'Alice', updated_at: new Date().toISOString() })
  .select()
  .single();
```

### Advanced Queries

```typescript
// Full-text search
const { data } = await supabase
  .from('posts')
  .select()
  .textSearch('title', 'serverless functions', { type: 'websearch' });

// Filter with OR
const { data } = await supabase
  .from('posts')
  .select()
  .or('status.eq.published,status.eq.featured');

// Filter with IN
const { data } = await supabase
  .from('posts')
  .select()
  .in('category', ['tech', 'science']);

// Count without fetching rows
const { count } = await supabase
  .from('posts')
  .select('*', { count: 'exact', head: true })
  .eq('published', true);

// JSON column filtering
const { data } = await supabase
  .from('posts')
  .select()
  .contains('tags', ['typescript']);

// Nested selects (joins via foreign keys)
const { data } = await supabase
  .from('posts')
  .select(`
    id, title,
    comments (
      id, body,
      author:profiles (name)
    )
  `)
  .eq('id', postId)
  .single();
```

## Row Level Security (RLS)

### Enable and Create Policies

```sql
-- Enable RLS on a table
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read published posts
CREATE POLICY "Public can read published posts"
  ON posts FOR SELECT
  USING (published = true);

-- Users can read their own drafts
CREATE POLICY "Users can read own drafts"
  ON posts FOR SELECT
  USING (auth.uid() = author_id);

-- Users can insert their own posts
CREATE POLICY "Users can create posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Users can update their own posts
CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  USING (auth.uid() = author_id);

-- Admin role can do anything
CREATE POLICY "Admins have full access"
  ON posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

### RLS with JWT Claims

```sql
-- Access based on custom JWT claims (set via supabase.auth.admin.updateUserById)
CREATE POLICY "Org members can read org data"
  ON org_data FOR SELECT
  USING (
    org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
  );
```

**CRITICAL**: Always enable RLS on every table that stores user data. Without RLS, the anon key grants unrestricted read/write access to the table.

## Realtime Subscriptions

### Listen for Changes

```typescript
// Subscribe to all changes on a table
const channel = supabase
  .channel('posts-changes')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'posts' },
    (payload) => {
      console.log('Change:', payload.eventType, payload.new, payload.old);
    }
  )
  .subscribe();

// Filter by specific rows
const channel = supabase
  .channel('my-posts')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'posts',
      filter: `author_id=eq.${userId}`,
    },
    (payload) => {
      console.log('Updated:', payload.new);
    }
  )
  .subscribe();

// Cleanup
supabase.removeChannel(channel);
```

### Broadcast (Ephemeral Messages)

```typescript
// Send cursor position to other users
const channel = supabase.channel('room-1');

channel.on('broadcast', { event: 'cursor' }, (payload) => {
  console.log('Cursor:', payload.payload);
});

await channel.subscribe();

channel.send({
  type: 'broadcast',
  event: 'cursor',
  payload: { x: 100, y: 200, userId },
});
```

### Presence (Online Users)

```typescript
const channel = supabase.channel('room-1');

channel.on('presence', { event: 'sync' }, () => {
  const state = channel.presenceState();
  console.log('Online users:', Object.keys(state));
});

channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
  console.log('Joined:', newPresences);
});

channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
  console.log('Left:', leftPresences);
});

await channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') {
    await channel.track({ user_id: userId, online_at: new Date().toISOString() });
  }
});
```

## Storage

### Upload and Download

```typescript
// Upload file
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.png`, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: 'image/png',
  });

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/avatar.png`);

// Get signed URL (private buckets)
const { data: { signedUrl }, error } = await supabase.storage
  .from('documents')
  .createSignedUrl(`${userId}/report.pdf`, 3600); // expires in 1 hour

// Download file
const { data, error } = await supabase.storage
  .from('documents')
  .download(`${userId}/report.pdf`);

// Delete file
const { error } = await supabase.storage
  .from('avatars')
  .remove([`${userId}/avatar.png`]);

// List files
const { data, error } = await supabase.storage
  .from('avatars')
  .list(userId, { limit: 100, offset: 0 });
```

### Storage Policies (RLS for Storage)

```sql
-- Users can upload to their own folder
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read access
CREATE POLICY "Public can read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
```

## Edge Functions (Deno)

### Create and Deploy

```bash
supabase functions new my-function
supabase functions deploy my-function
supabase functions serve  # local development
```

### Function Code

```typescript
// supabase/functions/my-function/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Get user from auth header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'No auth header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ message: `Hello ${user.email}` }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### Invoke from Client

```typescript
const { data, error } = await supabase.functions.invoke('my-function', {
  body: { name: 'Alice' },
  headers: { 'x-custom-header': 'value' },
});
```

## Database Functions and Triggers

### PostgreSQL Functions

```sql
-- Function called via RPC
CREATE OR REPLACE FUNCTION get_user_stats(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER  -- runs with function creator's privileges
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'post_count', (SELECT count(*) FROM posts WHERE author_id = target_user_id),
    'comment_count', (SELECT count(*) FROM comments WHERE author_id = target_user_id)
  ) INTO result;
  RETURN result;
END;
$$;
```

```typescript
// Call via RPC
const { data, error } = await supabase.rpc('get_user_stats', {
  target_user_id: userId,
});
```

### Database Triggers

```sql
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();

-- Create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'display_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

## TypeScript Type Generation

```bash
# Generate types from your database schema
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts

# Or from local database
npx supabase gen types typescript --local > src/lib/database.types.ts
```

The generated types integrate with the client:

```typescript
import type { Database } from './database.types';

type Post = Database['public']['Tables']['posts']['Row'];
type PostInsert = Database['public']['Tables']['posts']['Insert'];
type PostUpdate = Database['public']['Tables']['posts']['Update'];
```

## CLI Commands

```bash
supabase init                       # initialize project
supabase start                      # start local dev environment
supabase stop                       # stop local dev environment
supabase db reset                   # reset local database
supabase db push                    # push migrations to remote
supabase db pull                    # pull schema from remote
supabase migration new <name>       # create new migration
supabase gen types typescript       # generate TypeScript types
supabase functions serve            # serve edge functions locally
supabase functions deploy <name>    # deploy edge function
supabase secrets set KEY=value      # set edge function secret
```

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|-----------------|
| Using service role key on the client | Use anon key on client, service role only on server |
| Tables without RLS enabled | Enable RLS on every table with user data |
| `SELECT *` in production queries | Select only needed columns for performance |
| Storing files without storage policies | Always define storage policies for upload/read/delete |
| Not using TypeScript type generation | Run `supabase gen types` after every schema change |
| Polling for changes instead of realtime | Use `postgres_changes` subscription for live updates |
| Putting business logic in RLS policies | Keep RLS policies simple, put complex logic in database functions |
| Ignoring the `error` return value | Always check `error` before using `data` |
| Using `auth.uid()` without RLS | `auth.uid()` only works inside RLS policies and security definer functions |
| Embedding secrets in edge functions source | Use `supabase secrets set` for edge function environment variables |
