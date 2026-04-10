---
name: drizzle-orm
description: "Comprehensive Drizzle ORM guide covering schema definition, query building, relational queries, migrations, type inference, raw SQL, transactions, and Zod integration. Use when building type-safe database layers with Drizzle, designing schemas, writing queries, or managing migrations."
version: 1.0.0
---

# Drizzle ORM

## 1. Schema Definition

### Tables and Columns (PostgreSQL)

```typescript
// src/db/schema/users.ts
import { pgTable, uuid, text, boolean, timestamp, integer, numeric, jsonb, pgEnum } from 'drizzle-orm/pg-core';

// Enum type
export const roleEnum = pgEnum('role', ['user', 'admin', 'moderator']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: roleEnum('role').notNull().default('user'),
  active: boolean('active').notNull().default(true),
  metadata: jsonb('metadata').$type<{ preferences: Record<string, unknown> }>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  published: boolean('published').notNull().default(false),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  viewCount: integer('view_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  content: text('content').notNull(),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### Indexes and Constraints

```typescript
import { pgTable, text, uuid, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  categoryId: uuid('category_id').notNull(),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('products_sku_idx').on(table.sku),
  index('products_category_idx').on(table.categoryId),
  index('products_created_idx').on(table.createdAt.desc()),
]);
```

### Relations

Relations are separate from foreign keys. They define how Drizzle's relational query API joins tables.

```typescript
// src/db/schema/relations.ts
import { relations } from 'drizzle-orm';
import { users, posts, comments } from './tables';

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
}));
```

---

## 2. Database Connection

### PostgreSQL with node-postgres

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });

// For serverless (Neon, Supabase, etc.)
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

### SQLite with better-sqlite3

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

const sqlite = new Database('app.db');
export const db = drizzle(sqlite, { schema });
```

### Turso (LibSQL)

```typescript
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
```

---

## 3. Query Builder

### Select

```typescript
import { eq, ne, gt, gte, lt, lte, like, ilike, inArray, and, or, desc, asc, count, sum, sql } from 'drizzle-orm';

// Basic select
const allUsers = await db.select().from(users);

// Select specific columns
const userEmails = await db.select({ id: users.id, email: users.email }).from(users);

// Where clause
const activeAdmins = await db
  .select()
  .from(users)
  .where(and(eq(users.active, true), eq(users.role, 'admin')));

// OR conditions
const results = await db
  .select()
  .from(users)
  .where(or(eq(users.role, 'admin'), eq(users.role, 'moderator')));

// Pattern matching
const matched = await db.select().from(users).where(ilike(users.email, '%@example.com'));

// IN clause
const specific = await db.select().from(users).where(inArray(users.id, [id1, id2, id3]));

// Ordering, limit, offset
const paginated = await db
  .select()
  .from(users)
  .orderBy(desc(users.createdAt))
  .limit(20)
  .offset(40);

// Aggregates
const stats = await db
  .select({
    role: users.role,
    count: count(),
  })
  .from(users)
  .groupBy(users.role);

// Joins
const postsWithAuthors = await db
  .select({
    postTitle: posts.title,
    authorName: users.name,
    authorEmail: users.email,
  })
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id))
  .where(eq(posts.published, true));

// Left join
const usersWithPosts = await db
  .select({
    userName: users.name,
    postCount: count(posts.id),
  })
  .from(users)
  .leftJoin(posts, eq(users.id, posts.authorId))
  .groupBy(users.name);
```

### Insert

```typescript
// Single insert
const [newUser] = await db
  .insert(users)
  .values({ email: 'alice@example.com', name: 'Alice' })
  .returning();

// Bulk insert
await db.insert(users).values([
  { email: 'bob@example.com', name: 'Bob' },
  { email: 'carol@example.com', name: 'Carol' },
]);

// Upsert (insert or update on conflict)
await db
  .insert(users)
  .values({ email: 'alice@example.com', name: 'Alice Updated' })
  .onConflictDoUpdate({
    target: users.email,
    set: { name: 'Alice Updated', updatedAt: new Date() },
  });

// Insert or ignore on conflict
await db
  .insert(users)
  .values({ email: 'alice@example.com', name: 'Alice' })
  .onConflictDoNothing({ target: users.email });
```

### Update

```typescript
// Update with returning
const [updated] = await db
  .update(users)
  .set({ active: false, updatedAt: new Date() })
  .where(eq(users.id, userId))
  .returning();

// Increment a value
await db
  .update(posts)
  .set({ viewCount: sql`${posts.viewCount} + 1` })
  .where(eq(posts.id, postId));
```

