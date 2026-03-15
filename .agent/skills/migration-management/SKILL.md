---
name: database-migration-management
description: Manage database migrations and schema versioning. Use when planning migrations, version control, rollback strategies, or data transformations for any database paradigm.
---

# Database Migration Management

## Overview

Implement robust database migration systems with version control, rollback capabilities, and data transformation strategies. This skill covers universal migration methodology. For paradigm-specific tooling, see references.

## When to Use

- Schema versioning and evolution
- Data transformations and cleanup
- Adding/removing tables, columns, collections, or fields
- Index creation and optimization
- Migration testing and validation
- Rollback planning and execution
- Multi-environment deployments

## Paradigm-Specific References

After reading the methodology below, read the reference matching your surface's Databases column in the surface stack map (`.agent/instructions/tech-stack.md`):

| Paradigm | Reference | Example Stores |
|----------|-----------|----------------|
| Relational | `references/relational.md` | PostgreSQL, MySQL, SQLite |
| Document | `references/document.md` | MongoDB, Firestore, CouchDB |
| Graph | `references/graph.md` | SurrealDB, Neo4j, ArangoDB |

---

## Universal Migration Principles

### 1. Bidirectional Migrations

Every migration must have both directions:
- **UP** — applies the change
- **DOWN** — reverses the change

If a migration cannot be reversed (e.g., data deletion), document this explicitly and require a backup before execution.

### 2. Migration Ordering

Migrations are **sequentially ordered** by timestamp or version number:
- Timestamp format: `YYYYMMDD_NNN_description` (e.g., `20240115_001_add_phone_to_users`)
- Never reorder or renumber existing migrations
- Never modify an already-executed migration — create a new one

### 3. Idempotency

Migrations should be idempotent where possible:
- Use "IF NOT EXISTS" / "IF EXISTS" guards
- Check for the presence of the change before applying it
- Run pre-flight checks before destructive operations

### 4. Atomic Migrations

Each migration should be a single logical change:
- One migration = one purpose (add column, create table, transform data)
- Don't combine unrelated changes
- Use transactions for multi-statement migrations where supported

---

## Common Migration Patterns

### Safe Schema Changes

| Operation | Safe? | Strategy |
|-----------|-------|----------|
| Add nullable column | ✅ Always safe | Add with default or NULL |
| Add NOT NULL column | ⚠️ Requires backfill | Add nullable → backfill → add constraint |
| Rename column | ⚠️ Requires coordination | Add new → copy data → update app → drop old |
| Drop column | ⚠️ Requires coordination | Stop reading → deploy → drop column |
| Add index | ⚠️ Can lock table | Use concurrent/online index creation |
| Drop table | 🔴 Destructive | Backup first, confirm no references |

### Multi-Phase Migrations

For non-trivial schema changes (rename, type change, restructure):

1. **Phase 1: Expand** — Add new structure alongside old
2. **Phase 2: Migrate** — Copy/transform data to new structure
3. **Phase 3: Contract** — Remove old structure after verification

This pattern prevents downtime and allows rollback at any phase.

### Data Transformation Migrations

When transforming data (normalization, cleanup, format changes):

1. **Verify source data** — Count records, check constraints
2. **Apply transformation** — Batch for large datasets
3. **Validate results** — Compare counts, spot-check values
4. **Document irreversibility** — If rollback requires backup restore, say so

---

## Rollback Strategies

### Per-Migration Rollback

Every migration has a DOWN direction. Execute in reverse order:
- Migration 5 DOWN
- Migration 4 DOWN
- Migration 3 DOWN
- ... until target version reached

### Point-in-Time Recovery

For data-destructive migrations:
- Require backup before execution
- Document the backup location
- Test restore procedure before migration

### Blue-Green Schema Changes

For zero-downtime migrations:
- Run new schema alongside old
- Application supports both schemas during transition
- Cut over when new schema is verified
- Drop old schema after observation period

---

## Testing Migrations

### Local Testing

1. **Fresh database** — Run all migrations from scratch (empty → current)
2. **Incremental** — Run only new migrations on a copy of production
3. **Rollback** — Test DOWN migration after UP
4. **Data integrity** — Verify constraints hold after migration

### Staging Validation

1. Restore production backup to staging
2. Run migrations on staging
3. Verify application works against migrated schema
4. Run automated tests against staging
5. Record migration timing for capacity planning

### Pre-Production Checklist

- [ ] Tested on local database
- [ ] Tested on staging with production data copy
- [ ] Rollback procedure tested
- [ ] Backup verified before migration
- [ ] Application code compatible with both old and new schema
- [ ] Migration timing measured (acceptable for maintenance window?)
- [ ] Long-running query impact assessed

---

## Production Deployment

### Safe Migration Checklist

- [ ] Test migration on production-like database
- [ ] Verify backup exists before migration
- [ ] Schedule during low-traffic window
- [ ] Monitor locks and long-running queries
- [ ] Have rollback plan ready and tested
- [ ] Document all changes
- [ ] Run in transaction when possible
- [ ] Verify data integrity after migration
- [ ] Coordinate application code deployment with migration
- [ ] Notify team of migration window

### Post-Migration Verification

1. **Schema check** — Verify new structures exist
2. **Data check** — Verify data integrity constraints
3. **Application check** — Verify application reads/writes correctly
4. **Performance check** — Verify query performance hasn't degraded
5. **Monitoring** — Watch error rates for 24 hours post-migration

---

## Migration Tracking

Maintain a migration history table (or equivalent) that records:
- Migration version/ID
- Migration name/description
- Execution timestamp
- Duration
- Checksum (to detect tampering)
- Status (applied, rolled back, failed)

---

## Resources

- [Flyway](https://flywaydb.org/) — Java/JVM migration tool
- [Liquibase](https://www.liquibase.org/) — Database changelog management
- [Alembic](https://alembic.sqlalchemy.org/) — Python/SQLAlchemy migrations
- [Knex.js](https://knexjs.org/) — Node.js query builder with migrations
- [golang-migrate](https://github.com/golang-migrate/migrate) — Go migration tool
