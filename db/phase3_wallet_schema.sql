-- ============================================
-- Phase 3: Wallet & Payment System
-- Created: 2026-01-19
-- ============================================

USE chatbot;

-- ============================================
-- 1. USER WALLETS
-- ============================================

CREATE TABLE IF NOT EXISTS user_wallets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',
  status ENUM('active', 'frozen', 'closed') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create wallet for existing users
INSERT INTO user_wallets (user_id, balance, currency, status)
SELECT 
  id as user_id,
  0.00 as balance,
  'USD' as currency,
  'active' as status
FROM users
WHERE id NOT IN (SELECT user_id FROM user_wallets)
ON DUPLICATE KEY UPDATE user_id = user_id;

-- ============================================
-- 2. WALLET TRANSACTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  wallet_id INT NOT NULL,
  user_id INT NOT NULL,
  type ENUM('deposit', 'withdrawal', 'purchase', 'refund', 'subscription') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  balance_before DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  description TEXT,
  reference_type VARCHAR(50) COMMENT 'subscription, feature, topup',
  reference_id INT,
  payment_method VARCHAR(50) COMMENT 'stripe, paypal, momo, vnpay',
  payment_gateway_id VARCHAR(255) COMMENT 'ID from payment gateway',
  status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (wallet_id) REFERENCES user_wallets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_wallet_id (wallet_id),
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_reference (reference_type, reference_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- 3. PAYMENT METHODS
-- ============================================

CREATE TABLE IF NOT EXISTS payment_methods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL COMMENT 'stripe, paypal, momo, vnpay',
  is_active BOOLEAN DEFAULT TRUE,
  config JSON COMMENT 'API keys, webhooks, etc.',
  supported_currencies JSON COMMENT '["USD", "VND"]',
  min_amount DECIMAL(10, 2) DEFAULT 1.00,
  max_amount DECIMAL(10, 2) DEFAULT 10000.00,
  fee_percentage DECIMAL(5, 2) DEFAULT 0.00,
  fee_fixed DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert default payment methods (config will be added via admin panel)
INSERT INTO payment_methods (name, display_name, provider, is_active, supported_currencies, min_amount, max_amount, fee_percentage, fee_fixed)
VALUES
  ('vnpay', 'VNPay', 'vnpay', TRUE, '["VND"]', 10000.00, 50000000.00, 1.50, 0.00),
  ('momo', 'MoMo', 'momo', TRUE, '["VND"]', 10000.00, 50000000.00, 1.00, 0.00),
  ('stripe', 'Stripe', 'stripe', TRUE, '["USD", "VND"]', 1.00, 10000.00, 2.90, 0.30),
  ('paypal', 'PayPal', 'paypal', FALSE, '["USD"]', 1.00, 10000.00, 3.40, 0.30)
ON DUPLICATE KEY UPDATE 
  display_name = VALUES(display_name),
  is_active = VALUES(is_active),
  supported_currencies = VALUES(supported_currencies),
  min_amount = VALUES(min_amount),
  max_amount = VALUES(max_amount);

-- ============================================
-- 4. UPDATE USER_SUBSCRIPTIONS TABLE
-- ============================================

-- Add wallet payment support to subscriptions
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS payment_source ENUM('wallet', 'card', 'external') DEFAULT 'wallet',
ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_payment_transaction_id INT NULL;

-- Add foreign key if not exists (MySQL doesn't have IF NOT EXISTS for FK)
-- This will fail silently if FK already exists
SET @fk_exists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = 'chatbot' 
  AND TABLE_NAME = 'user_subscriptions' 
  AND CONSTRAINT_NAME = 'fk_last_payment_transaction'
);

SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE user_subscriptions ADD CONSTRAINT fk_last_payment_transaction FOREIGN KEY (last_payment_transaction_id) REFERENCES wallet_transactions(id)',
  'SELECT "FK already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 5. HELPER VIEWS
-- ============================================

-- View: User wallet with transaction summary
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
-- 6. STORED PROCEDURES
-- ============================================

-- Procedure: Get user wallet balance
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_get_wallet_balance(IN p_user_id INT)
BEGIN
  SELECT balance, currency, status
  FROM user_wallets
  WHERE user_id = p_user_id;
END //
DELIMITER ;

-- Procedure: Get transaction history
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_get_transaction_history(
  IN p_user_id INT,
  IN p_limit INT,
  IN p_offset INT
)
BEGIN
  SELECT 
    id,
    type,
    amount,
    balance_before,
    balance_after,
    description,
    payment_method,
    status,
    created_at
  FROM wallet_transactions
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
END //
DELIMITER ;

-- ============================================
-- 7. TRIGGERS FOR AUDIT
-- ============================================

-- Trigger: Log wallet balance changes
CREATE TABLE IF NOT EXISTS wallet_audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  wallet_id INT NOT NULL,
  user_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_balance DECIMAL(10, 2),
  new_balance DECIMAL(10, 2),
  changed_by VARCHAR(100),
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_wallet_id (wallet_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DELIMITER //
CREATE TRIGGER IF NOT EXISTS trg_wallet_balance_update
AFTER UPDATE ON user_wallets
FOR EACH ROW
BEGIN
  IF OLD.balance != NEW.balance THEN
    INSERT INTO wallet_audit_log (wallet_id, user_id, action, old_balance, new_balance, changed_by)
    VALUES (NEW.id, NEW.user_id, 'balance_update', OLD.balance, NEW.balance, USER());
  END IF;
END //
DELIMITER ;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if tables are created
SELECT 
  'user_wallets' as table_name,
  COUNT(*) as row_count
FROM user_wallets
UNION ALL
SELECT 
  'wallet_transactions' as table_name,
  COUNT(*) as row_count
FROM wallet_transactions
UNION ALL
SELECT 
  'payment_methods' as table_name,
  COUNT(*) as row_count
FROM payment_methods;

-- Show payment methods
SELECT * FROM payment_methods;

-- Show wallet summary
SELECT * FROM v_user_wallet_summary LIMIT 5;
