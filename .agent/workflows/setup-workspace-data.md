---
description: Database provisioning, migration framework initialization, connection configuration, and seed data setup for the setup-workspace workflow
parent: setup-workspace
shard: data
standalone: true
position: 4
pipeline:
  position: 8.54
  stage: setup
  predecessors: [setup-workspace-hosting]
  successors: [verify-infrastructure]
  skills: [database-schema-design, deployment-procedures]
  calls-bootstrap: false
requires_placeholders: [ORM_SKILL]
---

// turbo-all

# Setup Workspace — Data

Provision database instances, initialize the migration framework, configure connection strings, and verify database connectivity. Gate: database connectable and migration framework initialized.

**Prerequisite**: Hosting configured (from `/setup-workspace-hosting`). Surface stack map Databases and ORMs cells populated.

---

## 1. Load database and ORM skills

Read `.agent/skills/prd-templates/references/skill-loading-protocol.md`.

Load from the surface stack map (`.agent/instructions/tech-stack.md`):
- **Databases** skill (e.g., PostgreSQL, MongoDB, SurrealDB)
- **ORMs** skill (e.g., Prisma, Drizzle, SQLAlchemy)

Read each loaded skill's `SKILL.md`.

Also read `.agent/skills/database-schema-design/SKILL.md` for schema design principles.

If a migration-management skill exists, load it too (check `.agent/skills/migration-management/SKILL.md`).

---

## 2. Determine database architecture

Read `docs/plans/*-architecture-design.md` for the data strategy:

1. **How many database instances?** Monolith typically has 1; multi-service may have per-service databases or a shared database with per-service schemas
2. **Database engine per instance** (from architecture doc + surface stack map)
3. **Managed vs self-hosted** — affects provisioning steps
4. **Read replicas needed?** — typically not at setup, but note for later
5. **Data placement strategy** — read `docs/plans/data-placement-strategy.md` if it exists

| Pattern | Database Strategy |
|---------|------------------|
| **Monolith** | Single database instance |
| **Monorepo shared DB** | One instance, per-service schemas or prefixed tables |
| **Monorepo per-service DB** | One instance per service |
| **Multi-repo** | Fully independent database per repo |

---

## 3. Provision database instance(s)

For each required database instance:

### 3a. Managed database (cloud-hosted)

If using a managed service (Supabase, PlanetScale, Neon, AWS RDS, etc.):

1. Create the database instance through the platform's dashboard, CLI, or API
2. Record the connection string components:
   - Host
   - Port
   - Database name
   - Username (non-root, application-specific)
   - Password (generated, stored in platform secrets)
3. Configure network access rules (allow from hosting platform's IP range)
4. Enable SSL/TLS for connections

### 3b. Self-hosted database

If running the database locally or on a VPS:

1. Verify the database engine is installed or create a Docker Compose service
2. Create the application database
3. Create the application user with minimum required privileges
4. Record the connection string
5. Configure network access (bind address, firewall rules)

> [!IMPORTANT]
> The database user for the application should have ONLY the privileges it needs — not root/superuser access. Create a dedicated user with table-level permissions. Document the user's privileges.

---

## 4. Configure connection strings

1. **Local development**: Add the connection string to `.env.example` with a placeholder:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/myapp_dev"
   ```

2. **CI/CD**: Add the test database connection string to CI/CD secrets (from previous shard). If the CI/CD platform supports service containers (e.g., GitHub Actions services), configure a test database instance in the pipeline config.

3. **Staging**: Set the connection string in the hosting platform's environment variables (from previous shard's hosting config).

4. **Production**: Document the production connection string as a required secret — do not set it yet.

Verify that the connection string variable name matches what the ORM/framework expects (e.g., `DATABASE_URL` for Prisma, `SQLALCHEMY_DATABASE_URL` for SQLAlchemy).

---

## 5. Initialize migration framework

Using the loaded ORM skill:

1. **Initialize the ORM/migration tool**:
   - Prisma: `npx prisma init`
   - Drizzle: create `drizzle.config.ts`
   - Alembic: `alembic init`
   - SurrealDB: create migration directory structure

2. **Configure the migration tool** to read the connection string from the environment variable

3. **Create the initial schema** based on `docs/plans/data-placement-strategy.md`:
   - Create only the base tables/collections specified in the strategy
   - Include audit fields (created_at, updated_at) as specified in `ENGINEERING-STANDARDS.md`
   - Set up indexes for primary keys and documented unique constraints

4. **Generate and run the initial migration**:
   - Generate: `prisma migrate dev`, `alembic revision`, etc.
   - Apply: run the migration against the local development database
   - Verify: check migration status shows "up to date"

> [!CAUTION]
> The initial schema should reflect what's in the data placement strategy, not what you think the app needs. If the data placement strategy is incomplete, note the gap but do not invent tables.

---

## 6. Configure test database

For CI/CD and local test runs:

1. Create a separate test database (or configure the test runner to use an in-memory/ephemeral database)
2. Configure the test environment to use the test database connection string
3. Set up migration auto-run in test setup (so tests always run against the latest schema)
4. Verify the test database is isolated from development data

---

## 7. Verification gate

1. **Local connectivity**: Connect to the development database and run a simple query (e.g., `SELECT 1` or equivalent)
2. **Migration status**: Verify migrations are applied and "up to date"
3. **ORM connectivity**: Run the ORM's built-in connection test if available
4. **Staging connectivity** (if staging DB is provisioned): Verify staging database is connectable from the staging environment

Commit changes: `chore: configure database and migration framework`

**Pass criteria:**

- [ ] Database instance(s) provisioned
- [ ] Connection strings configured for local, CI/CD, and staging
- [ ] Migration framework initialized
- [ ] Initial migration created and applied
- [ ] Test database configured
- [ ] Local database connectable
- [ ] Migration status clean

> Present result to user: "✅ Database configured. [engine] at [host]. Migrations initialized. Proceeding to infrastructure verification." or "❌ Database setup failed: [error]. Fix required."
