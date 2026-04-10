---
name: clerk
description: Comprehensive Clerk authentication skill covering setup, sign-in/sign-up components, middleware (clerkMiddleware), server-side auth (currentUser, auth), client hooks (useUser, useAuth, useClerk), user management, organizations, RBAC, webhooks, custom flows, and integration with Next.js and Astro. Use when implementing authentication with Clerk.
version: 1.0.0
---

# Clerk Authentication

Drop-in authentication and user management platform with pre-built UI components, session management, RBAC, organizations, and webhooks.

## Setup

### Installation (Next.js)

```bash
npm install @clerk/nextjs
```

### Environment Variables

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Optional: custom routes
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

### Provider Setup (Next.js App Router)

```typescript
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

### Astro Integration

```bash
npx astro add @clerk/astro
```

```typescript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import clerk from '@clerk/astro';

export default defineConfig({
  integrations: [clerk()],
  output: 'server',
});
```

```astro
---
// src/pages/dashboard.astro
const { userId } = Astro.locals.auth();
if (!userId) {
  return Astro.redirect('/sign-in');
}
---
<h1>Dashboard</h1>
```

## Middleware

### Next.js Middleware

```typescript
// middleware.ts (project root)
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/pricing',
  '/about',
]);

const isAdminRoute = createRouteMatcher(['/admin(.*)']);

