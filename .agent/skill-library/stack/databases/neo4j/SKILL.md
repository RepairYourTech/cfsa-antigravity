---
name: neo4j
description: "Expert Neo4j guide covering graph data modeling, Cypher query patterns, index strategy, driver setup, cross-store coordination with primary stores, and security hardening. Use when designing graph schemas, traversing relationships, or integrating Neo4j with a polyglot persistence architecture."
version: 1.0.0
---

# Neo4j Expert Guide

> Use this skill when designing graph schemas, writing Cypher queries, planning index strategies, setting up drivers, coordinating Neo4j with a primary relational/document store, or hardening a Neo4j deployment. This skill assumes Neo4j 5.x unless noted otherwise.

## When to Use This Skill

- Designing a graph data model for relationship-heavy domains (social networks, recommendation engines, access control hierarchies, knowledge graphs, fraud detection)
- Writing or reviewing Cypher queries
- Planning indexes and constraints for query performance
- Setting up Neo4j driver connections in any language
- Integrating Neo4j as a secondary store alongside a primary relational/document database
- Hardening Neo4j for production deployment

## When NOT to Use This Skill

- Flat tabular data with no meaningful relationships → use the primary relational store
- Simple key-value lookups → use Redis or the primary store
- Full-text search as the primary use case → use a dedicated search engine (Meilisearch, Elasticsearch)
- Time-series data → use TimescaleDB or InfluxDB

---

## 1. Graph Data Modeling

### Nodes and Labels

Nodes represent entities. Every node has one or more **labels** that classify it.

**Label strategy — single responsibility per label:**

```cypher
// GOOD: Each label represents one concept
(:User)
(:Content)
(:Organization)

// BAD: Over-labelling with redundant or overlapping labels
(:User:Person:Account:Entity)
```

Labels should be:
- **Singular nouns** — `:User` not `:Users`
- **PascalCase** — `:ContentItem` not `:content_item`
- **Non-overlapping** — a node should not have two labels that mean the same thing

Use multiple labels only when they represent genuinely independent classification axes:

```cypher
// GOOD: Independent axes
(:User:Admin)         -- Admin is a role, User is the entity type
(:Content:Published)  -- Published is a state, Content is the entity type

// BAD: Redundant
(:User:Person)        -- Person adds no information beyond User
```

### Relationship Types

Relationships connect nodes and always have a **type** and a **direction**.

**Naming convention — uppercase verbs:**

```cypher
// GOOD: Verb-based, uppercase, descriptive
(user)-[:FOLLOWS]->(otherUser)
(user)-[:AUTHORED]->(article)
(article)-[:BELONGS_TO]->(category)
(user)-[:VIEWED {at: datetime()}]->(content)

// BAD: Noun-based, lowercase, or vague
(user)-[:friend]->(otherUser)
(user)-[:article_relationship]->(article)
(user)-[:RELATED_TO]->(content)  -- too vague
```

**Directionality:**

Relationships are always stored with a direction, but **traversal is bidirectional** — Cypher can traverse against the arrow direction. Direction matters when:

- The relationship is inherently asymmetric: `(a)-[:FOLLOWS]->(b)` (a follows b, but b may not follow a)
- You need to distinguish roles: `(employee)-[:WORKS_AT]->(company)` vs `(company)-[:EMPLOYS]->(employee)`

Direction does NOT matter when:

- The relationship is symmetric: `(a)-[:FRIENDS_WITH]->(b)` — direction is arbitrary, queries should omit the arrow: `(a)-[:FRIENDS_WITH]-(b)`

### Properties on Nodes vs Relationships

**Node properties** — attributes of the entity itself:

```cypher
CREATE (u:User {
  userId: "uuid-from-postgres",  // canonical ID from primary store
  username: "janedoe",
  displayName: "Jane Doe",
  createdAt: datetime()
})
```

**Relationship properties** — attributes of the connection, not the entities:

```cypher
CREATE (u)-[:FOLLOWS {
  since: datetime(),
  notificationsEnabled: true
}]->(other)
```

**Rule of thumb:** If the property describes *when*, *how*, or *why* two entities are connected, it belongs on the relationship. If it describes the entity itself, it belongs on the node.

### Cardinality Notation

Document cardinality in your schema design:

