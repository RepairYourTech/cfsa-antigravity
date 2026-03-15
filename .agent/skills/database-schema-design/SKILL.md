---
name: database-schema-design
description: Design database schemas with normalization, relationships, and constraints. Use when creating new database schemas, designing tables, or planning data models for any database paradigm.
---

# Database Schema Design

## Overview

Design scalable, well-structured database schemas with proper relationships, constraints, and data types. This skill covers universal data modeling principles. For paradigm-specific patterns, see references.

## When to Use

- New database schema design
- Data model planning
- Relationship design (1:1, 1:N, N:N, graph edges)
- Normalization or denormalization analysis
- Constraint and validation planning
- Performance optimization at schema level
- Cross-store entity consistency

## Paradigm-Specific References

After reading the methodology below, read the reference matching your surface's Databases column in the surface stack map (`.agent/instructions/tech-stack.md`):

| Paradigm | Reference | Example Stores |
|----------|-----------|----------------|
| Relational | `references/relational.md` | PostgreSQL, MySQL, SQLite |
| Document | `references/document.md` | MongoDB, Firestore, CouchDB |
| Graph | `references/graph.md` | SurrealDB, Neo4j, ArangoDB |
| Key-Value | `references/key-value.md` | Redis, DynamoDB, Memcached |

---

## Universal Data Modeling Principles

### 1. Entity Identification

Start with the domain:
1. **Identify nouns** — these become entities/tables/collections
2. **Identify relationships** — how entities connect
3. **Identify attributes** — what data each entity holds
4. **Identify cardinality** — one-to-one, one-to-many, many-to-many

### 2. Normalization vs Denormalization

