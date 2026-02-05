-- Fix wallet balance precision for multi-currency support
-- This migration increases balance precision to support both VND and USD

-- Backup existing data first (recommended)
-- CREATE TABLE user_wallets_backup AS SELECT * FROM user_wallets;

-- Modify balance column to support more decimal places
-- DECIMAL(15, 2) allows up to 999,999,999,999.99
-- This supports:
-- - VND: up to 999 billion (no decimals needed)
-- - USD: up to 999 billion with 2 decimal places
ALTER TABLE user_wallets 
MODIFY COLUMN balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00;

-- Also update wallet_transactions table
ALTER TABLE wallet_transactions
MODIFY COLUMN amount DECIMAL(15, 2) NOT NULL,
MODIFY COLUMN balance_before DECIMAL(15, 2),
MODIFY COLUMN balance_after DECIMAL(15, 2);

-- Verify changes
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('user_wallets', 'wallet_transactions')
  AND COLUMN_NAME IN ('balance', 'amount', 'balance_before', 'balance_after')
ORDER BY TABLE_NAME, ORDINAL_POSITION;
