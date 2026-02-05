-- ============================================
-- PostgreSQL Schema: 001 - ENUM Types
-- Converted from MySQL ENUM
-- ============================================

-- User roles
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Account status
CREATE TYPE account_status_type AS ENUM ('active', 'suspended', 'deleted');

-- OAuth providers
CREATE TYPE oauth_provider AS ENUM ('google', 'github', 'microsoft');

-- Subscription status
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'trial');

-- Billing cycle
CREATE TYPE billing_cycle_type AS ENUM ('monthly', 'yearly');

-- ============================================
-- Helper Functions
-- ============================================

-- Function to update updated_at timestamp
-- PostgreSQL doesn't have ON UPDATE CURRENT_TIMESTAMP like MySQL
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Notes:
-- - PostgreSQL ENUM types are more strict than MySQL
-- - Cannot just change enum values, need to use ALTER TYPE
-- - ENUM types are reusable across tables
-- - Better type safety than CHECK constraints
-- ============================================