```
(:User)-[:FOLLOWS]->(:User)           1:N (a user can follow many users)
(:User)-[:AUTHORED]->(:Article)       1:N (a user authors many articles)
(:Article)-[:BELONGS_TO]->(:Category) N:1 (many articles in one category)
(:User)-[:RATED {score: int}]->(:Content) N:M (many users rate many contents)
```

### When NOT to Use a Graph Store

Do not model the following in Neo4j:

| Data Type | Better Store | Why |
|-----------|-------------|-----|
| Flat tabular data (users table, settings) | PostgreSQL | No relationship traversal needed; relational queries are faster |
| Simple key-value lookups | Redis | Sub-millisecond reads without graph overhead |
| Time-series metrics | TimescaleDB | Chunk-based indexing outperforms graph for time-range queries |
| Binary blobs, images, files | S3/object storage | Neo4j is not a file store |
| Full-text search corpus | Meilisearch/Elasticsearch | Purpose-built for full-text ranking |

---

## 2. Cypher Query Patterns

### MATCH — Reading Data

```cypher
// Simple node match
MATCH (u:User {userId: $userId})
RETURN u.displayName, u.username

// Match with relationship
MATCH (u:User {userId: $userId})-[:AUTHORED]->(a:Article)
RETURN a.title, a.publishedAt
ORDER BY a.publishedAt DESC
LIMIT 10

// Match multiple relationship types
MATCH (u:User {userId: $userId})-[:FOLLOWS|BLOCKS]->(other:User)
RETURN other.username, type(r) AS relationshipType
```

### OPTIONAL MATCH — Left Join Equivalent

```cypher
// Return user even if they have no articles
MATCH (u:User {userId: $userId})
OPTIONAL MATCH (u)-[:AUTHORED]->(a:Article)
RETURN u.displayName, collect(a.title) AS articles
```

### CREATE — Writing Data

```cypher
// Create a node
CREATE (u:User {
  userId: $userId,
  username: $username,
  createdAt: datetime()
})
RETURN u

// Create a relationship
MATCH (u:User {userId: $userId})
MATCH (other:User {userId: $targetUserId})
CREATE (u)-[:FOLLOWS {since: datetime()}]->(other)
```

### MERGE — Idempotent Upsert

```cypher
// Create if not exists, match if exists
MERGE (u:User {userId: $userId})
ON CREATE SET u.username = $username, u.createdAt = datetime()
ON MATCH SET u.lastSeen = datetime()
RETURN u
```

### WITH — Pipeline Results Between Clauses

```cypher
// Find users who follow the same people as a given user
MATCH (me:User {userId: $userId})-[:FOLLOWS]->(mutual)
WITH me, collect(mutual) AS myFollows
MATCH (other:User)-[:FOLLOWS]->(mutual)
WHERE mutual IN myFollows AND other <> me
RETURN other.username, count(mutual) AS sharedFollows
ORDER BY sharedFollows DESC
LIMIT 10
```

### UNWIND — List Expansion

```cypher
// Batch create relationships from a list
UNWIND $userIds AS targetId
MATCH (u:User {userId: $userId})
MATCH (target:User {userId: targetId})
MERGE (u)-[:FOLLOWS {since: datetime()}]->(target)
```

### Aggregation

```cypher
// Count, collect, sum, avg
MATCH (u:User)-[:AUTHORED]->(a:Article)
RETURN u.username,
       count(a) AS articleCount,
       collect(a.title) AS titles,
       avg(a.wordCount) AS avgWords
ORDER BY articleCount DESC
```

### Path Patterns

```cypher
// Shortest path
MATCH p = shortestPath(
  (a:User {userId: $startId})-[:FOLLOWS*]-(b:User {userId: $endId})
)
RETURN p, length(p) AS hops

// Variable-length paths (bounded)
MATCH (u:User {userId: $userId})-[:FOLLOWS*1..3]->(distant:User)
RETURN DISTINCT distant.username, min(length(p)) AS minHops

// All shortest paths
MATCH p = allShortestPaths(
  (a:User {userId: $startId})-[:FOLLOWS*]-(b:User {userId: $endId})
)
RETURN p
```

> ⚠️ **Always bound variable-length paths** — `[:FOLLOWS*]` without bounds can traverse the entire graph. Use `[:FOLLOWS*1..N]` with a sensible upper bound.

### Pattern Comprehensions

