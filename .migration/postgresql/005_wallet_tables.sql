-- ============================================
-- PostgreSQL Schema: 005 - Wallet & Payment System
-- Converted from MySQL phase3_wallet_schema.sql
-- ============================================

-- ============================================
-- Additional ENUM Types for Wallet
-- ============================================

CREATE TYPE wallet_status AS ENUM ('active', 'frozen', 'closed');
CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'purchase', 'refund', 'subscription');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
CREATE TYPE payment_source_type AS ENUM ('wallet', 'card', 'external');

-- ============================================
-- 1. USER WALLETS
-- ============================================

DROP TABLE IF EXISTS user_wallets CASCADE;
CREATE TABLE user_wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,  -- Increased from 10,2 to 15,2 for VND
    currency VARCHAR(3) DEFAULT 'USD',
    status wallet_status DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX idx_user_wallets_status ON user_wallets(status);

-- Trigger for updated_at
CREATE TRIGGER update_user_wallets_updated_at
    BEFORE UPDATE ON user_wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. WALLET TRANSACTIONS
-- ============================================

DROP TABLE IF EXISTS wallet_transactions CASCADE;
CREATE TABLE wallet_transactions (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    type transaction_type NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,  -- Increased precision
    balance_before DECIMAL(15, 2) NOT NULL,
    balance_after DECIMAL(15, 2) NOT NULL,
    description TEXT,
    reference_type VARCHAR(50),  -- 'subscription', 'feature', 'topup'
    reference_id INTEGER,
    payment_method VARCHAR(50),  -- 'stripe', 'paypal', 'momo', 'vnpay'
    payment_gateway_id VARCHAR(255),  -- ID from payment gateway
    status transaction_status DEFAULT 'pending',
    metadata JSONB,  -- Changed from JSON to JSONB
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transaction_wallet FOREIGN KEY (wallet_id) 
        REFERENCES user_wallets(id) ON DELETE CASCADE,
    CONSTRAINT fk_transaction_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at);
CREATE INDEX idx_wallet_transactions_reference ON wallet_transactions(reference_type, reference_id);

-- GIN index for JSONB metadata
CREATE INDEX idx_wallet_transactions_metadata ON wallet_transactions USING GIN(metadata);

-- ============================================
-- 3. PAYMENT METHODS
-- ============================================

DROP TABLE IF EXISTS payment_methods CASCADE;
CREATE TABLE payment_methods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,  -- 'stripe', 'paypal', 'momo', 'vnpay'
    is_active BOOLEAN DEFAULT TRUE,
    config JSONB,  -- API keys, webhooks, etc. (JSONB for encryption later)
    supported_currencies JSONB,  -- ["USD", "VND"]
    min_amount DECIMAL(15, 2) DEFAULT 1.00,
    max_amount DECIMAL(15, 2) DEFAULT 10000.00,
    fee_percentage DECIMAL(5, 2) DEFAULT 0.00,
    fee_fixed DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for updated_at
CREATE TRIGGER update_payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON COLUMN payment_methods.config IS 'API keys, webhooks, etc.';
COMMENT ON COLUMN payment_methods.supported_currencies IS '["USD", "VND"]';

-- ============================================
-- Insert Default Payment Methods
-- ============================================

INSERT INTO payment_methods (name, display_name, provider, is_active, supported_currencies, min_amount, max_amount, fee_percentage, fee_fixed)
VALUES
  ('vnpay', 'VNPay', 'vnpay', TRUE, '["VND"]'::jsonb, 10000.00, 50000000.00, 1.50, 0.00),
  ('momo', 'MoMo', 'momo', TRUE, '["VND"]'::jsonb, 10000.00, 50000000.00, 1.00, 0.00),
  ('stripe', 'Stripe', 'stripe', TRUE, '["USD", "VND"]'::jsonb, 1.00, 10000.00, 2.90, 0.30),
  ('paypal', 'PayPal', 'paypal', FALSE, '["USD"]'::jsonb, 1.00, 10000.00, 3.40, 0.30)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  is_active = EXCLUDED.is_active,
  supported_currencies = EXCLUDED.supported_currencies,
  min_amount = EXCLUDED.min_amount,
  max_amount = EXCLUDED.max_amount;

-- ============================================
-- 4. UPDATE USER_SUBSCRIPTIONS TABLE
-- ============================================

-- Add wallet payment support columns
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS payment_source payment_source_type DEFAULT 'wallet',
ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_payment_transaction_id INTEGER NULL;

-- Add foreign key
ALTER TABLE user_subscriptions
DROP CONSTRAINT IF EXISTS fk_last_payment_transaction;

ALTER TABLE user_subscriptions
ADD CONSTRAINT fk_last_payment_transaction 
    FOREIGN KEY (last_payment_transaction_id) 
    REFERENCES wallet_transactions(id);

-- ============================================
-- 5. WALLET AUDIT LOG
-- ============================================

