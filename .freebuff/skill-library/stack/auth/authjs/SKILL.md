---
name: authjs
description: |
  Build with Auth.js (NextAuth.js v5) — OAuth providers, credentials, JWT/database sessions, middleware route protection, and RBAC patterns. Use when: setting up authentication flows, configuring providers (Google, GitHub, Discord, email magic link, credentials), protecting routes with middleware, managing sessions (useSession, auth()), extending JWT/session types, implementing role-based access, or troubleshooting callback/redirect/CSRF errors.
version: 1.0.0
---

# Auth.js (NextAuth.js v5)

**Status**: Production Ready
**Last Updated**: 2026-02-16
**Package**: `next-auth@5.x` (beta channel for v5)

---

## Setup and Configuration

### 1. Install

```bash
pnpm add next-auth@beta
```

### 2. Auth Configuration

```typescript
// src/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  session: { strategy: "jwt" }, // or "database"
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    authorized({ auth, request }) {
      return !!auth?.user;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      return session;
    },
  },
});
```

### 3. Route Handler

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

### 4. Environment Variables

```bash
# .env.local
AUTH_SECRET="openssl rand -base64 33"  # Required — generate with: npx auth secret
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
AUTH_GITHUB_ID="..."
AUTH_GITHUB_SECRET="..."
AUTH_URL="http://localhost:3000"  # Only needed in non-Vercel deployments
```

---

## Provider Setup

### OAuth Providers (Google, GitHub, Discord)

```typescript
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Discord from "next-auth/providers/discord";

// Minimal — Auth.js auto-discovers env vars named AUTH_[PROVIDER]_ID / AUTH_[PROVIDER]_SECRET
providers: [Google, GitHub, Discord];

// With explicit config and scopes
providers: [
  Google({
    authorization: { params: { scope: "openid email profile" } },
    // Request refresh token for offline access
    authorization: {
      params: { access_type: "offline", prompt: "consent" },
    },
  }),
];
```

### Credentials Provider

```typescript
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcryptjs";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

providers: [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = LoginSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const user = await db.query.users.findFirst({
        where: eq(users.email, parsed.data.email),
      });
      if (!user?.hashedPassword) return null;

      const valid = await bcrypt.compare(parsed.data.password, user.hashedPassword);
      if (!valid) return null;

      return { id: user.id, email: user.email, name: user.name, role: user.role };
    },
  }),
];
```

**Credentials caveats:**
- No built-in session persistence with database strategy — JWT only
- No automatic account linking with OAuth providers
- You own password hashing, rate limiting, brute force protection
- Auth.js strongly recommends OAuth or magic link over credentials

### Email Magic Link (Passwordless)

```typescript
import Resend from "next-auth/providers/resend";

providers: [
  Resend({
    from: "noreply@example.com",
    // Requires a database adapter — tokens stored in verification table
  }),
];
```

---

## Session Strategies

### JWT Sessions (Default)

- No database required for sessions
- Token stored in encrypted HTTP-only cookie
- Larger cookie size with extended token data
- Cannot be revoked server-side (stateless)
- Use when: serverless, edge runtime, no DB adapter needed

### Database Sessions

- Session stored in database via adapter
- Small session token in cookie, data in DB
- Can be revoked by deleting the session row
- Requires a database adapter (Drizzle, Prisma, etc.)
- Use when: need server-side session revocation, multi-device management

```typescript
// Database sessions
session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 } // 30 days
```

---

## Middleware for Route Protection

```typescript
// src/middleware.ts
import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard");
  const isOnAdmin = req.nextUrl.pathname.startsWith("/admin");
  const isOnAuth = req.nextUrl.pathname.startsWith("/auth");

  // Protect dashboard
  if (isOnDashboard && !isLoggedIn) {
    return Response.redirect(new URL("/auth/signin", req.nextUrl));
  }

  // Protect admin routes — check role from JWT
  if (isOnAdmin) {
    if (!isLoggedIn) {
      return Response.redirect(new URL("/auth/signin", req.nextUrl));
    }
    if (req.auth?.user?.role !== "admin") {
      return Response.redirect(new URL("/unauthorized", req.nextUrl));
    }
  }

  // Redirect authenticated users away from auth pages
  if (isOnAuth && isLoggedIn) {
    return Response.redirect(new URL("/dashboard", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

---

## Client-Side Usage

### useSession Hook

```typescript
"use client";
import { useSession } from "next-auth/react";

export function UserProfile() {
  const { data: session, status, update } = useSession();

  if (status === "loading") return <Skeleton />;
  if (status === "unauthenticated") return <SignInButton />;

  return <p>Welcome, {session.user.name}</p>;
}
```

### SessionProvider

```typescript
// src/app/providers.tsx
"use client";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

// src/app/layout.tsx
import { Providers } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### signIn / signOut (Client)

```typescript
"use client";
import { signIn, signOut } from "next-auth/react";

// OAuth sign-in — redirects to provider
<button onClick={() => signIn("google")}>Sign in with Google</button>
<button onClick={() => signIn("github", { callbackUrl: "/dashboard" })}>GitHub</button>

// Credentials sign-in — no redirect, handle response
const result = await signIn("credentials", {
  email,
  password,
  redirect: false, // Prevent automatic redirect
});
if (result?.error) {
  setError("Invalid credentials");
}

// Sign out
<button onClick={() => signOut({ callbackUrl: "/" })}>Sign out</button>
```