```cypher
// Inline sub-query as a list
MATCH (u:User {userId: $userId})
RETURN u.username,
       [(u)-[:FOLLOWS]->(f:User) | f.username] AS following,
       [(u)<-[:FOLLOWS]-(f:User) | f.username] AS followers
```

### CALL {} Subqueries

```cypher
// Subquery for complex aggregation
MATCH (u:User)
CALL {
  WITH u
  MATCH (u)-[:AUTHORED]->(a:Article)
  RETURN count(a) AS articleCount
}
RETURN u.username, articleCount
ORDER BY articleCount DESC
LIMIT 10
```

### Multi-Step Example

Find all users within 2 hops of a given user who also follow the same content:

```cypher
// Step 1: Find users within 2 hops
MATCH (me:User {userId: $userId})-[:FOLLOWS*1..2]->(nearby:User)
WHERE nearby <> me
WITH me, collect(DISTINCT nearby) AS nearbyUsers

// Step 2: Find content I follow
MATCH (me)-[:FOLLOWS]->(c:Content)
WITH nearbyUsers, collect(c) AS myContent

// Step 3: Filter nearby users who follow the same content
UNWIND nearbyUsers AS candidate
MATCH (candidate)-[:FOLLOWS]->(c:Content)
WHERE c IN myContent
RETURN candidate.username,
       count(c) AS sharedContentCount,
       collect(c.title) AS sharedContent
ORDER BY sharedContentCount DESC
LIMIT 20
```

---

## 3. Index Strategy

### Node Property Indexes

```cypher
// Range index (default) — for equality, range, prefix, existence
CREATE INDEX user_userId FOR (u:User) ON (u.userId)

// Text index — for full-text-like CONTAINS and ENDS WITH queries
CREATE TEXT INDEX user_username_text FOR (u:User) ON (u.username)

// Point index — for geospatial queries
CREATE POINT INDEX location_coords FOR (l:Location) ON (l.coordinates)

// Composite index — for multi-property lookups
CREATE INDEX user_org_role FOR (u:User) ON (u.organizationId, u.role)
```

### Relationship Property Indexes

```cypher
// Index on relationship properties (Neo4j 5.x)
CREATE INDEX follows_since FOR ()-[r:FOLLOWS]-() ON (r.since)
```

### Full-Text Indexes

```cypher
// Create a full-text index across multiple node properties
CREATE FULLTEXT INDEX content_search FOR (c:Content)
ON EACH [c.title, c.description, c.body]

// Query the full-text index
CALL db.index.fulltext.queryNodes("content_search", "graph database tutorial")
YIELD node, score
RETURN node.title, score
ORDER BY score DESC
LIMIT 10
```

### Constraints

```cypher
// Uniqueness constraint (also creates an index)
CREATE CONSTRAINT user_userId_unique FOR (u:User)
REQUIRE u.userId IS UNIQUE

// Existence constraint (property must be present)
CREATE CONSTRAINT user_userId_exists FOR (u:User)
REQUIRE u.userId IS NOT NULL

// Node key (composite uniqueness + existence)
CREATE CONSTRAINT org_user_key FOR (m:Membership)
REQUIRE (m.organizationId, m.userId) IS NODE KEY
```

### Verifying Index Usage

```cypher
// EXPLAIN — shows the query plan without executing
EXPLAIN MATCH (u:User {userId: $userId}) RETURN u

// PROFILE — executes the query and shows actual row counts per step
PROFILE MATCH (u:User {userId: $userId}) RETURN u
```

Look for `NodeIndexSeek` or `RelationshipIndexSeek` in the plan. If you see `NodeByLabelScan` or `AllNodesScan` on a frequently queried property, you need an index.

### When to Index

| Scenario | Index Type |
|----------|-----------|
| Lookup by canonical ID (`userId`) | Range index + uniqueness constraint |
| Prefix search on usernames | Text index |
| Date range queries on relationships | Relationship property index |
| Free-text search across properties | Full-text index |
| Geospatial queries (nearby locations) | Point index |
| Multi-property lookups (org + role) | Composite index |

---

## 4. Driver Setup

### Connection Pattern (Language-Agnostic)

```
URI:  bolt://localhost:7687   (unencrypted, dev only)
      neo4j://host:7687      (routed, production)
      neo4j+s://host:7687    (routed + TLS, production)
Auth: neo4j / <password>
```

### JavaScript/TypeScript (neo4j-driver)

