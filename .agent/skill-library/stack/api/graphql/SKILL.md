---
name: graphql
description: "Comprehensive GraphQL development guide covering schema design, resolvers, the N+1 problem with DataLoader, code-first vs schema-first approaches, Apollo Server and Client, error handling, pagination, authentication and authorization, file uploads, subscriptions, caching strategies, federation, input validation, depth limiting, query complexity analysis, testing, and codegen. Use when building or consuming GraphQL APIs, designing schemas, or optimizing GraphQL performance."
version: 1.0.0
---

# GraphQL

## 1. Philosophy

GraphQL is a **query language for APIs** that gives clients the power to ask for exactly the data they need. Unlike REST, where the server dictates the response shape, GraphQL lets the client define it.

**Key principles**:
- The schema is the contract. Every field, type, and relationship is explicitly defined.
- Clients ask for what they need. No over-fetching, no under-fetching.
- One endpoint, many queries. No URL-per-resource pattern.
- Strong typing. Every field has a type. The schema is self-documenting.
- The N+1 problem is your responsibility. GraphQL does not solve it -- DataLoader does.

---

## 2. Schema Design

### Types

```graphql
# Object types
type User {
  id: ID!
  email: String!
  name: String!
  avatar: String
  role: UserRole!
  posts(first: Int, after: String): PostConnection!
  createdAt: DateTime!
  updatedAt: DateTime!
}

# Enum types
enum UserRole {
  ADMIN
  MODERATOR
  USER
}

# Custom scalars
scalar DateTime
scalar EmailAddress

# Interface types
interface Node {
  id: ID!
}

interface Timestamped {
  createdAt: DateTime!
  updatedAt: DateTime!
}

# Union types
union SearchResult = User | Post | Comment

type Post implements Node & Timestamped {
  id: ID!
  title: String!
  content: String!
  author: User!
  tags: [String!]!
  status: PostStatus!
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### Queries

```graphql
type Query {
  # Single resource by ID
  user(id: ID!): User
  post(id: ID!): Post

  # List with pagination and filtering
  users(
    first: Int
    after: String
    filter: UserFilter
    orderBy: UserOrderBy
  ): UserConnection!

  posts(
    first: Int
    after: String
    filter: PostFilter
  ): PostConnection!

  # Search across multiple types
  search(query: String!, types: [SearchType!]): [SearchResult!]!

  # Current authenticated user
  me: User
}
```

### Mutations

```graphql
type Mutation {
  # Create
  createPost(input: CreatePostInput!): CreatePostPayload!

  # Update
  updatePost(id: ID!, input: UpdatePostInput!): UpdatePostPayload!

  # Delete
  deletePost(id: ID!): DeletePostPayload!

  # Authentication
  signIn(input: SignInInput!): AuthPayload!
  signUp(input: SignUpInput!): AuthPayload!
}

# Input types -- always use input types for mutation arguments
input CreatePostInput {
  title: String!
  content: String!
  tags: [String!]
  status: PostStatus
}

input UpdatePostInput {
  title: String
  content: String
  tags: [String!]
  status: PostStatus
}

# Payload types -- always return a payload, not the raw type
type CreatePostPayload {
  post: Post
  errors: [UserError!]!
}

type UserError {
  field: String
  message: String!
  code: ErrorCode!
}
```

### Subscriptions

```graphql
type Subscription {
  postCreated: Post!
  postUpdated(id: ID!): Post!
  commentAdded(postId: ID!): Comment!
}
```

---

## 3. Resolvers

### Basic Resolver Structure

```typescript
// resolvers/user.ts
import type { Resolvers } from "../generated/graphql";