### Delete

```typescript
// Delete with returning
const [deleted] = await db
  .delete(users)
  .where(eq(users.id, userId))
  .returning();

// Bulk delete
await db.delete(posts).where(and(eq(posts.published, false), lt(posts.createdAt, cutoffDate)));
```

---

## 4. Relational Queries

The relational query API uses the `relations` definitions for type-safe eager loading.

```typescript
// Find many with relations
const usersWithPosts = await db.query.users.findMany({
  with: {
    posts: {
      where: eq(posts.published, true),
      orderBy: [desc(posts.createdAt)],
      limit: 5,
      with: {
        comments: {
          limit: 3,
          with: {
            author: { columns: { id: true, name: true } },
          },
        },
      },
    },
  },
  where: eq(users.active, true),
  limit: 20,
});

// Find first (returns single object or undefined)
const user = await db.query.users.findFirst({
  where: eq(users.email, 'alice@example.com'),
  with: { posts: true },
});

// Select specific columns
const userNames = await db.query.users.findMany({
  columns: { id: true, name: true, email: true },
});

// Computed/extra fields
const postsWithExtra = await db.query.posts.findMany({
  extras: {
    titleLength: sql<number>`length(${posts.title})`.as('title_length'),
  },
});
```

---

## 5. Raw SQL

```typescript
import { sql } from 'drizzle-orm';

// Tagged template (parameterized -- safe from injection)
const result = await db.execute(sql`
  SELECT u.name, count(p.id) as post_count
  FROM ${users} u
  LEFT JOIN ${posts} p ON p.author_id = u.id
  WHERE u.active = ${true}
  GROUP BY u.name
  HAVING count(p.id) > ${5}
  ORDER BY post_count DESC
`);

// sql.raw() for trusted strings only (NOT user input)
const orderDir = 'DESC';
const sorted = await db.execute(sql`SELECT * FROM ${users} ORDER BY created_at ${sql.raw(orderDir)}`);

// Type the result
const typedResult = await db.execute<{ name: string; post_count: number }>(sql`
  SELECT name, count(*) as post_count FROM ${users} GROUP BY name
`);
```

---

## 6. Transactions

```typescript
// Basic transaction
const result = await db.transaction(async (tx) => {
  const [order] = await tx.insert(orders).values({ userId, total: 0 }).returning();

  const itemRows = items.map((item) => ({
    orderId: order.id,
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  }));
  await tx.insert(orderItems).values(itemRows);

  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const [updated] = await tx.update(orders).set({ total }).where(eq(orders.id, order.id)).returning();

  return updated;
});

// Nested savepoints
await db.transaction(async (tx) => {
  await tx.insert(users).values({ email: 'a@b.com', name: 'A' });

  try {
    await tx.transaction(async (tx2) => {
      await tx2.insert(users).values({ email: 'a@b.com', name: 'Duplicate' }); // fails
    });
  } catch {
    // Savepoint rolled back, outer transaction continues
  }

  await tx.insert(users).values({ email: 'c@d.com', name: 'C' }); // still works
});
```

---

## 7. Prepared Statements

```typescript
// Prepare once, execute many times
const getUserByEmail = db
  .select()
  .from(users)
  .where(eq(users.email, sql.placeholder('email')))
  .prepare('get_user_by_email');

const user = await getUserByEmail.execute({ email: 'alice@example.com' });

// With multiple placeholders
const getPostsByAuthor = db
  .select()
  .from(posts)
  .where(and(eq(posts.authorId, sql.placeholder('authorId')), eq(posts.published, sql.placeholder('published'))))
  .orderBy(desc(posts.createdAt))
  .limit(sql.placeholder('limit'))
  .prepare('get_posts_by_author');

const results = await getPostsByAuthor.execute({ authorId: userId, published: true, limit: 10 });
```

---

## 8. Migrations (drizzle-kit)

### Configuration

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

### Commands

```bash
# Generate migration from schema changes
pnpm drizzle-kit generate

# Apply migrations
pnpm drizzle-kit migrate

# Push schema directly (development only -- no migration files)
pnpm drizzle-kit push

# Introspect existing database and generate schema
pnpm drizzle-kit introspect

# Open Drizzle Studio (database browser)
pnpm drizzle-kit studio
```

### Programmatic Migration

