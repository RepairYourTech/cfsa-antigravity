---
name: prisma
description: |
  Build with Prisma ORM — schema-first database access with type-safe queries, relations, migrations, and transactions. Use when: defining database schemas (models, relations, enums), writing queries (findMany, create, update, upsert, delete), filtering/sorting/pagination, managing relations (include, select, nested writes), running migrations, implementing transactions, using raw SQL, optimizing performance (select vs include, N+1), testing with mocks, or deploying with Prisma Accelerate.
version: 1.0.0
---

# Prisma ORM

**Status**: Production Ready
**Last Updated**: 2026-02-16
**Package**: `prisma@6.x`, `@prisma/client@6.x`

---

## Setup

```bash
pnpm add @prisma/client
pnpm add -D prisma

# Initialize (creates prisma/schema.prisma)
npx prisma init
```

### Database Connection

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql" // or "mysql", "sqlite", "mongodb", "cockroachdb"
  url      = env("DATABASE_URL")
}
```

```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
```

### Client Singleton

```typescript
// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

This singleton pattern prevents creating multiple PrismaClient instances during hot reload in development.

---

## Schema Definition

### Models and Fields

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  posts     Post[]
  profile   Profile?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
  @@map("users") // Custom table name
}

model Post {
  id          String    @id @default(cuid())
  title       String    @db.VarChar(255)
  content     String?
  published   Boolean   @default(false)
  author      User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId    String
  categories  Category[]
  tags        String[]  // Array field (PostgreSQL)
  metadata    Json?     // JSON field
  publishedAt DateTime?
  createdAt   DateTime  @default(now())

  @@index([authorId, published])
  @@index([createdAt(sort: Desc)])
}

model Profile {
  id     String @id @default(cuid())
  bio    String?
  avatar String?
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId String @unique
}

model Category {
  id    String @id @default(cuid())
  name  String @unique
  posts Post[]
}

enum Role {
  USER
  ADMIN
  MODERATOR
}
```

### Relations Summary

| Type | Prisma Syntax | Example |
|---|---|---|
| One-to-one | `@relation` with `@unique` on FK | User <-> Profile |
| One-to-many | `@relation` with FK on "many" side | User -> Post[] |
| Many-to-many | Implicit join table (array on both sides) | Post <-> Category |
| Self-relation | Same model referenced | User -> User (followers) |

---

## Prisma Client Queries

### Read Operations

```typescript
import { prisma } from "@/lib/prisma";

// Find many with filtering, sorting, pagination
const posts = await prisma.post.findMany({
  where: {
    published: true,
    author: { role: "ADMIN" },    // Filter through relation
    title: { contains: "prisma", mode: "insensitive" },
    createdAt: { gte: new Date("2024-01-01") },
    OR: [
      { title: { contains: "tutorial" } },
      { content: { contains: "guide" } },
    ],
  },
  orderBy: [
    { publishedAt: "desc" },
    { title: "asc" },
  ],
  skip: 0,      // Offset pagination
  take: 20,     // Limit
  distinct: ["authorId"], // Unique authors only
});

// Find unique (by unique field or compound unique)
const user = await prisma.user.findUnique({
  where: { email: "user@example.com" },
});

// Find unique or throw
const user = await prisma.user.findUniqueOrThrow({
  where: { id: userId },
});

// Find first matching
const post = await prisma.post.findFirst({
  where: { published: true },
  orderBy: { createdAt: "desc" },
});

// Count
const count = await prisma.post.count({
  where: { published: true },
});

// Aggregate
const stats = await prisma.post.aggregate({
  _count: true,
  _avg: { views: true },
  _max: { views: true },
  where: { published: true },
});

// Group by
const postsByAuthor = await prisma.post.groupBy({
  by: ["authorId"],
  _count: { id: true },
  orderBy: { _count: { id: "desc" } },
  having: { id: { _count: { gt: 5 } } },
});
```

### Write Operations

```typescript
// Create
const user = await prisma.user.create({
  data: {
    email: "new@example.com",
    name: "New User",
    profile: {
      create: { bio: "Hello world" }, // Nested create
    },
  },
  include: { profile: true }, // Return with relation
});

// Create many
const result = await prisma.user.createMany({
  data: [
    { email: "a@example.com", name: "User A" },
    { email: "b@example.com", name: "User B" },
  ],
  skipDuplicates: true, // Ignore duplicate key errors
});

// Update
const updated = await prisma.post.update({
  where: { id: postId },
  data: {
    title: "Updated Title",
    published: true,
    publishedAt: new Date(),
  },
});

// Update many
const result = await prisma.post.updateMany({
  where: { authorId: userId, published: false },
  data: { published: true },
});

// Upsert (create if not exists, update if exists)
const user = await prisma.user.upsert({
  where: { email: "user@example.com" },
  update: { name: "Updated Name" },
  create: { email: "user@example.com", name: "New Name" },
});

// Delete
await prisma.post.delete({ where: { id: postId } });