---

## Server-Side Session Access

### In Server Components (App Router)

```typescript
// src/app/dashboard/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) redirect("/auth/signin");

  return <h1>Welcome {session.user.name}</h1>;
}
```

### In API Routes

```typescript
// src/app/api/protected/route.ts
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json({ user: session.user });
}
```

### In Server Actions

```typescript
"use server";
import { auth } from "@/auth";

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Proceed with authorized action
}
```

---

## Custom Pages

```typescript
// src/app/auth/signin/page.tsx
import { signIn, providerMap } from "@/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string };
}) {
  return (
    <div>
      {searchParams.error && <p>Authentication error: {searchParams.error}</p>}

      {Object.values(providerMap).map((provider) => (
        <form
          key={provider.id}
          action={async () => {
            "use server";
            await signIn(provider.id, { redirectTo: searchParams.callbackUrl ?? "/" });
          }}
        >
          <button>Sign in with {provider.name}</button>
        </form>
      ))}
    </div>
  );
}
```

---

## Database Adapters

### Drizzle Adapter

```typescript
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";

export const { handlers, auth } = NextAuth({
  adapter: DrizzleAdapter(db),
  // Drizzle adapter requires specific table schemas — see @auth/drizzle-adapter docs
});
```

### Prisma Adapter

```typescript
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
});
```

---

## Extending Session and JWT Types

```typescript
// src/types/next-auth.d.ts
import { DefaultSession, DefaultJWT } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "user" | "moderator";
    } & DefaultSession["user"];
  }

  interface User {
    role: "admin" | "user" | "moderator";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "admin" | "user" | "moderator";
  }
}
```

---

## Role-Based Access Control

```typescript
// src/lib/auth-utils.ts
import { auth } from "@/auth";

type Role = "admin" | "user" | "moderator";

export async function requireRole(...roles: Role[]) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthenticated");
  if (!roles.includes(session.user.role)) throw new Error("Forbidden");
  return session;
}

// Usage in server action
export async function deleteUser(userId: string) {
  const session = await requireRole("admin");
  // Only admins reach here
}

// Usage in API route
export async function GET() {
  try {
    const session = await requireRole("admin", "moderator");
    return Response.json({ data: "restricted" });
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
}
```

---

## Account Linking

Auth.js links accounts by email by default when `allowDangerousEmailAccountLinking` is off. For explicit control:

```typescript
callbacks: {
  async signIn({ user, account, profile }) {
    // Prevent sign-in if email not verified by OAuth provider
    if (account?.provider === "google" && !profile?.email_verified) {
      return false;
    }
    return true;
  },
},

// To allow linking accounts with same email from different providers:
// WARNING: Only enable if your OAuth providers verify emails
providers: [
  Google({ allowDangerousEmailAccountLinking: true }),
],
```

---

## Edge Runtime Compatibility

Auth.js v5 is edge-compatible by default. Constraints:
- Database adapters may not work on edge — use JWT strategy
- `bcrypt` does not work on edge — use `bcryptjs` or `@noble/hashes`
- Node.js-only libraries in callbacks will break edge middleware

```typescript
// For edge-compatible password hashing
import { hashSync, compareSync } from "bcryptjs";
```

---

## Anti-Patterns

| Anti-Pattern | Why It Breaks | Correct Approach |
|---|---|---|
| Storing session data in localStorage | XSS vulnerable, not httpOnly | Auth.js uses httpOnly cookies automatically |
| Calling `auth()` in client components | `auth()` is server-only | Use `useSession()` in client, `auth()` in server |
| Checking auth only on client | Bypassable, flash of wrong content | Use middleware + server-side `auth()` |
| Exposing provider secrets in client bundle | Secret leak | Keep in `.env.local`, server-side only |
| Using `redirect: true` with credentials signIn | Cannot handle errors gracefully | Use `redirect: false` and handle `result.error` |
| Hardcoding `AUTH_URL` on Vercel | Breaks preview deployments | Omit it — Vercel sets `NEXTAUTH_URL` automatically |
| Skipping CSRF token in custom forms | CSRF vulnerability | Auth.js handles CSRF automatically via its routes |
| Mutating the `token` object in jwt callback without returning | Silent data loss | Always `return token` from jwt callback |
| Using database strategy with Credentials provider | Sessions are not created for credentials | Use JWT strategy with credentials, or use OAuth |
| Not handling the `authorized` callback | Middleware does not protect routes | Implement `authorized` or handle in middleware |

---

## CSRF Protection

Auth.js v5 includes automatic CSRF protection:
- POST routes require a CSRF token (auto-managed by Auth.js forms)
- GET routes for sign-in/sign-out redirect safely
- Custom forms must use Auth.js action helpers (server actions) to inherit protection

---

## Debugging

```typescript
// Enable debug logging
export const { handlers, auth } = NextAuth({
  debug: process.env.NODE_ENV === "development",
  logger: {
    error(code, metadata) { console.error(code, metadata); },
    warn(code) { console.warn(code); },
    debug(code, metadata) { console.debug(code, metadata); },
  },
});
```

Common issues:
- `OAUTH_CALLBACK_ERROR` — Check redirect URI matches provider config exactly
- `JWT_SESSION_ERROR` — AUTH_SECRET changed or missing
- Infinite redirect loops — Check middleware matcher excludes `/api/auth`

---

**Last verified**: 2026-02-16 | **Skill version**: 1.0.0