export const userResolvers: Resolvers = {
  Query: {
    user: async (_parent, { id }, context) => {
      return context.dataSources.users.findById(id);
    },

    me: async (_parent, _args, context) => {
      if (!context.currentUser) return null;
      return context.dataSources.users.findById(context.currentUser.id);
    },

    users: async (_parent, { first, after, filter }, context) => {
      return context.dataSources.users.findMany({ first, after, filter });
    },
  },

  User: {
    // Field resolver -- called for each User object
    posts: async (parent, { first, after }, context) => {
      return context.dataSources.posts.findByAuthorId(parent.id, { first, after });
    },

    // Computed field
    avatar: (parent) => {
      return parent.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${parent.name}`;
    },
  },

  Mutation: {
    createPost: async (_parent, { input }, context) => {
      if (!context.currentUser) {
        return {
          post: null,
          errors: [{ message: "Authentication required", code: "UNAUTHENTICATED" }],
        };
      }

      const post = await context.dataSources.posts.create({
        ...input,
        authorId: context.currentUser.id,
      });

      return { post, errors: [] };
    },
  },
};
```

---

## 4. The N+1 Problem and DataLoader

### The Problem

```graphql
# This query causes N+1 database queries:
query {
  posts(first: 10) {       # 1 query: SELECT * FROM posts LIMIT 10
    edges {
      node {
        title
        author {            # 10 queries: SELECT * FROM users WHERE id = ?
          name              # (one for each post)
        }
      }
    }
  }
}
```

### The Solution: DataLoader

DataLoader batches and deduplicates data fetching within a single request.

```typescript
// dataloaders/user-loader.ts
import DataLoader from "dataloader";
import type { User } from "../types";

export function createUserLoader(db: Database) {
  return new DataLoader<string, User | null>(async (userIds) => {
    // Single batch query instead of N individual queries
    const users = await db.query(
      "SELECT * FROM users WHERE id = ANY($1)",
      [userIds as string[]]
    );

    // DataLoader requires results in the same order as the input keys
    const userMap = new Map(users.map((u) => [u.id, u]));
    return userIds.map((id) => userMap.get(id) || null);
  });
}

// context.ts -- create a new DataLoader per request
export function createContext({ req }: { req: Request }) {
  return {
    currentUser: getUserFromToken(req),
    loaders: {
      user: createUserLoader(db),
      post: createPostLoader(db),
    },
  };
}

// resolvers -- use the loader instead of direct DB queries
const resolvers = {
  Post: {
    author: (parent, _args, context) => {
      // Batched: all author lookups in this request are combined
      return context.loaders.user.load(parent.authorId);
    },
  },
};
```

### DataLoader Rules

| Rule | Why |
|------|-----|
| Create a new instance per request | DataLoader caches results -- reusing across requests serves stale data |
| Return results in input order | DataLoader maps results by position, not by key |
| Return null for missing items | Do not throw -- return null and let the resolver handle it |
| Keep batch functions focused | One DataLoader per entity type |

---

## 5. Code-First vs Schema-First

### Schema-First

Write the schema in SDL (Schema Definition Language), then implement resolvers.

```graphql
# schema.graphql -- the source of truth
type Query {
  user(id: ID!): User
}

type User {
  id: ID!
  name: String!
  email: String!
}
```

```typescript
// resolvers.ts -- must match the schema exactly
const resolvers = {
  Query: {
    user: (_, { id }) => db.users.findById(id),
  },
};
```

**Pros**: Schema is readable, serves as documentation, frontend can work from the schema before resolvers exist.

**Cons**: Schema and resolvers can drift. No type safety between them without codegen.

### Code-First

Define the schema programmatically with a library like Pothos, Nexus, or TypeGraphQL.

```typescript
// schema.ts -- types and resolvers in one place
import SchemaBuilder from "@pothos/core";

const builder = new SchemaBuilder({});

builder.objectType("User", {
  fields: (t) => ({
    id: t.exposeID("id"),
    name: t.exposeString("name"),
    email: t.exposeString("email"),
    posts: t.field({
      type: [Post],
      resolve: (user, _args, context) =>
        context.loaders.postsByAuthor.load(user.id),
    }),
  }),
});

builder.queryType({
  fields: (t) => ({
    user: t.field({
      type: "User",
      nullable: true,
      args: { id: t.arg.id({ required: true }) },
      resolve: (_root, { id }, context) => context.loaders.user.load(id),
    }),
  }),
});

export const schema = builder.toSchema();
```

**Pros**: Full type safety, no drift between schema and resolvers, refactoring support from IDE.

**Cons**: Schema is harder to read at a glance, steeper learning curve.

### Recommendation

Use **schema-first with codegen** for teams where the schema serves as a contract between frontend and backend. Use **code-first** when a single team owns both and wants maximum type safety.

---

## 6. Apollo Server Setup

```typescript
// server.ts
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { readFileSync } from "fs";
import express from "express";
import { resolvers } from "./resolvers";
import { createContext } from "./context";

const typeDefs = readFileSync("./schema.graphql", "utf-8");

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    // Disable introspection in production
    process.env.NODE_ENV === "production"
      ? { requestDidStart: async () => ({}) }
      : undefined,
  ].filter(Boolean),
});

await server.start();

const app = express();
app.use(
  "/graphql",
  express.json(),
  expressMiddleware(server, {
    context: createContext,
  })
);

app.listen(4000);
```

---

## 7. Error Handling

### User Errors vs System Errors

```typescript
// User errors: expected, part of business logic
// Return them in the payload, not as GraphQL errors

type CreatePostPayload {
  post: Post
  errors: [UserError!]!
}

// System errors: unexpected, infrastructure failures
// Throw them as GraphQL errors

import { GraphQLError } from "graphql";

function requireAuth(context: Context) {
  if (!context.currentUser) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
  return context.currentUser;
}

// In resolvers
const resolvers = {
  Mutation: {
    createPost: async (_, { input }, context) => {
      const user = requireAuth(context);

      // Validation -- return as user error
      if (input.title.length < 3) {
        return {
          post: null,
          errors: [
            { field: "title", message: "Title must be at least 3 characters", code: "VALIDATION" },
          ],
        };
      }

      const post = await context.dataSources.posts.create({
        ...input,
        authorId: user.id,
      });

      return { post, errors: [] };
    },
  },
};
```

### Error Formatting

```typescript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (formattedError, error) => {
    // Never expose internal errors to clients
    if (formattedError.extensions?.code === "INTERNAL_SERVER_ERROR") {
      console.error("Internal error:", error);
      return {
        message: "An unexpected error occurred",
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      };
    }

    // Strip stack traces in production
    if (process.env.NODE_ENV === "production") {
      delete formattedError.extensions?.stacktrace;
    }

    return formattedError;
  },
});
```

---

## 8. Pagination

### Cursor-Based Pagination (Relay Spec)

```graphql
# Connection type
type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type PostEdge {
  node: Post!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

```typescript
// Resolver implementation
async function paginatePosts(
  { first = 20, after, filter }: PaginationArgs,
  db: Database
): Promise<PostConnection> {
  const limit = Math.min(first, 100); // Cap at 100

  // Decode cursor (base64 encoded ID or offset)
  const cursorId = after ? Buffer.from(after, "base64").toString("utf-8") : null;

  const whereClause = cursorId
    ? { id: { gt: cursorId }, ...filter }
    : { ...filter };

  const posts = await db.post.findMany({
    where: whereClause,
    take: limit + 1, // Fetch one extra to determine hasNextPage
    orderBy: { id: "asc" },
  });

  const hasNextPage = posts.length > limit;
  const edges = posts.slice(0, limit).map((post) => ({
    node: post,
    cursor: Buffer.from(post.id).toString("base64"),
  }));

  return {
    edges,
    pageInfo: {
      hasNextPage,
      hasPreviousPage: !!after,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    },
    totalCount: await db.post.count({ where: filter }),
  };
}
```

---

## 9. Authentication and Authorization

### Context-Based Auth

```typescript
// context.ts
import { GraphQLError } from "graphql";
import { verifyToken } from "./auth";

export async function createContext({ req }: { req: Request }) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  let currentUser = null;

  if (token) {
    try {
      const payload = await verifyToken(token);
      currentUser = await db.user.findById(payload.userId);
    } catch {
      // Invalid token -- continue as unauthenticated
    }
  }

  return {
    currentUser,
    loaders: createLoaders(),
  };
}
```

### Directive-Based Authorization

```graphql
# Schema directives
directive @auth(requires: UserRole = USER) on FIELD_DEFINITION
directive @owner on FIELD_DEFINITION

type Query {
  users: [User!]! @auth(requires: ADMIN)
  me: User @auth
}

type Mutation {
  updateUser(id: ID!, input: UpdateUserInput!): User @auth @owner
  deleteUser(id: ID!): Boolean @auth(requires: ADMIN)
}
```

```typescript
// Auth directive transformer
import { mapSchema, MapperKind, getDirective } from "@graphql-tools/utils";

function authDirectiveTransformer(schema: GraphQLSchema) {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const authDirective = getDirective(schema, fieldConfig, "auth")?.[0];
      if (!authDirective) return fieldConfig;

      const requiredRole = authDirective.requires || "USER";
      const originalResolve = fieldConfig.resolve;

      fieldConfig.resolve = async (source, args, context, info) => {
        if (!context.currentUser) {
          throw new GraphQLError("Authentication required", {
            extensions: { code: "UNAUTHENTICATED" },
          });
        }

        if (!hasRole(context.currentUser, requiredRole)) {
          throw new GraphQLError("Insufficient permissions", {
            extensions: { code: "FORBIDDEN" },
          });
        }

        return originalResolve?.(source, args, context, info);
      };

      return fieldConfig;
    },
  });
}
```

---

## 10. Caching Strategies

### Apollo Client Normalized Cache

```typescript
import { ApolloClient, InMemoryCache } from "@apollo/client";