**Normalization** reduces data duplication at the cost of join complexity:
- **1NF** — Eliminate repeating groups (no arrays/CSVs in a single field)
- **2NF** — Remove partial dependencies (every non-key attribute depends on the WHOLE key)
- **3NF** — Remove transitive dependencies (non-key attributes don't depend on each other)

**Denormalization** trades storage for read performance:
- Embed frequently co-read data together
- Pre-compute aggregates for dashboards
- Duplicate data intentionally (with consistency strategy)

**Decision framework:**
- Write-heavy, consistency-critical → normalize
- Read-heavy, latency-sensitive → denormalize
- Mixed → normalize core, denormalize read models

### 3. Relationship Patterns

| Pattern | Relational | Document | Graph |
|---------|-----------|----------|-------|
| **One-to-One** | Foreign key with UNIQUE | Embed subdocument | Edge with cardinality constraint |
| **One-to-Many** | Foreign key on child | Embed array OR reference | Edge from parent to children |
| **Many-to-Many** | Junction/join table | Array of references on both sides | Direct edges |
| **Hierarchical** | Self-referencing FK | Nested documents | Recursive graph traversal |

### 4. Access Pattern Design

Schema design is driven by how data is **queried**, not just how it's structured:

1. **List your read queries** — what does the UI need to display?
2. **List your write queries** — what creates/updates data?
3. **Design schema to serve the reads** — not the other way around
4. **Index for query patterns** — not for every possible query

### 5. Constraint Strategy

Every schema must enforce:
- **Required fields** — NOT NULL / required validators
- **Uniqueness** — unique constraints on natural keys (email, SKU, slug)
- **Referential integrity** — foreign keys, references, or application-level checks
- **Domain constraints** — CHECK constraints, enums, value ranges
- **Cascade behavior** — what happens when parent is deleted (CASCADE, SET NULL, RESTRICT)

### 6. ID Strategy

| Strategy | When to Use |
|----------|-------------|
| **UUID v4** | Default choice. No ordering, globally unique, no collision |
| **UUID v7** | When you need time-sortable UUIDs (better index performance) |
| **Auto-increment** | Simple cases, single-database, non-distributed |
| **ULID** | Time-sortable, lexicographically sortable, URL-safe |
| **Natural key** | When domain provides a unique identifier (ISBN, SSN) — use with caution |

---

## Schema Design Checklist

- [ ] Identify entities and relationships
- [ ] Choose ID strategy
- [ ] Apply normalization rules (or consciously denormalize with rationale)
- [ ] Define primary keys for all entities
- [ ] Create foreign keys / references for relationships
- [ ] Add constraints for data integrity
- [ ] Select appropriate data types
- [ ] Plan indexes for common queries
- [ ] Design for scalability
- [ ] Document entity purposes and relationships
- [ ] Plan for schema evolution

## Common Pitfalls

❌ Don't skip normalization for convenience
❌ Don't use unbounded text types for all string fields
❌ Don't forget referential integrity constraints
❌ Don't use mutable natural keys as primary keys
❌ Don't store computed values without a cache invalidation strategy
❌ Don't design schema without knowing query patterns

✅ DO use UUIDs or equivalent for primary keys
✅ DO normalize data unless you have a measured performance reason not to
✅ DO add validation constraints at the schema level
✅ DO index foreign keys and common query fields
✅ DO use timestamps for audit trails

---

## Persistence Map Interview

This interview runs during `/create-prd-stack` Sub-steps A–E. It maps every feature to its query types, then selects the right store for each query type.

### Sub-step A — Feature-to-Query Table

Walk through every major feature in `ideation-index.md` and ask: "What does this feature need to find, store, relate, and rank/search?"

Build the following table:

| Feature | Find | Store | Relate | Rank/Search |
|---------|------|-------|--------|-------------|
| (from ideation-index.md) | … | … | … | … |

Present and confirm the table with the user before proceeding to Sub-step B.

### Sub-step B — Registry-First Skill Search

Before presenting any store options, read `.agent/skills/find-skills/SKILL.md` and run `npx skills find [query type or store name]` for each query type that appeared in the table.

If the registry returns a skill, install it first. The bundled skill library is a fallback only.

### Sub-step C — Store Selection Per Query Type

Present store options only for query types that appeared in the table:

- Skip `DATABASE_VECTOR` if no Rank/Search requirement appeared.
- Skip `DATABASE_GRAPH` if no Relate requirement appeared.

Use constraint-first per-axis flow: constraint questions → filter → present → confirm.

### Sub-step D — Bootstrap Per Confirmed Store

For each confirmed store, fire bootstrap with its specific sub-key:

- e.g., `DATABASE_PRIMARY=PostgreSQL`, `DATABASE_VECTOR=Qdrant`
- One bootstrap call per sub-key.
- Each confirmation adds a database skill to the Databases column of the relevant surface row in the surface stack map.

### Sub-step E — Write Persistence Map

After all stores are confirmed, write to `docs/plans/architecture-draft.md` as a locked section titled `## Persistence Map`.

Must include:
- The feature-to-query table from Sub-step A
- A mapping of each query type to its canonical store with rationale

---

## Cross-Store Entity Consistency Protocol

### Triggering Rule

This protocol runs for every entity that spans more than one store.

### The 4 Questions

For each cross-store entity, answer the following in order:

1. **Canonical ID** — Single identifier tying representations together. Must be the primary store's UUID stored as a property in every other store — never the graph store's or vector store's internal ID.

2. **Creation sequence** — Which store is written first. Recovery mechanism for partial write failures (Saga pattern, compensating transaction, or async retry queue — name which).

3. **Deletion cascade** — Cleanup order, mechanism (application-layer sequential deletes, DB-level triggers, or background job — name which).

4. **Read strategy** — Whether a read requires data from multiple stores. Name the application-layer join pattern explicitly.

### Skill Instruction

Read all database skills listed in the Databases column of the surface stack map (`.agent/instructions/tech-stack.md`) for advice on each store's transaction semantics and consistency guarantees before completing this step.

### Output

Write the completed cross-store consistency table to `architecture-draft.md` as part of the `## Data Strategy` section.