// Delete many
await prisma.post.deleteMany({
  where: { authorId: userId, published: false },
});
```

---

## Relations (include vs select)

### include — Fetch Whole Related Objects

```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    posts: {
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    },
    profile: true,
  },
});
// user.posts is Post[] with ALL fields
```

### select — Fetch Only Specific Fields

```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    name: true,
    email: true,
    posts: {
      select: { id: true, title: true },
      where: { published: true },
    },
  },
});
// user has ONLY id, name, email, posts (with only id, title)
```

**Key decision**: Use `select` when you need a few fields (leaner query, less data). Use `include` when you need all fields plus relations.

### Nested Writes

```typescript
// Create user with related records in one transaction
const user = await prisma.user.create({
  data: {
    email: "author@example.com",
    name: "Author",
    profile: { create: { bio: "Writer" } },
    posts: {
      create: [
        { title: "First Post", content: "Hello" },
        { title: "Second Post", content: "World" },
      ],
    },
  },
  include: { posts: true, profile: true },
});

// Connect existing related records
const post = await prisma.post.create({
  data: {
    title: "New Post",
    author: { connect: { id: authorId } },
    categories: {
      connect: [{ id: "cat1" }, { id: "cat2" }], // Connect existing categories
    },
  },
});

// Disconnect, set, connectOrCreate
await prisma.post.update({
  where: { id: postId },
  data: {
    categories: {
      set: [{ id: "cat1" }],                         // Replace all connections
      disconnect: [{ id: "cat2" }],                   // Remove connection
      connectOrCreate: {                              // Connect or create if not exists
        where: { name: "New Category" },
        create: { name: "New Category" },
      },
    },
  },
});
```

---

## Transactions

### Sequential (Batch) Transactions

```typescript
// All operations succeed or all fail
const [user, post] = await prisma.$transaction([
  prisma.user.create({ data: { email: "a@b.com", name: "A" } }),
  prisma.post.create({ data: { title: "Post", authorId: "existing-id" } }),
]);
```

### Interactive Transactions

```typescript
const result = await prisma.$transaction(async (tx) => {
  // Use tx instead of prisma inside the transaction
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });

  if (user.balance < amount) {
    throw new Error("Insufficient balance"); // Rolls back entire transaction
  }

  const updatedUser = await tx.user.update({
    where: { id: userId },
    data: { balance: { decrement: amount } },
  });

  const payment = await tx.payment.create({
    data: { userId, amount, status: "completed" },
  });

  return { user: updatedUser, payment };
}, {
  maxWait: 5000,  // Max time to wait for transaction slot
  timeout: 10000, // Max transaction duration
  isolationLevel: "Serializable", // Optional: default is ReadCommitted
});
```

---

## Migrations

```bash
# Create and apply migration (development)
npx prisma migrate dev --name add_user_role

# Apply migrations (production — CI/CD)
npx prisma migrate deploy

# Reset database (drops all data!)
npx prisma migrate reset

# Check migration status
npx prisma migrate status

# Resolve failed migration
npx prisma migrate resolve --applied "20240101000000_failed_migration"

# Generate client after schema changes (no migration)
npx prisma generate

# Introspect existing database into schema
npx prisma db pull

# Push schema changes without migration (prototyping)
npx prisma db push
```

---

## Seeding

```typescript
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Upsert to make seeding idempotent
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin",
      role: "ADMIN",
      profile: { create: { bio: "System administrator" } },
    },
  });

  console.log({ admin });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

```json
// package.json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

```bash
npx prisma db seed
```

---

## Raw Queries

```typescript
// Typed raw query
const users = await prisma.$queryRaw<User[]>`
  SELECT id, email, name
  FROM users
  WHERE role = ${role}
  ORDER BY created_at DESC
  LIMIT ${limit}
`;

// Execute raw (INSERT, UPDATE, DELETE) — returns affected rows count
const affected = await prisma.$executeRaw`
  UPDATE users SET last_login = NOW() WHERE id = ${userId}
`;

// Unsafe raw (for dynamic table/column names — use with extreme caution)
import { Prisma } from "@prisma/client";

const column = Prisma.raw(sanitizedColumnName);
const result = await prisma.$queryRawUnsafe(
  `SELECT ${column} FROM users WHERE id = $1`,
  userId
);
```

---

## Middleware

```typescript
// Query middleware — runs before/after queries
prisma.$use(async (params, next) => {
  // Soft delete: convert delete to update
  if (params.action === "delete") {
    params.action = "update";
    params.args.data = { deletedAt: new Date() };
  }
  if (params.action === "deleteMany") {
    params.action = "updateMany";
    params.args.data = { deletedAt: new Date() };
  }

  // Auto-filter soft-deleted records
  if (params.action === "findMany" || params.action === "findFirst") {
    if (!params.args.where) params.args.where = {};
    params.args.where.deletedAt = null;
  }

  const before = Date.now();
  const result = await next(params);
  const after = Date.now();

  console.log(`${params.model}.${params.action} took ${after - before}ms`);

  return result;
});
```

---

## Type Generation and Inference

```typescript
import { Prisma } from "@prisma/client";

// Infer types from Prisma schema
type UserWithPosts = Prisma.UserGetPayload<{
  include: { posts: true; profile: true };
}>;