const client = new ApolloClient({
  uri: "/graphql",
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          posts: {
            // Merge paginated results
            keyArgs: ["filter"],
            merge(existing, incoming, { args }) {
              if (!args?.after) return incoming;
              return {
                ...incoming,
                edges: [...(existing?.edges || []), ...incoming.edges],
              };
            },
          },
        },
      },
      User: {
        // Custom cache key
        keyFields: ["id"],
      },
      Post: {
        keyFields: ["id"],
        fields: {
          // Field-level read policy
          createdAt: {
            read(value: string) {
              return new Date(value);
            },
          },
        },
      },
    },
  }),
});
```

### Server-Side Caching

```typescript
// Cache hints in resolvers
const resolvers = {
  Query: {
    posts: async (_parent, args, context, info) => {
      // Cache for 60 seconds, shared across users
      info.cacheControl.setCacheHint({ maxAge: 60, scope: "PUBLIC" });
      return context.dataSources.posts.findMany(args);
    },

    me: async (_parent, _args, context, info) => {
      // User-specific data -- private cache
      info.cacheControl.setCacheHint({ maxAge: 30, scope: "PRIVATE" });
      return context.dataSources.users.findById(context.currentUser.id);
    },
  },
};
```

---

## 11. Schema Federation

Federation splits a monolithic GraphQL schema across multiple services.

```graphql
# User Service
type User @key(fields: "id") {
  id: ID!
  name: String!
  email: String!
}

