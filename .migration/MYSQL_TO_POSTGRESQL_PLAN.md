# MIGRATION PLAN: MySQL → PostgreSQL

**Ngày tạo:** 2026-01-23  
**Project:** English Chatbot  
**Mức độ:** 🔴 CRITICAL - Full Database Migration  
**Thời gian ước tính:** 2-3 tuần  

---

## 📊 EXECUTIVE SUMMARY

### Lý do Migration
- ✅ **Better JSON support** - PostgreSQL native JSON/JSONB
- ✅ **Advanced features** - Array types, full-text search, pgvector for embeddings
- ✅ **Scalability** - Better performance với large datasets
- ✅ **ACID compliance** - Stronger data integrity
- ✅ **Open source ecosystem** - Active community, better extensions

### Scope
- **Database:** MySQL 8.0 → PostgreSQL 15+
- **Tables:** ~20 tables (users, wallets, subscriptions, knowledge_base, etc.)
- **Features affected:**
  - Authentication & Sessions
  - Wallet & Payment system
  - Knowledge Base & RAG
  - Subscriptions & Usage tracking
  - Vector embeddings

---

## 🔍 CURRENT STATE ANALYSIS

### MySQL Usage in Project

**1. Connection Layer:**
```javascript
// backend/db.js
import mysql from 'mysql2/promise';
const pool = mysql.createPool({...});
```

**2. Query Patterns:**
- ✅ `pool.execute()` - Parameterized queries (166+ instances)
- ✅ Transactions with connection.beginTransaction()
- ✅ JSON columns (embedding, metadata, features)
- ⚠️ ENUM types (nhiều columns)
- ⚠️ FULLTEXT indexes
- ⚠️ MySQL-specific syntax

**3. Key Tables:**
```
users (authentication)
user_sessions (JWT sessions)
user_wallets (payment)
wallet_transactions (payment history)
subscription_tiers (plans)
knowledge_base (AI/RAG)
knowledge_chunks (vector embeddings)
```

---

## 📋 MIGRATION STRATEGY

### Phase-Based Approach

#### **Phase 1: Preparation** (Week 1)
1. Setup PostgreSQL development environment
2. Schema conversion & validation
3. Create migration scripts
4. Setup testing environment

#### **Phase 2: Code Adaptation** (Week 2)
1. Replace mysql2 với pg
2. Convert SQL syntax
3. Update queries
4. Test modifications

#### **Phase 3: Data Migration** (Week 2-3)
1. Export data từ MySQL
2. Transform & load vào PostgreSQL
3. Verify data integrity
4. Performance testing

#### **Phase 4: Deployment** (Week 3)
1. Blue-green deployment setup
2. Production migration
3. Monitoring & rollback plan
4. Post-migration optimization

---

## 🗄️ SCHEMA CONVERSION

### Major Differences

| MySQL | PostgreSQL | Action Required |
|-------|------------|-----------------|
| `AUTO_INCREMENT` | `SERIAL` / `IDENTITY` | ✅ Convert primary keys |
| `ENUM('a','b')` | `CHECK` / `ENUM type` | ✅ Create custom types |
| `TINYINT(1)` | `BOOLEAN` | ✅ Convert boolean fields |
| `VARCHAR(255)` | `VARCHAR(255)` | ✅ Keep same |
| `TEXT` | `TEXT` | ✅ Keep same |
| `JSON` | `JSON` / `JSONB` | ✅ Upgrade to JSONB |
| `TIMESTAMP` | `TIMESTAMP` | ⚠️ Timezone handling |
| `FULLTEXT` | `tsvector` / `GIN` | ✅ Rebuild FTS |
| `ENGINE=InnoDB` | N/A | ❌ Remove |
| `CHARSET utf8mb4` | N/A | ❌ Remove (default UTF-8) |

---

## 🔧 CODE CHANGES REQUIRED

### 1. Database Connection

**BEFORE (MySQL):**
```javascript
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: 3306,
  charset: 'utf8mb4',
});
```

