# Relational Database Schema Patterns

Paradigm-specific patterns for the `database-schema-design` skill. Read `SKILL.md` first for universal methodology.

Covers: **PostgreSQL**, **MySQL**, **SQLite**

---

## Normalization Examples

### First Normal Form (1NF) — Eliminate Repeating Groups

```sql
-- NOT 1NF: repeating group in single column
CREATE TABLE orders_bad (
  id UUID PRIMARY KEY,
  customer_name VARCHAR(255),
  product_ids VARCHAR(255)  -- "1,2,3" - repeating group
);

-- 1NF: separate table for repeating data
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  customer_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
```

### Second Normal Form (2NF) — Remove Partial Dependencies

```sql
-- 2NF: separate tables for partial deps
CREATE TABLE enrollments (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL,
  course_id UUID NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (course_id) REFERENCES courses(id),
  UNIQUE(student_id, course_id)
);

CREATE TABLE courses (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  professor_id UUID NOT NULL,
  FOREIGN KEY (professor_id) REFERENCES professors(id)
);
```

### Third Normal Form (3NF) — Remove Transitive Dependencies

```sql
-- 3NF: separate lookup tables
CREATE TABLE states (
  id UUID PRIMARY KEY,
  code VARCHAR(2) UNIQUE,
  name VARCHAR(100),
  tax_rate DECIMAL(5,3)
);

CREATE TABLE orders (
  id UUID PRIMARY KEY,
  customer_city VARCHAR(100),
  state_id UUID NOT NULL,
  FOREIGN KEY (state_id) REFERENCES states(id)
);
```

---

## Relationship Patterns

### One-to-Many

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  order_date TIMESTAMP DEFAULT NOW(),
  total DECIMAL(10,2),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

### One-to-One

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  bio TEXT,
  avatar_url VARCHAR(500),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Many-to-Many (Junction Table)

```sql
CREATE TABLE course_enrollments (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL,
  course_id UUID NOT NULL,
  enrolled_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE(student_id, course_id)
);
```

---

## Constraint Strategy

```sql
-- NOT NULL, UNIQUE, CHECK, DEFAULT
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) NOT NULL UNIQUE,
  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'archived', 'draft'))
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100) NOT NULL,
  operation VARCHAR(10) NOT NULL,
  user_id UUID,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Data Type Selection

### PostgreSQL

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255),
  name TEXT,
  age SMALLINT,
  balance DECIMAL(15,2),       -- Financial data (precise)
  is_active BOOLEAN DEFAULT true,
  birth_date DATE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[]  -- PostgreSQL arrays
);
```

### MySQL

```sql
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,    -- UUID as CHAR
  email VARCHAR(255),
  name VARCHAR(255),
  age TINYINT UNSIGNED,
  balance DECIMAL(15,2),
  is_active BOOLEAN DEFAULT true,
  birth_date DATE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSON,
  KEY idx_email (email)
);
```

---

## Schema Evolution

```sql
-- Add column with default (backward compatible)
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- Add constraint on new column
ALTER TABLE orders ADD CONSTRAINT check_notes CHECK (LENGTH(notes) <= 500);

-- Deprecate column safely
ALTER TABLE users RENAME COLUMN old_field TO old_field_deprecated;
```

---

## Performance: Partitioning

```sql
-- PostgreSQL: Partition by date range for time-series data
CREATE TABLE events (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type VARCHAR(100),
  created_at TIMESTAMP NOT NULL
) PARTITION BY RANGE (DATE_TRUNC('month', created_at));

CREATE TABLE events_2024_01 PARTITION OF events
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

---

## Resources

- [PostgreSQL Data Types](https://www.postgresql.org/docs/current/datatype.html)
- [MySQL Data Types](https://dev.mysql.com/doc/refman/8.0/en/data-types.html)
- [Database Normalization Guide](https://en.wikipedia.org/wiki/Database_normalization)