```typescript
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './db';

async function runMigrations() {
  await migrate(db, { migrationsFolder: './drizzle/migrations' });
  console.log('Migrations complete');
}
```

---

## 9. Type Inference

```typescript
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';

// Infer types from schema
type User = InferSelectModel<typeof users>;
// { id: string; email: string; name: string; role: 'user' | 'admin' | 'moderator'; active: boolean; ... }

type NewUser = InferInsertModel<typeof users>;
// { id?: string; email: string; name: string; role?: 'user' | 'admin' | 'moderator'; active?: boolean; ... }

// Use in function signatures
async function createUser(data: NewUser): Promise<User> {
  const [user] = await db.insert(users).values(data).returning();
  return user;
}

// Partial select types using $inferSelect
type UserPreview = Pick<typeof users.$inferSelect, 'id' | 'name' | 'email'>;
```

---

## 10. Drizzle + Zod Integration

```typescript
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Auto-generate Zod schemas from Drizzle tables
const insertUserSchema = createInsertSchema(users, {
  // Override/refine auto-generated validators
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(100),
});

const selectUserSchema = createSelectSchema(users);

// Use for API validation
type CreateUserInput = z.infer<typeof insertUserSchema>;

export async function handleCreateUser(body: unknown) {
  const parsed = insertUserSchema.safeParse(body);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  const [user] = await db.insert(users).values(parsed.data).returning();
  return { user };
}

// Omit server-only fields for API responses
const userResponseSchema = selectUserSchema.omit({ metadata: true });
```

---

## 11. Performance Patterns

### Preventing N+1

```typescript
// BAD: N+1 queries
const allUsers = await db.select().from(users);
for (const user of allUsers) {
  const userPosts = await db.select().from(posts).where(eq(posts.authorId, user.id));
  // ...
}

// GOOD: Relational query (single query with joins)
const usersWithPosts = await db.query.users.findMany({
  with: { posts: true },
});

// GOOD: Manual join when you need aggregates
const usersWithCounts = await db
  .select({
    id: users.id,
    name: users.name,
    postCount: count(posts.id),
  })
  .from(users)
  .leftJoin(posts, eq(users.id, posts.authorId))
  .groupBy(users.id, users.name);
```

### Select Only What You Need

```typescript
// BAD: select all columns when you only need two
const allData = await db.select().from(users);

// GOOD: select specific columns
const needed = await db.select({ id: users.id, email: users.email }).from(users);

// GOOD: with relational queries
const partial = await db.query.users.findMany({
  columns: { id: true, email: true },
});
```

---

## 12. Common Anti-Patterns

| Anti-Pattern | Why It's Wrong | Fix |
|-------------|---------------|-----|
| No `returning()` on insert/update | Requires a separate SELECT query | Always chain `.returning()` when you need the result |
| Using `db.execute(sql\`...\`)` for everything | Loses type safety, harder to maintain | Use the query builder; reserve raw SQL for complex queries |
| Defining relations but not using `db.query` | Relations only work with the relational API | Use `db.query.tableName.findMany({ with: ... })` |
| Forgetting `onDelete` on foreign keys | Orphaned rows when parent is deleted | Specify `onDelete: 'cascade'` or `'set null'` |
| Not exporting schema from a barrel file | `drizzle-kit` cannot find schemas | Export all tables and relations from `schema/index.ts` |
| Mutating inside `db.select()` | Select should be read-only | Use `db.insert/update/delete` for mutations |
| Not using transactions for multi-table writes | Partial writes on failure | Wrap related writes in `db.transaction()` |

---

## 13. Critical Reminders

### ALWAYS

- Define `relations` separately from foreign keys (both are needed)
- Use `returning()` after insert/update/delete when you need the result
- Export all schema files from a single barrel (`schema/index.ts`)
- Use `drizzle-kit generate` for migration files (not `push` in production)
- Use parameterized queries via the query builder or `sql` template tag
- Wrap multi-step writes in `db.transaction()`
- Infer types with `InferSelectModel` / `InferInsertModel` rather than defining manually
- Use `drizzle-zod` to generate Zod schemas from your Drizzle tables

### NEVER

- Use `db.execute(sql.raw(userInput))` -- this enables SQL injection
- Skip migration files in production (always use `generate` + `migrate`)
- Define relations without corresponding foreign key constraints
- Use `push` in production (it can drop columns/tables)
- Ignore the `strict: true` config in drizzle-kit (catches dangerous migrations)