DROP TABLE IF EXISTS wallet_audit_log CASCADE;
CREATE TABLE wallet_audit_log (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_balance DECIMAL(15, 2),
    new_balance DECIMAL(15, 2),
    changed_by VARCHAR(100),
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_wallet_audit_wallet_id ON wallet_audit_log(wallet_id);
CREATE INDEX idx_wallet_audit_user_id ON wallet_audit_log(user_id);
CREATE INDEX idx_wallet_audit_created_at ON wallet_audit_log(created_at);

-- ============================================
-- 6. TRIGGERS FOR AUDIT
-- ============================================

-- Trigger to log wallet balance changes
CREATE OR REPLACE FUNCTION log_wallet_balance_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.balance IS DISTINCT FROM NEW.balance THEN
        INSERT INTO wallet_audit_log (wallet_id, user_id, action, old_balance, new_balance, changed_by)
        VALUES (NEW.id, NEW.user_id, 'balance_update', OLD.balance, NEW.balance, CURRENT_USER);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wallet_balance_update
    AFTER UPDATE ON user_wallets
    FOR EACH ROW
    EXECUTE FUNCTION log_wallet_balance_change();

-- ============================================
-- 7. HELPER VIEWS
-- ============================================

-- View: User wallet with transaction summary
DROP VIEW IF EXISTS v_user_wallet_summary CASCADE;
CREATE OR REPLACE VIEW v_user_wallet_summary AS
SELECT 
    w.id as wallet_id,
    w.user_id,
    u.name as user_name,
    u.email as user_email,
    w.balance,
    w.currency,
    w.status,
    COUNT(DISTINCT wt.id) as total_transactions,
    SUM(CASE WHEN wt.type = 'deposit' AND wt.status = 'completed' THEN wt.amount ELSE 0 END) as total_deposits,
    SUM(CASE WHEN wt.type IN ('purchase', 'subscription') AND wt.status = 'completed' THEN ABS(wt.amount) ELSE 0 END) as total_spent,
    MAX(wt.created_at) as last_transaction_at,
    w.created_at as wallet_created_at
FROM user_wallets w
JOIN users u ON w.user_id = u.id
LEFT JOIN wallet_transactions wt ON w.id = wt.wallet_id
GROUP BY w.id, w.user_id, u.name, u.email, w.balance, w.currency, w.status, w.created_at;

-- View: Recent transactions
DROP VIEW IF EXISTS v_recent_transactions CASCADE;
CREATE OR REPLACE VIEW v_recent_transactions AS
SELECT 
    wt.id,
    wt.user_id,
    u.name as user_name,
    u.email as user_email,
    wt.type,
    wt.amount,
    wt.balance_before,
    wt.balance_after,
    wt.description,
    wt.payment_method,
    wt.status,
    wt.created_at
FROM wallet_transactions wt
JOIN users u ON wt.user_id = u.id
ORDER BY wt.created_at DESC
LIMIT 100;

-- ============================================
-- 8. FUNCTIONS (Replaces MySQL Stored Procedures)
-- ============================================

-- Function: Get user wallet balance
CREATE OR REPLACE FUNCTION get_wallet_balance(p_user_id INTEGER)
RETURNS TABLE (
    balance DECIMAL(15, 2),
    currency VARCHAR(3),
    status wallet_status
) AS $$
BEGIN
    RETURN QUERY
    SELECT w.balance, w.currency, w.status
    FROM user_wallets w
    WHERE w.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Get transaction history
CREATE OR REPLACE FUNCTION get_transaction_history(
    p_user_id INTEGER,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id INTEGER,
    type transaction_type,
    amount DECIMAL(15, 2),
    balance_before DECIMAL(15, 2),
    balance_after DECIMAL(15, 2),
    description TEXT,
    payment_method VARCHAR(50),
    status transaction_status,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wt.id,
        wt.type,
        wt.amount,
        wt.balance_before,
        wt.balance_after,
        wt.description,
        wt.payment_method,
        wt.status,
        wt.created_at
    FROM wallet_transactions wt
    WHERE wt.user_id = p_user_id
    ORDER BY wt.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. AUTO-CREATE WALLET FOR NEW USERS
-- ============================================

CREATE OR REPLACE FUNCTION create_wallet_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_wallets (user_id, balance, currency, status)
    VALUES (NEW.id, 0.00, 'USD', 'active')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_wallet_on_user_create
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_wallet_for_new_user();

-- ============================================
-- Notes:
-- - Changed AUTO_INCREMENT to SERIAL
-- - Changed ENUM to PostgreSQL ENUM types
-- - Changed DECIMAL(10,2) to DECIMAL(15,2) for VND support
-- - Changed JSON to JSONB for better performance
-- - Replaced MySQL stored procedures with PostgreSQL functions
-- - Replaced DELIMITER with standard $$ syntax
-- - Added GIN indexes for JSONB columns
-- - Created trigger to auto-create wallet for new users
-- - Changed USER() to CURRENT_USER
-- - Used IS DISTINCT FROM for NULL-safe comparison
-- - LIMIT in views is supported in PostgreSQL
-- ============================================