**AFTER (PostgreSQL):**
```javascript
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: 5432,
  // PostgreSQL defaults to UTF-8
});
```

### 2. Query API Differences

**MySQL2:**
```javascript
const [rows, fields] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
const user = rows[0];
```

**PostgreSQL (pg):**
```javascript
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
const user = result.rows[0];
```

**Key Changes:**
- ❌ `pool.execute()` → ✅ `pool.query()`
- ❌ `?` placeholders → ✅ `$1, $2, $3` placeholders
- ❌ `[rows, fields]` → ✅ `result.rows`

### 3. Transaction Pattern

**MySQL2:**
```javascript
const connection = await pool.getConnection();
await connection.beginTransaction();
try {
  await connection.execute('...');
  await connection.commit();
} catch (err) {
  await connection.rollback();
} finally {
  connection.release();
}
```

**PostgreSQL:**
```javascript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('...');
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
```

---

## 📊 DETAILED SCHEMA CONVERSION

### Example: users table

**MySQL:**
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  account_status ENUM('active','suspended','deleted') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**PostgreSQL:**
```sql
-- Create ENUM types first
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE account_status AS ENUM ('active', 'suspended', 'deleted');

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role DEFAULT 'user',
  email_verified BOOLEAN NOT NULL DEFAULT false,
  account_status account_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for updated_at (PostgreSQL doesn't have ON UPDATE)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

## 🚀 IMPLEMENTATION PLAN

### Tools & Libraries

```json
{
  "dependencies": {
    "pg": "^8.11.3",              // PostgreSQL client
    "pg-format": "^1.0.4",        // SQL formatting
    "@types/pg": "^8.10.9"        // TypeScript types
  },
  "devDependencies": {
    "pgtyped": "^2.3.0",          // Type-safe queries (optional)
    "node-pg-migrate": "^6.2.2"   // Migration tool
  }
}
```

### Migration Scripts Structure

```
db/
├── postgresql/
│   ├── 001_init_schema.sql
│   ├── 002_create_enums.sql
│   ├── 003_create_tables.sql
│   ├── 004_create_indexes.sql
│   ├── 005_create_triggers.sql
│   ├── 006_create_views.sql
│   └── 007_seed_data.sql
├── migration/
│   ├── export_mysql_data.js
│   ├── transform_data.js
│   ├── import_postgresql_data.js
│   └── verify_migration.js
└── rollback/
    └── mysql_backup_schema.sql
```

---

## 🔄 DATA MIGRATION PROCESS

### Step 1: Export from MySQL

```bash
# Full dump
mysqldump -u root -p \
  --skip-triggers \
  --complete-insert \
  --no-create-info \
  chatbot > mysql_data_export.sql

# Per-table export (for large tables)
mysqldump -u root -p chatbot users > users_data.sql
mysqldump -u root -p chatbot knowledge_chunks > knowledge_chunks_data.sql
```

### Step 2: Transform Data

```javascript
// Example: Convert ENUM to PostgreSQL format
// MySQL: ENUM stored as index (0,1,2)
// PostgreSQL: ENUM stored as string ('user','admin')

const transformUserRole = (mysqlRole) => {
  const roleMap = { 0: 'user', 1: 'admin' };
  return roleMap[mysqlRole] || 'user';
};
```

### Step 3: Load into PostgreSQL

```bash
# Using psql
psql -U postgres -d chatbot -f postgresql_schema.sql
psql -U postgres -d chatbot -f transformed_data.sql