type Query {
  me: User
}

# Post Service -- extends User from another service
type User @key(fields: "id") {
  id: ID!
  posts: [Post!]!
}

type Post @key(fields: "id") {
  id: ID!
  title: String!
  content: String!
  author: User!
}

type Query {
  post(id: ID!): Post
}
```

```typescript
// Post Service resolver -- resolve the User reference
const resolvers = {
  User: {
    __resolveReference: async (user, context) => {
      // Only need to resolve the fields this service owns
      return { id: user.id }; // id comes from the reference
    },
    posts: async (user, _args, context) => {
      return context.dataSources.posts.findByAuthorId(user.id);
    },
  },
};
```

---

## 12. Security: Depth and Complexity Limiting

### Depth Limiting

Prevent deeply nested queries that could cause exponential resolver execution.

```typescript
import depthLimit from "graphql-depth-limit";

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(7)], // Max 7 levels deep
});
```

### Query Complexity Analysis

```typescript
import { createComplexityLimitRule } from "graphql-validation-complexity";

const ComplexityLimit = createComplexityLimitRule(1000, {
  scalarCost: 1,
  objectCost: 2,
  listFactor: 10,

  onCost: (cost) => {
    console.log("Query complexity:", cost);
  },

  formatErrorMessage: (cost) =>
    `Query complexity ${cost} exceeds maximum allowed complexity of 1000`,
});

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(7), ComplexityLimit],
});
```

### Persisted Queries

Lock down the API to only allow pre-registered queries in production.

```typescript
import { ApolloServerPluginPersistedQueries } from "@apollo/server";

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    ApolloServerPluginPersistedQueries({
      // Only allow persisted queries in production
      ...(process.env.NODE_ENV === "production" && {
        rejectUnpersistedQueries: true,
      }),
    }),
  ],
});
```

---

## 13. Testing

### Resolver Unit Tests

```typescript
import { describe, it, expect, vi } from "vitest";
import { resolvers } from "./resolvers";

describe("Query.user", () => {
  it("returns user by ID", async () => {
    const mockUser = { id: "1", name: "Alice", email: "alice@example.com" };
    const context = {
      dataSources: {
        users: { findById: vi.fn().mockResolvedValue(mockUser) },
      },
    };

    const result = await resolvers.Query.user(null, { id: "1" }, context, {} as any);
    expect(result).toEqual(mockUser);
    expect(context.dataSources.users.findById).toHaveBeenCalledWith("1");
  });

  it("returns null for non-existent user", async () => {
    const context = {
      dataSources: {
        users: { findById: vi.fn().mockResolvedValue(null) },
      },
    };

    const result = await resolvers.Query.user(null, { id: "999" }, context, {} as any);
    expect(result).toBeNull();
  });
});
```

### Integration Tests with Apollo Server

```typescript
import { ApolloServer } from "@apollo/server";
import { describe, it, expect, beforeAll } from "vitest";