```typescript
import neo4j, { Driver, Session } from 'neo4j-driver';

// Create driver (application lifecycle — create once, close on shutdown)
const driver: Driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!),
  {
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 30000, // ms
  }
);

// Verify connectivity on startup
await driver.verifyConnectivity();

// Transaction function (recommended — auto-retries on transient errors)
async function findFollowers(userId: string) {
  const session: Session = driver.session({ database: 'neo4j' });
  try {
    const result = await session.executeRead(async (tx) => {
      return tx.run(
        'MATCH (u:User {userId: $userId})<-[:FOLLOWS]-(f:User) RETURN f.username AS username',
        { userId }
      );
    });
    return result.records.map((r) => r.get('username'));
  } finally {
    await session.close(); // ALWAYS close sessions in finally
  }
}

// Shutdown
process.on('SIGTERM', async () => {
  await driver.close();
});
```

### Python (neo4j package)

```python
from neo4j import GraphDatabase

driver = GraphDatabase.driver(
    os.environ["NEO4J_URI"],
    auth=(os.environ["NEO4J_USER"], os.environ["NEO4J_PASSWORD"]),
    max_connection_pool_size=50,
)

def find_followers(user_id: str) -> list[str]:
    with driver.session(database="neo4j") as session:
        result = session.execute_read(
            lambda tx: tx.run(
                "MATCH (u:User {userId: $userId})<-[:FOLLOWS]-(f:User) "
                "RETURN f.username AS username",
                userId=user_id,
            ).data()
        )
        return [r["username"] for r in result]

# Shutdown
driver.close()
```

### Go (neo4j-go-driver)

```go
package main

import (
	"context"
	"os"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

func main() {
	ctx := context.Background()

	// Create driver (application lifecycle — create once, close on shutdown)
	driver, err := neo4j.NewDriverWithContext(
		os.Getenv("NEO4J_URI"),
		neo4j.BasicAuth(os.Getenv("NEO4J_USER"), os.Getenv("NEO4J_PASSWORD"), ""),
	)
	if err != nil {
		panic(err)
	}
	defer driver.Close(ctx)

	// Verify connectivity
	if err := driver.VerifyConnectivity(ctx); err != nil {
		panic(err)
	}

	// Transaction function (recommended — auto-retries on transient errors)
	session := driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: "neo4j"})
	defer session.Close(ctx)

	followers, err := neo4j.ExecuteRead(ctx, session, func(tx neo4j.ManagedTransaction) ([]string, error) {
		result, err := tx.Run(ctx,
			"MATCH (u:User {userId: $userId})<-[:FOLLOWS]-(f:User) RETURN f.username AS username",
			map[string]any{"userId": "target-user-id"},
		)
		if err != nil {
			return nil, err
		}

		var usernames []string
		for result.Next(ctx) {
			usernames = append(usernames, result.Record().Values[0].(string))
		}
		return usernames, result.Err()
	})
	if err != nil {
		panic(err)
	}
	_ = followers
}
```

### Java (neo4j-java-driver)

```java
import org.neo4j.driver.*;
import org.neo4j.driver.summary.ResultSummary;
import java.util.List;
import java.util.Map;

public class Neo4jExample {
    public static void main(String[] args) {
        // Create driver (application lifecycle — create once, close on shutdown)
        Driver driver = GraphDatabase.driver(
            System.getenv("NEO4J_URI"),
            AuthTokens.basic(System.getenv("NEO4J_USER"), System.getenv("NEO4J_PASSWORD")),
            Config.builder()
                .withMaxConnectionPoolSize(50)
                .build()
        );

        // Verify connectivity
        driver.verifyConnectivity();

        // Transaction function (recommended — auto-retries on transient errors)
        try (Session session = driver.session(SessionConfig.forDatabase("neo4j"))) {
            List<String> followers = session.executeRead(tx -> {
                Result result = tx.run(
                    "MATCH (u:User {userId: $userId})<-[:FOLLOWS]-(f:User) RETURN f.username AS username",
                    Map.of("userId", "target-user-id")
                );
                return result.list(r -> r.get("username").asString());
            });
        }

        // Shutdown
        driver.close();
    }
}
```

### Session Lifecycle Rules

1. **Create one driver per application** — the driver manages a connection pool internally
2. **Create a new session per unit of work** — sessions are lightweight
3. **Always close sessions in a finally block** — leaked sessions exhaust the pool
4. **Use transaction functions** (`executeRead`, `executeWrite`) — they auto-retry on transient errors (leader changes in a cluster)
5. **Never share sessions across threads/coroutines** — sessions are not thread-safe