// Validator for create input
type UserCreateInput = Prisma.UserCreateInput;

// Select specific fields
type UserSummary = Prisma.UserGetPayload<{
  select: { id: true; name: true; email: true };
}>;

// Use with Zod for runtime validation
import { z } from "zod";

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(["USER", "ADMIN", "MODERATOR"]).default("USER"),
}) satisfies z.ZodType<Prisma.UserCreateInput>;
```

---

## Connection Pooling

```bash
# PostgreSQL — connection_limit controls pool size per PrismaClient instance
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=10"

# For serverless (Vercel, Lambda) — use external pooler
# PgBouncer or Prisma Accelerate
DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=..."
DIRECT_URL="postgresql://user:pass@host:5432/db" # For migrations
```

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // Used for migrations (bypasses pooler)
}
```

---

## Prisma Accelerate (Edge / Caching)

```bash
pnpm add @prisma/extension-accelerate
```

```typescript
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

const prisma = new PrismaClient().$extends(withAccelerate());

// Query with caching
const posts = await prisma.post.findMany({
  where: { published: true },
  cacheStrategy: {
    ttl: 60,      // Cache for 60 seconds
    swr: 120,     // Serve stale while revalidating for 120 seconds
  },
});
```

---

## Testing Patterns

### Mock Prisma Client

```typescript
// src/lib/__mocks__/prisma.ts
import { PrismaClient } from "@prisma/client";
import { mockDeep, DeepMockProxy } from "jest-mock-extended";

export const prismaMock = mockDeep<PrismaClient>();

// In test
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

test("creates user", async () => {
  const mockUser = { id: "1", email: "test@example.com", name: "Test" };
  prismaMock.user.create.mockResolvedValue(mockUser as any);

  const result = await createUser("test@example.com", "Test");
  expect(result.email).toBe("test@example.com");
  expect(prismaMock.user.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ email: "test@example.com" }),
  });
});
```

### Integration Tests (Real Database)

```typescript
// Use a test database or docker container
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.TEST_DATABASE_URL } },
});

beforeEach(async () => {
  // Clean tables before each test (order matters for FK constraints)
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

---

## Performance Considerations

### select vs include

```typescript
// BAD — fetches ALL fields including large ones you do not need
const users = await prisma.user.findMany({
  include: { posts: true },
});

// GOOD — fetch only what you need
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    _count: { select: { posts: true } }, // Just the count, not all posts
  },
});
```

### Avoiding N+1

```typescript
// BAD — N+1 queries
const users = await prisma.user.findMany();
for (const user of users) {
  const posts = await prisma.post.findMany({ where: { authorId: user.id } });
}

// GOOD — single query with include
const users = await prisma.user.findMany({
  include: { posts: true },
});

// GOOD — separate batch query (for large datasets)
const users = await prisma.user.findMany();
const userIds = users.map((u) => u.id);
const posts = await prisma.post.findMany({
  where: { authorId: { in: userIds } },
});
```

### Cursor-Based Pagination (Better Than Offset)

```typescript
const posts = await prisma.post.findMany({
  take: 20,
  cursor: lastPostId ? { id: lastPostId } : undefined,
  skip: lastPostId ? 1 : 0, // Skip the cursor record itself
  orderBy: { createdAt: "desc" },
});
```

---

## Anti-Patterns

| Anti-Pattern | Why It Breaks | Correct Approach |
|---|---|---|
| Creating PrismaClient per request | Exhausts DB connections | Use singleton pattern |
| Using `include` for everything | Over-fetching, slow queries | Use `select` for what you need |
| N+1 queries in loops | Performance disaster at scale | Use `include`, `in` filter, or batch |
| Not handling `$disconnect()` in scripts | Connection pool exhaustion | Always disconnect in finally block |
| Using `db push` in production | No migration history, data loss risk | Use `prisma migrate deploy` |
| Raw SQL for queries Prisma handles | Loses type safety, harder to maintain | Use Prisma Client API unless SQL is required |
| Offset pagination on large datasets | Gets slower with higher offsets | Use cursor-based pagination |
| Not using `@updatedAt` | Manual timestamp management | Add `updatedAt DateTime @updatedAt` |
| Ignoring `skipDuplicates` in createMany | Crashes on unique constraint violations | Use `skipDuplicates: true` or upsert |
| Not setting `onDelete` on relations | Orphaned records when parent deleted | Set `onDelete: Cascade` or `SetNull` explicitly |

---

## CLI Reference

```bash
npx prisma generate          # Regenerate Prisma Client
npx prisma migrate dev       # Create + apply migration (dev)
npx prisma migrate deploy    # Apply pending migrations (prod)
npx prisma migrate reset     # Reset database (dev only)
npx prisma db push           # Push schema without migration (prototyping)
npx prisma db pull           # Introspect existing DB
npx prisma db seed           # Run seed script
npx prisma studio            # Open visual DB browser (localhost:5555)
npx prisma format            # Format schema file
npx prisma validate          # Validate schema syntax
```

---

**Last verified**: 2026-02-16 | **Skill version**: 1.0.0
