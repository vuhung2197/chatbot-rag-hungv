# PostgreSQL Schema Files

Converted from MySQL to PostgreSQL.

## 📁 Files Overview

### Core Schema Files (Run in order)

1. **`001_enums_and_functions.sql`** - ENUM types & helper functions
   - user_role, account_status_type, oauth_provider
   - subscription_status, billing_cycle_type
   - wallet_status, transaction_type, transaction_status
   - Helper function: `update_updated_at_column()`

2. **`002_core_tables.sql`** - Knowledge base & core tables
   - feedbacks, user_words, user_highlighted_text
   - knowledge_base (with full-text search using tsvector)
   - knowledge_chunks (for RAG)
   - important_keywords, unanswered_questions
   - conversation_sessions, writing_sessions

3. **`003_users_auth_tables.sql`** - Users & authentication
   - users (main user table)
   - user_questions, google_tokens
   - user_sessions (JWT sessions)
   - user_oauth_providers
   - password_reset_tokens
   - user_preferences

4. **`004_subscription_tables.sql`** - Subscriptions & usage tracking
   - subscription_tiers (with default free/pro/team)
   - user_subscriptions
   - user_usage (daily usage tracking)
   - usage_limits
   - View: v_user_subscriptions
   - Auto-assign free tier trigger

5. **`005_wallet_tables.sql`** - Wallet & payment system
   - user_wallets (with increased precision for VND)
   - wallet_transactions
   - payment_methods (vnpay, momo, stripe, paypal)
   - wallet_audit_log
   - Views: v_user_wallet_summary, v_recent_transactions
   - Functions: get_wallet_balance(), get_transaction_history()
   - Auto-create wallet trigger

### Master Script

- **`000_init_master.sql`** - Run all scripts in order
  - Executes 001-005 in sequence
  - Includes verification queries
  - Shows summary statistics

## 🚀 Installation

### Option 1: Using Master Script (Recommended)

```bash
# As postgres superuser
psql -U postgres

# Create database
CREATE DATABASE chatbot WITH ENCODING 'UTF8';

# Exit and run master script
\q

# Run from this directory
psql -U postgres -d chatbot -f 000_init_master.sql
```

### Option 2: Manual Execution

```bash
# Run each file in order
psql -U postgres -d chatbot -f 001_enums_and_functions.sql
psql -U postgres -d chatbot -f 002_core_tables.sql
psql -U postgres -d chatbot -f 003_users_auth_tables.sql
psql -U postgres -d chatbot -f 004_subscription_tables.sql
psql -U postgres -d chatbot -f 005_wallet_tables.sql
```

## 🔑 Key Differences from MySQL

### Data Types
- `AUTO_INCREMENT` → `SERIAL` or `IDENTITY`
- `TINYINT(1)` → `BOOLEAN`
- `BLOB` → `BYTEA`
- `JSON` → `JSONB` (for better performance)
- `ENUM('a','b')` → Custom ENUM type
- `DATETIME` → `TIMESTAMP`

### Syntax
- `ON UPDATE CURRENT_TIMESTAMP` → Trigger with `update_updated_at_column()`
- `FULLTEXT(col)` → `tsvector` with GIN index
- Stored Procedures → Functions returning TABLE
- `USER()` → `CURRENT_USER`
- `ON DUPLICATE KEY UPDATE` → `ON CONFLICT DO UPDATE`

### Indexing
- Full-text search uses `tsvector` and GIN indexes
- JSONB columns can have GIN indexes
- Better index support for complex queries

### Precision
- Changed `DECIMAL(10,2)` → `DECIMAL(15,2)` for VND support
- Supports larger balance amounts

## ✅ Features

### Automatic Triggers
1. **Auto-update `updated_at`** - All tables with updated_at column
2. **Auto-assign free tier** - When new user is created
3. **Auto-create wallet** - When new user is created
4. **Audit logging** - Tracks all wallet balance changes
5. **Full-text search** - Auto-updates tsvector on knowledge_base

### Views
1. `v_user_subscriptions` - Active subscriptions with tier info
2. `v_user_wallet_summary` - Wallet balance with transaction summary
3. `v_recent_transactions` - Last 100 transactions

### Functions
1. `get_wallet_balance(user_id)` - Get user's wallet info
2. `get_transaction_history(user_id, limit, offset)` - Transaction history

## 🔍 Verification Queries

After installation, run these to verify:

```sql
-- Check all tables are created
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Check ENUM types
SELECT typname FROM pg_type WHERE typtype = 'e';

-- Check triggers
SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgisinternal = false;

-- Check functions
SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace;

-- Test wallet creation for new user
INSERT INTO users (name, email, password_hash, role)
VALUES ('Test User', 'test@example.com', 'hash', 'user');

-- Verify wallet was auto-created
SELECT u.email, w.balance, w.currency 
FROM users u 
LEFT JOIN user_wallets w ON u.id = w.user_id 
WHERE u.email = 'test@example.com';

-- Verify free tier was auto-assigned
SELECT u.email, st.name as tier
FROM users u
JOIN user_subscriptions us ON u.id = us.user_id
JOIN subscription_tiers st ON us.tier_id = st.id
WHERE u.email = 'test@example.com';
```

## 📝 Notes

- All scripts are idempotent (can be run multiple times)
- Foreign keys use CASCADE delete where appropriate
- Indexes optimized for common queries
- JSONB used instead of JSON for better performance
- Triggers handle auto-updates (no ON UPDATE needed)

## 🐛 Troubleshooting

### Error: "type already exists"
```sql
-- Drop and recreate if needed
DROP TYPE IF EXISTS user_role CASCADE;
-- Then re-run 001_enums_and_functions.sql
```

### Error: "relation already exists"
```sql
-- Drop specific table
DROP TABLE IF EXISTS table_name CASCADE;
-- Then re-run appropriate script
```

### Performance Issues
```sql
-- Analyze tables after import
ANALYZE;

-- Check index usage
SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';
```

## 🔗 Related Files

See parent directory `.migration/` for:
- `MYSQL_TO_POSTGRESQL_PLAN.md` - Complete migration plan
- Migration scripts (data export/import)
- Rollback procedures