export default clerkMiddleware(async (auth, request) => {
  // Protect non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // Admin routes require admin role
  if (isAdminRoute(request)) {
    await auth.protect({ role: 'org:admin' });
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

## Pre-Built Components

### Sign In / Sign Up Pages

```typescript
// app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-lg',
          },
        }}
      />
    </div>
  );
}

// app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignUp />
    </div>
  );
}
```

### User Button and Profile

```typescript
import { UserButton, UserProfile } from '@clerk/nextjs';

// Compact button with dropdown
function Header() {
  return (
    <nav>
      <UserButton
        afterSignOutUrl="/"
        appearance={{
          elements: {
            avatarBox: 'h-10 w-10',
          },
        }}
      />
    </nav>
  );
}

// Full profile management page
// app/user-profile/[[...user-profile]]/page.tsx
export default function UserProfilePage() {
  return <UserProfile path="/user-profile" />;
}
```

### Organization Components

```typescript
import {
  OrganizationSwitcher,
  CreateOrganization,
  OrganizationProfile,
  OrganizationList,
} from '@clerk/nextjs';

function OrgSwitcher() {
  return (
    <OrganizationSwitcher
      hidePersonal={false}
      afterCreateOrganizationUrl="/org/:slug"
      afterSelectOrganizationUrl="/org/:slug"
    />
  );
}
```

## Server-Side Auth

### Server Components (Next.js App Router)

```typescript
// app/dashboard/page.tsx
import { currentUser, auth } from '@clerk/nextjs/server';

export default async function DashboardPage() {
  // Get full user object
  const user = await currentUser();
  if (!user) {
    redirect('/sign-in');
  }

  // Or get just the auth object
  const { userId, orgId, orgRole } = await auth();

  return (
    <div>
      <h1>Welcome, {user.firstName}</h1>
      <p>User ID: {userId}</p>
      {orgId && <p>Organization: {orgId} (Role: {orgRole})</p>}
    </div>
  );
}
```

### API Routes

```typescript
// app/api/profile/route.ts
import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await currentUser();
  return NextResponse.json({
    id: user?.id,
    email: user?.emailAddresses[0]?.emailAddress,
    name: `${user?.firstName} ${user?.lastName}`,
  });
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  // Update user in your database using userId as the key
  await db.user.update({ where: { clerkId: userId }, data: body });

  return NextResponse.json({ success: true });
}
```

### Auth Protect with Permissions

```typescript
import { auth } from '@clerk/nextjs/server';

export async function DELETE(request: Request) {
  // Throws 403 if user doesn't have the permission
  const { userId } = await auth.protect({
    permission: 'org:posts:delete',
  });

  // Or check role
  const { userId: adminId } = await auth.protect({
    role: 'org:admin',
  });
}
```

## Client-Side Hooks

```typescript
'use client';

import { useUser, useAuth, useClerk, useOrganization, useSignIn } from '@clerk/nextjs';

function UserDashboard() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { userId, sessionId, getToken, signOut } = useAuth();
  const { openUserProfile, openSignIn } = useClerk();
  const { organization, membership } = useOrganization();

  if (!isLoaded) return <div>Loading...</div>;
  if (!isSignedIn) return <div>Not signed in</div>;

  // Get token for external API calls
  async function callExternalAPI() {
    const token = await getToken({ template: 'supabase' }); // named JWT template
    // or
    const defaultToken = await getToken(); // default session token

    const res = await fetch('/api/data', {
      headers: { Authorization: `Bearer ${defaultToken}` },
    });
    return res.json();
  }

  return (
    <div>
      <p>Hello, {user.firstName}</p>
      <p>Email: {user.primaryEmailAddress?.emailAddress}</p>
      <img src={user.imageUrl} alt="Avatar" />
      <button onClick={() => openUserProfile()}>Edit Profile</button>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}
```

### Update User Metadata

```typescript
'use client';

import { useUser } from '@clerk/nextjs';

function OnboardingForm() {
  const { user } = useUser();

  async function handleSubmit(formData: FormData) {
    await user?.update({
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      unsafeMetadata: {
        onboardingComplete: true,
        preferences: {
          theme: formData.get('theme'),
          notifications: formData.get('notifications') === 'on',
        },
      },
    });
  }

  return <form onSubmit={handleSubmit}>...</form>;
}
```

## Webhooks

### Webhook Handler

```typescript
// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import type { WebhookEvent } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error('Missing CLERK_WEBHOOK_SECRET');
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  const payload = await request.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let event: WebhookEvent;

  try {
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  switch (event.type) {
    case 'user.created': {
      const { id, email_addresses, first_name, last_name, image_url } = event.data;
      await db.user.create({
        data: {
          clerkId: id,
          email: email_addresses[0]?.email_address ?? '',
          name: `${first_name ?? ''} ${last_name ?? ''}`.trim(),
          avatarUrl: image_url,
        },
      });
      break;
    }
    case 'user.updated': {
      const { id, first_name, last_name, image_url } = event.data;
      await db.user.update({
        where: { clerkId: id },
        data: {
          name: `${first_name ?? ''} ${last_name ?? ''}`.trim(),
          avatarUrl: image_url,
        },
      });
      break;
    }
    case 'user.deleted': {
      if (event.data.id) {
        await db.user.delete({ where: { clerkId: event.data.id } });
      }
      break;
    }
    case 'organization.created': {
      // Sync org to your database
      break;
    }
  }

  return new Response('OK', { status: 200 });
}
```

## Organizations and RBAC

### Define Roles and Permissions

In Clerk Dashboard > Organizations > Roles:

| Role | Key | Permissions |
|------|-----|-------------|
| Admin | `org:admin` | All permissions |
| Member | `org:member` | `org:posts:read`, `org:posts:create` |
| Viewer | `org:viewer` | `org:posts:read` |

### Check Permissions in Code

```typescript
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  const { has } = await auth();

  // Check specific permission
  if (!has({ permission: 'org:posts:create' })) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check role
  if (!has({ role: 'org:admin' })) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
}
```

```typescript
// Client-side
'use client';
import { useAuth } from '@clerk/nextjs';
import { Protect } from '@clerk/nextjs';

function AdminPanel() {
  const { has } = useAuth();

  // Imperative check
  if (!has?.({ role: 'org:admin' })) {
    return <p>Access denied</p>;
  }

  return <div>Admin content</div>;
}

// Declarative component
function ConditionalContent() {
  return (
    <Protect permission="org:posts:create" fallback={<p>You cannot create posts</p>}>
      <CreatePostForm />
    </Protect>
  );
}
```

## Custom Sign-In Flow

```typescript
'use client';

import { useSignIn } from '@clerk/nextjs';
import { useState } from 'react';

function CustomSignIn() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        // Redirect to dashboard
      } else {
        // Handle MFA or other verification steps
        console.log('Additional steps needed:', result.status);
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message ?? 'Sign-in failed');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="text-red-500">{error}</p>}
      <button type="submit">Sign In</button>
    </form>
  );
}
```

## JWT Templates (External Auth)

Configure JWT templates in Clerk Dashboard for external services:

```typescript
// Get a JWT for Supabase, Hasura, or any external service
const token = await getToken({ template: 'supabase' });

// Use with Supabase
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    headers: { Authorization: `Bearer ${token}` },
  },
});
```

## Appearance Customization

```typescript
<ClerkProvider
  appearance={{
    baseTheme: dark, // import { dark } from '@clerk/themes'
    variables: {
      colorPrimary: '#6366f1',
      colorBackground: '#1e1e2e',
      colorText: '#cdd6f4',
      borderRadius: '0.5rem',
      fontFamily: 'Inter, sans-serif',
    },
    elements: {
      card: 'shadow-xl border border-gray-700',
      formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-700',
      socialButtonsBlockButton: 'border-gray-600',
    },
  }}
>
```

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|-----------------|
| Checking auth client-side only | Always verify auth server-side in middleware and API routes |
| Storing Clerk user data as source of truth | Sync to your database via webhooks, use your DB as source of truth |
| Using `unsafeMetadata` for access control | Use Clerk roles and permissions (RBAC), `unsafeMetadata` is user-writable |
| Not verifying webhook signatures | Always verify with `svix` before processing webhook events |
| Hardcoding role strings across codebase | Define role/permission constants in a shared module |
| Using `publicMetadata` for large data | Store large data in your database, use metadata for small flags only |
| Skipping the `isLoaded` check in hooks | Always check `isLoaded` before accessing user/auth data |
| Exposing `CLERK_SECRET_KEY` to client | Only `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` goes to the client |
| Not handling the `user.deleted` webhook | Always clean up your database when a user is deleted |
| Calling `currentUser()` in frequently-hit API routes | Use `auth()` for just the userId when you do not need the full user object |
