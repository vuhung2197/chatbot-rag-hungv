-- ============================================
-- PostgreSQL Schema: 006 - Withdrawal Feature
-- ============================================

-- ============================================
-- ENUM Types
-- ============================================

CREATE TYPE bank_account_status AS ENUM ('active', 'pending', 'rejected', 'deleted');
CREATE TYPE withdrawal_status AS ENUM ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled');

-- ============================================
-- 1. Bank Accounts Table
-- ============================================

CREATE TABLE bank_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    bank_code VARCHAR(20) NOT NULL, -- VCB, VTB, etc.
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_holder_name VARCHAR(100) NOT NULL,
    branch_name VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    status bank_account_status DEFAULT 'pending',
    verification_method VARCHAR(50), -- manual, auto, napas
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bank_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_bank_account UNIQUE (user_id, bank_code, account_number)
);

CREATE INDEX idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX idx_bank_accounts_status ON bank_accounts(status);

-- Trigger for updated_at
CREATE TRIGGER update_bank_accounts_updated_at
    BEFORE UPDATE ON bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. Update Wallet Transactions
-- ============================================

-- Add new columns for withdrawal details
ALTER TABLE wallet_transactions
ADD COLUMN bank_account_id INTEGER NULL,
ADD COLUMN withdrawal_fee DECIMAL(15, 2) DEFAULT 0.00,
ADD COLUMN net_amount DECIMAL(15, 2) NULL; -- Amount user receives

-- Add Foreign Key
ALTER TABLE wallet_transactions
ADD CONSTRAINT fk_transaction_bank_account 
FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id);

CREATE INDEX idx_transactions_bank_account ON wallet_transactions(bank_account_id);

-- ============================================
-- 3. Withdrawal Requests Table
-- ============================================

CREATE TABLE withdrawal_requests (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    bank_account_id INTEGER NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    fee DECIMAL(15, 2) NOT NULL,
    net_amount DECIMAL(15, 2) NOT NULL,
    status withdrawal_status DEFAULT 'pending',
    
    -- Admin Review
    reviewed_by INTEGER NULL,
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    
    -- Processing
    processed_by INTEGER NULL,
    processed_at TIMESTAMP,
    processing_notes TEXT,
    bank_transaction_id VARCHAR(100), -- Ref ID from bank
    
    -- Completion/Rejection
    completed_at TIMESTAMP,
    rejection_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_withdrawal_transaction FOREIGN KEY (transaction_id) REFERENCES wallet_transactions(id),
    CONSTRAINT fk_withdrawal_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_withdrawal_bank_account FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
    CONSTRAINT fk_withdrawal_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id),
    CONSTRAINT fk_withdrawal_processed_by FOREIGN KEY (processed_by) REFERENCES users(id)
);

CREATE INDEX idx_withdrawal_user_id ON withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_status ON withdrawal_requests(status);
CREATE INDEX idx_withdrawal_created_at ON withdrawal_requests(created_at);

-- Trigger for updated_at
CREATE TRIGGER update_withdrawal_requests_updated_at
    BEFORE UPDATE ON withdrawal_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. Helper View: Withdrawal History
-- ============================================

CREATE OR REPLACE VIEW v_withdrawal_history AS
SELECT 
    wr.id,
    wr.user_id,
    u.email,
    u.name as user_name,
    wr.amount,
    wr.fee,
    wr.net_amount,
    wr.status,
    ba.bank_name,
    ba.account_number,
    ba.account_holder_name,
    wr.created_at,
    wr.completed_at
FROM withdrawal_requests wr
JOIN users u ON wr.user_id = u.id
JOIN bank_accounts ba ON wr.bank_account_id = ba.id;