# Or using Node.js pg-copy-streams for large tables
```

---

## ✅ TESTING CHECKLIST

### Unit Tests
- [ ] Connection pooling works
- [ ] Queries return expected results
- [ ] Transactions rollback correctly
- [ ] JSON/JSONB operations work

### Integration Tests
- [ ] Authentication flow
- [ ] Wallet transactions
- [ ] Knowledge base search
- [ ] Subscription management

### Performance Tests
- [ ] Query performance benchmarks
- [ ] Connection pool under load
- [ ] Large result set handling
- [ ] Vector similarity search (embeddings)

### Data Integrity Tests
- [ ] Row counts match
- [ ] Primary keys sequence
- [ ] Foreign key constraints
- [ ] Unique constraints
- [ ] Check constraints

---

## 🎯 SUCCESS CRITERIA

✅ **Zero data loss**  
✅ **<5% performance degradation** (or improvement)  
✅ **All tests passing**  
✅ **Production uptime >99.9%**  
✅ **Rollback plan tested**

---

## ⚠️ RISKS & MITIGATION

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data loss during migration | 🔴 HIGH | LOW | Full backup + dry run + verify |
| Downtime > 4 hours | 🟡 MEDIUM | MEDIUM | Blue-green deployment |
| Query performance issues | 🟡 MEDIUM | MEDIUM | Benchmark before/after |
| Code bugs in conversion | 🟡 MEDIUM | HIGH | Comprehensive testing |
| Rollback needed | 🟡 MEDIUM | LOW | Keep MySQL running parallel |

---

## 📝 ROLLBACK PLAN

### If migration fails:

1. **Stop application** (maintenance mode)
2. **Switch connection** back to MySQL
3. **Restart services** with MySQL config
4. **Analyze failure** cause
5. **Fix issues** before retry

### Parallel Running (Week 1-2 after migration)

- Keep MySQL read-only backup
- Monitor PostgreSQL performance
- Compare query results
- Ready to rollback if needed

---

## 💰 COST ANALYSIS

### Development Time
- Schema conversion: 16 hours
- Code refactoring: 40 hours
- Testing: 24 hours
- Migration execution: 8 hours
- **Total:** ~88 hours (2 weeks)

### Infrastructure
- PostgreSQL hosting: Similar to MySQL
- Migration tools: Free (all open source)
- Testing environment: Temporary (1 month)

---

## 🎓 LEARNING RESOURCES

### PostgreSQL Essentials
- [Official PostgreSQL Docs](https://www.postgresql.org/docs/)
- [PostgreSQL vs MySQL](https://wiki.postgresql.org/wiki/Why_PostgreSQL_Instead_of_MySQL)
- [JSON/JSONB in PostgreSQL](https://www.postgresql.org/docs/current/datatype-json.html)

### Migration Guides
- [MySQL to PostgreSQL Migration Guide](https://wiki.postgresql.org/wiki/Converting_from_other_Databases_to_PostgreSQL#MySQL)
- [pg_chameleon](https://github.com/the4thdoctor/pg_chameleon) - MySQL to PostgreSQL replication

---

## 📅 TIMELINE

```
Week 1: Preparation & Setup
├─ Day 1-2: PostgreSQL setup, schema conversion
├─ Day 3-4: Migration scripts development
└─ Day 5: Testing environment validation

Week 2: Code Adaptation
├─ Day 1-2: Update db.js, query functions
├─ Day 3-4: Convert all controllers
└─ Day 5: Integration testing

Week 3: Migration & Deployment
├─ Day 1-2: Data migration dry run
├─ Day 3: Production migration
├─ Day 4-5: Monitoring & optimization
└─ Week 3+: Parallel running, ready to rollback
```

---

## 🚀 NEXT STEPS

1. **Get Approval** - Stakeholder sign-off
2. **Setup Environment** - PostgreSQL dev/staging
3. **Create Schemas** - Convert all SQL files
4. **Refactor Code** - Update connection & queries
5. **Test Thoroughly** - All test suites passing
6. **Migrate Data** - Execute migration plan
7. **Monitor** - Performance & errors
8. **Optimize** - Indexes, queries, config

---

**Status:** 📋 READY FOR REVIEW  
**Next Action:** Begin Phase 1 - PostgreSQL Setup  
**Owner:** Development Team  
**Deadline:** 3 weeks from approval

---

**End of Migration Plan**