### Connection Pool Configuration

| Setting | Default | Recommendation |
|---------|---------|---------------|
| `maxConnectionPoolSize` | 100 | Set to expected concurrent operations × 1.5 |
| `connectionAcquisitionTimeout` | 60s | Reduce to 30s to fail fast under load |
| `maxTransactionRetryTime` | 30s | Keep default unless you have very fast transactions |

---

## 5. Cross-Store Coordination

### Canonical ID Rule

**The primary store's UUID is the canonical identifier.** Store it as a node property in Neo4j and create a uniqueness constraint:

```cypher
CREATE CONSTRAINT user_userId_unique FOR (u:User)
REQUIRE u.userId IS UNIQUE
```

**Never use Neo4j's internal identifiers** (`id()` or element IDs) as canonical identifiers:
- Internal IDs are recycled after node deletion
- Element IDs are not portable across database exports/restores
- They are implementation details, not business identifiers

```cypher
// GOOD: Use the primary store's UUID
MATCH (u:User {userId: "a1b2c3d4-e5f6-..."})
RETURN u

// BAD: Use Neo4j internal ID
MATCH (u:User) WHERE id(u) = 42
RETURN u
```

### Creation Sequence

1. **Write to the primary store first** (e.g., PostgreSQL) — this generates the canonical UUID
2. **Then create the Neo4j node** using the returned UUID
3. **If Neo4j write fails:**
   - The primary store record exists but the graph node does not
   - Queue a retry (async retry queue or background job)
   - The application should handle the "graph node not found" case gracefully (return data from the primary store without graph enrichment)
   - Never roll back the primary store write because of a Neo4j failure — the primary store is the source of truth

### Deletion Cascade

1. Delete from the primary store (or soft-delete)
2. Delete the Neo4j node and all its relationships:

```cypher
// Delete node and all connected relationships
MATCH (u:User {userId: $userId})
DETACH DELETE u
```

3. If the Neo4j delete fails, queue a cleanup job — orphaned graph nodes are annoying but not data-corrupting

### Read Strategy

When a read requires data from both stores:

```
1. Query primary store for entity attributes
2. Query Neo4j for relationship data (followers, connections, paths)
3. Merge results at the application layer
```

Name this pattern explicitly in your architecture: **"Application-Layer Graph Enrichment"** — the primary store answers "what is this entity?" and Neo4j answers "how is this entity connected?"

---

## 6. Security

### Credential Handling

```bash
# GOOD: Environment variables
NEO4J_URI=neo4j+s://production-host:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=<from-secret-manager>

# BAD: Hardcoded in source
const driver = neo4j.driver("bolt://localhost:7687", neo4j.auth.basic("neo4j", "password123"));
```

### Query Injection Prevention

**Always use parameterized Cypher.** Never interpolate user input into query strings.

```cypher
// GOOD: Parameterized query
MATCH (u:User {userId: $userId}) RETURN u

// BAD: String interpolation — VULNERABLE TO INJECTION
MATCH (u:User {userId: '${userId}'}) RETURN u
```

In code:

```typescript
// GOOD
await tx.run('MATCH (u:User {userId: $userId}) RETURN u', { userId });

// BAD — NEVER DO THIS
await tx.run(`MATCH (u:User {userId: '${userId}'}) RETURN u`);
```

### Network Exposure

- **Bolt port 7687 must not be public-facing** — keep behind a VPC, private network, or firewall
- In cloud deployments, use a VPN or private service endpoint
- In Docker, bind to internal network only: `--publish 127.0.0.1:7687:7687`

### TLS Configuration

```
# Production: Always use encrypted connections
URI: neo4j+s://host:7687     (TLS with certificate verification)
URI: neo4j+ssc://host:7687   (TLS with self-signed certificate — dev/staging only)
```

### Role-Based Access Control

Neo4j native auth roles:

| Role | Permissions |
|------|------------|
| `reader` | Read-only access to all data |
| `editor` | Read + write to all data |
| `publisher` | Read + write + create/drop indexes |
| `architect` | Publisher + create/drop constraints |
| `admin` | Full control including user management |