describe("GraphQL API", () => {
  let server: ApolloServer;

  beforeAll(async () => {
    server = new ApolloServer({ typeDefs, resolvers });
    await server.start();
  });

  it("fetches a user with posts", async () => {
    const response = await server.executeOperation({
      query: `
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            name
            posts(first: 5) {
              edges {
                node {
                  title
                }
              }
            }
          }
        }
      `,
      variables: { id: "1" },
    });

    expect(response.body.kind).toBe("single");
    if (response.body.kind === "single") {
      expect(response.body.singleResult.errors).toBeUndefined();
      expect(response.body.singleResult.data?.user?.name).toBeDefined();
    }
  });

  it("returns error for unauthenticated mutation", async () => {
    const response = await server.executeOperation({
      query: `
        mutation {
          createPost(input: { title: "Test", content: "Body" }) {
            post { id }
            errors { message code }
          }
        }
      `,
    });

    if (response.body.kind === "single") {
      const payload = response.body.singleResult.data?.createPost;
      expect(payload.post).toBeNull();
      expect(payload.errors[0].code).toBe("UNAUTHENTICATED");
    }
  });
});
```

---

## 14. Code Generation

### graphql-codegen Setup

```yaml
# codegen.ts
import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "./src/schema.graphql",
  documents: "./src/**/*.graphql",
  generates: {
    # Server-side types
    "./src/generated/graphql.ts": {
      plugins: [
        "typescript",
        "typescript-resolvers",
      ],
      config: {
        contextType: "../context#Context",
        mapperTypeSuffix: "Model",
        mappers: {
          User: "../models/user#UserModel",
          Post: "../models/post#PostModel",
        },
      },
    },
    # Client-side types and hooks
    "./src/generated/client.ts": {
      plugins: [
        "typescript",
        "typescript-operations",
        "typescript-react-apollo",
      ],
      config: {
        withHooks: true,
        withComponent: false,
      },
    },
  },
};

export default config;
```

```bash
# Run codegen
npx graphql-codegen

# Watch mode
npx graphql-codegen --watch
```

### Using Generated Types

```typescript
// Server -- resolvers are fully typed
import type { Resolvers } from "./generated/graphql";

const resolvers: Resolvers = {
  Query: {
    // TypeScript enforces correct return types and argument types
    user: async (_parent, { id }, context) => {
      return context.dataSources.users.findById(id);
    },
  },
};

// Client -- hooks are fully typed
import { useGetUserQuery } from "./generated/client";

function UserProfile({ userId }: { userId: string }) {
  // data is typed as GetUserQuery
  const { data, loading, error } = useGetUserQuery({
    variables: { id: userId },
  });

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  // data.user is fully typed
  return <div>{data?.user?.name}</div>;
}
```

---

## 15. Anti-Patterns

### NEVER

- Expose database models directly as GraphQL types -- create separate GraphQL types
- Return raw database errors to clients -- wrap them in user-friendly messages
- Skip DataLoader -- every relationship resolver must use batching
- Allow unlimited query depth or complexity -- enforce limits
- Use REST-style naming (`getUser`, `listPosts`) -- use `user`, `posts`
- Put business logic in resolvers -- resolvers orchestrate, services compute
- Ignore nullability -- every field should be explicitly nullable or non-nullable
- Use `ID` type for non-identifier fields -- `ID` is for unique identifiers only
- Return different shapes for the same error in different mutations
- Skip input validation because "the schema handles types"

### ALWAYS

- Use input types for mutation arguments
- Return payload types from mutations (not raw entities)
- Implement cursor-based pagination for list fields
- Use DataLoader for all relationship fields
- Generate TypeScript types from the schema
- Version your API through schema evolution, not URL versioning
- Document deprecated fields with `@deprecated(reason: "...")` before removal
- Set cache hints on resolvers that return public data
- Test both happy paths and error paths in resolver tests
- Validate inputs beyond what the schema enforces (string length, format, business rules)

---

## 16. Schema Design Checklist

Before shipping a new type or field:

- [ ] All fields have explicit nullability (`!` for non-nullable)
- [ ] List fields use pagination (not unbounded arrays)
- [ ] Mutations return payload types with an `errors` field
- [ ] Input types are used for all mutation arguments
- [ ] Relationships use DataLoader in resolvers
- [ ] Depth and complexity limits are configured
- [ ] Generated types are up to date
- [ ] Resolver tests cover happy path, error path, and auth
- [ ] Schema documentation is written with descriptions
- [ ] Deprecated fields have migration paths documented
