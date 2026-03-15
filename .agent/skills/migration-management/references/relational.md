# Relational Database Migration Patterns

Paradigm-specific patterns for the `migration-management` skill. Read `SKILL.md` first for universal methodology.

Covers: **PostgreSQL**, **MySQL**

---

## Migration Tracking Tables

### PostgreSQL

```sql
CREATE TABLE schema_migrations (
  version BIGINT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_ms INTEGER,
  checksum VARCHAR(64)
);

CREATE TABLE migration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL,
  error_message TEXT,
  rolled_back_at TIMESTAMP,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION record_migration(
  p_version BIGINT, p_name VARCHAR, p_duration_ms INTEGER
) RETURNS void AS $$
BEGIN
  INSERT INTO schema_migrations (version, name, duration_ms)
  VALUES (p_version, p_name, p_duration_ms)
  ON CONFLICT (version) DO UPDATE SET executed_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;
```

### MySQL

```sql
CREATE TABLE schema_migrations (
  version BIGINT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_ms INT,
  checksum VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE migration_status (
  id INT AUTO_INCREMENT PRIMARY KEY,
  version BIGINT NOT NULL,
  status ENUM('pending', 'completed', 'failed', 'rolled_back'),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## Adding Columns

### PostgreSQL

```sql
-- Non-blocking column addition
ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT '';
ALTER TABLE users ADD CONSTRAINT phone_format
  CHECK (phone = '' OR phone ~ '^\+?[0-9\-\(\)]{10,}$');
CREATE INDEX CONCURRENTLY idx_users_phone ON users(phone);

-- Rollback:
-- DROP INDEX CONCURRENTLY idx_users_phone;
-- ALTER TABLE users DROP COLUMN phone;
```

### MySQL

```sql
ALTER TABLE users
ADD COLUMN phone VARCHAR(20) DEFAULT '',
ADD INDEX idx_phone (phone);

-- Rollback:
-- ALTER TABLE users DROP COLUMN phone;
```

---

## Renaming Columns

```sql
-- PostgreSQL
ALTER TABLE users RENAME COLUMN user_name TO full_name;
REINDEX TABLE users;

-- Rollback:
-- ALTER TABLE users RENAME COLUMN full_name TO user_name;
```

---

## Creating Indexes Non-Blocking

### PostgreSQL (CONCURRENTLY)

```sql
CREATE INDEX CONCURRENTLY idx_orders_user_created
ON orders(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_products_category_active
ON products(category_id) WHERE active = true;

-- Verify
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes WHERE indexname LIKE 'idx_%';
```

### MySQL (INPLACE)

```sql
ALTER TABLE orders
ADD INDEX idx_user_created (user_id, created_at),
ALGORITHM=INPLACE, LOCK=NONE;
```

---

## Data Transformations

### PostgreSQL

```sql
-- Normalize emails
UPDATE users SET email = LOWER(TRIM(email))
WHERE email != LOWER(TRIM(email));

-- Deduplicate (keep latest)
DELETE FROM users WHERE id NOT IN (
  SELECT DISTINCT ON (LOWER(email)) id
  FROM users ORDER BY LOWER(email), created_at DESC
);
```

### MySQL

```sql
UPDATE products p
JOIN category_mapping cm ON p.old_category = cm.old_name
SET p.category_id = cm.new_category_id
WHERE p.old_category IS NOT NULL;
```

---

## Testing in Transaction

```sql
BEGIN;
ALTER TABLE users ADD COLUMN test_column VARCHAR(255);
SELECT COUNT(*) FROM users;
-- ROLLBACK if issues, COMMIT if good
ROLLBACK;
```

---

## Bidirectional Migration Example

```sql
-- ===== UP =====
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted');
ALTER TABLE users ADD COLUMN status user_status DEFAULT 'active';

-- ===== DOWN =====
-- ALTER TABLE users DROP COLUMN status;
-- DROP TYPE user_status;
```

---

## Production Safety

```sql
-- PostgreSQL: Prevent hanging migrations
SET statement_timeout = '30min';
SET lock_timeout = '5min';
```

---

## Combined Migration Example

```sql
BEGIN;
ALTER TABLE users ADD COLUMN full_name VARCHAR(255);
UPDATE users SET full_name = first_name || ' ' || last_name;
CREATE INDEX idx_users_full_name ON users(full_name);
ALTER TABLE users ADD CONSTRAINT email_unique UNIQUE(email);
COMMIT;
```

---

## Tools

- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [MySQL ALTER TABLE](https://dev.mysql.com/doc/refman/8.0/en/alter-table.html)
- [Flyway](https://flywaydb.org/) — Java
- [Alembic](https://alembic.sqlalchemy.org/) — Python
- [Knex.js](https://knexjs.org/) — Node.js