```cypher
// Create a user with reader role
CREATE USER appReader SET PASSWORD $password SET STATUS ACTIVE
GRANT ROLE reader TO appReader

// Application connections should use the least-privilege role
// Read-only services → reader
// Write services → editor
// Migration scripts → architect
```

---

## 7. Common Anti-Patterns

### 1. Using Neo4j for Non-Graph Data

**Problem:** Storing flat tabular data (user profiles, settings, configuration) as nodes with no meaningful relationships.

**Why it's bad:** Neo4j stores properties on the heap with node/relationship overhead. For flat data, a relational table is more space-efficient and faster for simple lookups.

**Fix:** Only store in Neo4j what requires relationship traversal. Keep flat entity data in the primary store. Use the cross-store coordination pattern to link them via canonical IDs.

### 2. Cartesian Products in Cypher

**Problem:** A `MATCH` with two unconnected node patterns produces a cross product.

```cypher
// BAD: Cartesian product — returns |users| × |articles| rows
MATCH (u:User), (a:Article)
RETURN u.username, a.title
```

**Fix:** Always specify the relationship pattern between matched nodes.

```cypher
// GOOD: Only returns user-article pairs connected by AUTHORED
MATCH (u:User)-[:AUTHORED]->(a:Article)
RETURN u.username, a.title
```

**Detection:** `PROFILE` the query — look for an `CartesianProduct` operator in the query plan.

### 3. Missing Indexes on Frequently Matched Properties

**Problem:** Querying by a property without an index triggers a `NodeByLabelScan` — scanning every node with that label.

```cypher
// If no index exists on User.email, this scans ALL User nodes
MATCH (u:User {email: $email}) RETURN u
```

**Detection:**

```cypher
PROFILE MATCH (u:User {email: $email}) RETURN u
// Look for NodeByLabelScan in the plan → needs an index
// Should show NodeIndexSeek after index creation
```

**Fix:** Create an index on any property used in `MATCH` or `WHERE` clauses:

```cypher
CREATE INDEX user_email FOR (u:User) ON (u.email)
```

### 4. Storing Large Blobs as Node Properties

**Problem:** Storing images, PDFs, or large text bodies as node properties.

**Why it's bad:** Neo4j stores all properties on the heap. Large blobs increase memory pressure and slow down traversals because the page cache fills with blob data instead of graph structure.

**Fix:** Store blobs in S3/object storage. Store the reference (URL or key) as a node property:

```cypher
CREATE (d:Document {
  documentId: $docId,
  title: $title,
  storageKey: "s3://bucket/documents/abc123.pdf",  // reference, not the file
  sizeBytes: 2048576
})
```

### 5. Over-Normalising Graph Schemas

**Problem:** Breaking entities into too many tiny nodes connected by structural relationships, mimicking a relational normal form.

```cypher
// BAD: Over-normalised — Address as a separate node for a single-use relationship
(:User)-[:HAS_ADDRESS]->(:Address)-[:IN_CITY]->(:City)-[:IN_COUNTRY]->(:Country)
```

**Fix:** If the relationship is 1:1 and the related entity has no independent lifecycle, store it as properties on the parent node:

```cypher
// GOOD: Address as properties (if no independent queries on addresses)
(:User {city: "Berlin", country: "DE", postalCode: "10115"})

// GOOD AS A GRAPH: Only if addresses are shared or queried independently
(:User)-[:LIVES_IN]->(:City {name: "Berlin"})-[:IN_COUNTRY]->(:Country {code: "DE"})
```

### 6. Unbounded Variable-Length Paths

**Problem:** Using `*` without bounds in variable-length path patterns.

```cypher
// BAD: Traverses the ENTIRE connected component — can be millions of nodes
MATCH p = (u:User {userId: $id})-[:FOLLOWS*]->(other)
RETURN other
```

**Fix:** Always set an upper bound:

```cypher
// GOOD: Bounded to 3 hops
MATCH p = (u:User {userId: $id})-[:FOLLOWS*1..3]->(other)
RETURN DISTINCT other.username
```

### 7. Not Using DETACH DELETE

**Problem:** Attempting to delete a node that still has relationships.

```cypher
// BAD: Fails if the node has any relationships
DELETE (u:User {userId: $id})
// Error: Cannot delete node with relationships
```

**Fix:** Always use `DETACH DELETE` to remove the node and all its relationships:

```cypher
// GOOD
MATCH (u:User {userId: $userId})
DETACH DELETE u
```
