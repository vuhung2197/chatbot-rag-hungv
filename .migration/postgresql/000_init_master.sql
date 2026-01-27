-- ============================================
-- PostgreSQL Complete Schema Initialization
-- Master script to run all migrations in order
-- ============================================

-- Set client encoding
SET client_encoding = 'UTF8';

-- Create database (run this separately as postgres superuser)
-- CREATE DATABASE chatbot WITH ENCODING 'UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8';

-- Connect to database
\c chatbot;

-- ============================================
-- EXECUTION ORDER
-- ============================================

\echo 'Starting PostgreSQL schema migration...'
\echo ''

-- 1. ENUM Types and Helper Functions
\echo '1/5: Creating ENUM types and helper functions...'
\i 001_enums_and_functions.sql
\echo '✓ ENUM types created'
\echo ''

-- 2. Core Tables (Knowledge Base, Conversations, etc.)
\echo '2/5: Creating core tables...'
\i 002_core_tables.sql
\echo '✓ Core tables created'
\echo ''

-- 3. Users and Authentication Tables
\echo '3/5: Creating users and authentication tables...'
\i 003_users_auth_tables.sql
\echo '✓ Users and auth tables created'
\echo ''

-- 4. Subscription and Usage Tables
\echo '4/5: Creating subscription and usage tables...'
\i 004_subscription_tables.sql
\echo '✓ Subscription tables created'
\echo ''

-- 5. Wallet and Payment Tables
\echo '5/5: Creating wallet and payment tables...'
\i 005_wallet_tables.sql
\echo '✓ Wallet tables created'
\echo ''

-- ============================================
-- VERIFICATION
-- ============================================

\echo 'Verifying installation...'
\echo ''

-- Check table counts
SELECT 
    schemaname,
    COUNT(*) as table_count
FROM pg_tables 
WHERE schemaname = 'public'
GROUP BY schemaname;

-- List all tables
\dt

-- List all ENUM types
\dT

-- List all functions
\df

-- List all views
\dv

-- ============================================
-- SUMMARY
-- ============================================

\echo ''
\echo '============================================'
\echo 'PostgreSQL Schema Migration Complete!'
\echo '============================================'
\echo ''
\echo 'Next steps:'
\echo '1. Verify all tables are created'
\echo '2. Run data migration scripts'
\echo '3. Update application connection config'
\echo '4. Run integration tests'
\echo ''

-- ============================================
-- QUICK STATS
-- ============================================

-- Sample queries to verify data
SELECT 'Enum Types:' as type, COUNT(*)::text as count FROM pg_type WHERE typtype = 'e'
UNION ALL
SELECT 'Tables:', COUNT(*)::text FROM pg_tables WHERE schemaname = 'public'
UNION ALL
SELECT 'Functions:', COUNT(*)::text FROM pg_proc WHERE pronamespace = 'public'::regnamespace
UNION ALL
SELECT 'Views:', COUNT(*)::text FROM pg_views WHERE schemaname = 'public'
UNION ALL
SELECT 'Triggers:', COUNT(*)::text FROM pg_trigger WHERE tgisinternal = false;
