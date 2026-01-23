-- ============================================
-- TEST QUERIES: KIỂM TRA LOGIC TỔNG NẠP
-- Ngày: 2026-01-23
-- ============================================

USE chatbot;

-- ============================================
-- 1. KIỂM TRA TỔNG QUAN HỆ THỐNG
-- ============================================

-- Số lượng users có ví
SELECT 
    'Total Users with Wallets' as metric,
    COUNT(*) as count
FROM user_wallets;

-- Phân bố currency
SELECT 
    currency,
    COUNT(*) as user_count,
    SUM(balance) as total_balance
FROM user_wallets
GROUP BY currency;

-- ============================================
-- 2. KIỂM TRA CHI TIẾT TỔNG NẠP
-- ============================================

-- Xem tất cả users và tổng nạp của họ
SELECT 
    u.id,
    u.email,
    w.currency,
    w.balance as current_balance,
    
    -- Tổng nạp (chỉ completed)
    COALESCE(SUM(CASE 
        WHEN wt.type = 'deposit' AND wt.status = 'completed' 
        THEN wt.amount ELSE 0 
    END), 0) as total_deposits_usd,
    
    -- Số lượng deposits thành công
    COUNT(CASE 
        WHEN wt.type = 'deposit' AND wt.status = 'completed' 
        THEN 1 
    END) as completed_deposit_count,
    
    -- Tổng pending
    COALESCE(SUM(CASE 
        WHEN wt.type = 'deposit' AND wt.status = 'pending' 
        THEN wt.amount ELSE 0 
    END), 0) as pending_deposits_usd,
    
    -- Tổng failed
    COALESCE(SUM(CASE 
        WHEN wt.type = 'deposit' AND wt.status = 'failed' 
        THEN wt.amount ELSE 0 
    END), 0) as failed_deposits_usd,
    
    -- Tổng chi tiêu
    COALESCE(SUM(CASE 
        WHEN wt.type IN ('purchase', 'subscription') AND wt.status = 'completed' 
        THEN ABS(wt.amount) ELSE 0 
    END), 0) as total_spent_usd
    
FROM users u
LEFT JOIN user_wallets w ON u.id = w.user_id
LEFT JOIN wallet_transactions wt ON w.id = wt.wallet_id
GROUP BY u.id, u.email, w.currency, w.balance
HAVING total_deposits_usd > 0 OR pending_deposits_usd > 0 OR failed_deposits_usd > 0
ORDER BY total_deposits_usd DESC;

-- ============================================
-- 3. KIỂM TRA CURRENCY CONVERSION
-- ============================================

-- So sánh giá trị USD vs VND
SELECT 
    u.id,
    u.email,
    w.currency,
    
    -- Tổng nạp bằng USD (như trong DB)
    COALESCE(SUM(CASE 
        WHEN wt.type = 'deposit' AND wt.status = 'completed' 
        THEN wt.amount ELSE 0 
    END), 0) as total_deposits_usd,
    
    -- Tổng nạp đã convert (nếu VND)
    CASE 
        WHEN w.currency = 'VND' THEN 
            ROUND(COALESCE(SUM(CASE 
                WHEN wt.type = 'deposit' AND wt.status = 'completed' 
                THEN wt.amount ELSE 0 
            END), 0) * 24000)
        ELSE 
            COALESCE(SUM(CASE 
                WHEN wt.type = 'deposit' AND wt.status = 'completed' 
                THEN wt.amount ELSE 0 
            END), 0)
    END as total_deposits_display_value
    
FROM users u
LEFT JOIN user_wallets w ON u.id = w.user_id
LEFT JOIN wallet_transactions wt ON w.id = wt.wallet_id
GROUP BY u.id, u.email, w.currency
HAVING total_deposits_usd > 0
ORDER BY total_deposits_usd DESC;

-- ============================================
-- 4. KIỂM TRA CHI TIẾT TRANSACTIONS
-- ============================================

-- Xem tất cả deposits (để verify calculation)
SELECT 
    wt.id,
    u.email,
    w.currency as wallet_currency,
    wt.type,
    wt.amount as amount_usd,
    wt.status,
    wt.description,
    wt.payment_method,
    wt.created_at,
    JSON_EXTRACT(wt.metadata, '$.currency') as transaction_currency,
    JSON_EXTRACT(wt.metadata, '$.order_id') as order_id,
    
    -- Nếu ví là VND, convert amount
    CASE 
        WHEN w.currency = 'VND' THEN ROUND(wt.amount * 24000)
        ELSE wt.amount
    END as amount_display
    
FROM wallet_transactions wt
JOIN user_wallets w ON wt.wallet_id = w.id
JOIN users u ON wt.user_id = u.id
WHERE wt.type = 'deposit'
ORDER BY wt.created_at DESC
LIMIT 50;

-- ============================================
-- 5. KIỂM TRA EDGE CASES
-- ============================================

-- Users có pending deposits nhưng chưa có completed
SELECT 
    u.id,
    u.email,
    COUNT(CASE WHEN wt.status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN wt.status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN wt.status = 'failed' THEN 1 END) as failed_count
FROM users u
JOIN user_wallets w ON u.id = w.user_id
LEFT JOIN wallet_transactions wt ON w.id = wt.wallet_id AND wt.type = 'deposit'
GROUP BY u.id, u.email
HAVING pending_count > 0 AND completed_count = 0;

-- Users đã chuyển currency
SELECT 
    wt.id,
    u.email,
    w.currency as current_currency,
    wt.description,
    JSON_EXTRACT(wt.metadata, '$.old_currency') as old_currency,
    JSON_EXTRACT(wt.metadata, '$.new_currency') as new_currency,
    JSON_EXTRACT(wt.metadata, '$.old_balance') as old_balance,
    JSON_EXTRACT(wt.metadata, '$.new_balance') as new_balance,
    wt.created_at
FROM wallet_transactions wt
JOIN user_wallets w ON wt.wallet_id = w.id
JOIN users u ON wt.user_id = u.id
WHERE JSON_EXTRACT(wt.metadata, '$.action') = 'currency_change'
ORDER BY wt.created_at DESC;

-- ============================================
-- 6. KIỂM TRA CONSISTENCY
-- ============================================

-- Verify balance = total_deposits - total_spent
SELECT 
    u.email,
    w.balance as current_balance,
    
    COALESCE(SUM(CASE 
        WHEN wt.type = 'deposit' AND wt.status = 'completed' 
        THEN wt.amount ELSE 0 
    END), 0) as total_deposits,
    
    COALESCE(SUM(CASE 
        WHEN wt.type IN ('purchase', 'subscription') AND wt.status = 'completed' 
        THEN ABS(wt.amount) ELSE 0 
    END), 0) as total_spent,
    
    COALESCE(SUM(CASE 
        WHEN wt.type = 'deposit' AND wt.status = 'completed' 
        THEN wt.amount ELSE 0 
    END), 0) - 
    COALESCE(SUM(CASE 
        WHEN wt.type IN ('purchase', 'subscription') AND wt.status = 'completed' 
        THEN ABS(wt.amount) ELSE 0 
    END), 0) as calculated_balance,
    
    -- Check if matches
    CASE 
        WHEN ABS(w.balance - (
            COALESCE(SUM(CASE 
                WHEN wt.type = 'deposit' AND wt.status = 'completed' 
                THEN wt.amount ELSE 0 
            END), 0) - 
            COALESCE(SUM(CASE 
                WHEN wt.type IN ('purchase', 'subscription') AND wt.status = 'completed' 
                THEN ABS(wt.amount) ELSE 0 
            END), 0)
        )) < 0.01 THEN 'OK'
        ELSE 'MISMATCH'
    END as status
    
FROM users u
JOIN user_wallets w ON u.id = w.user_id
LEFT JOIN wallet_transactions wt ON w.id = wt.wallet_id
GROUP BY u.email, w.balance, w.id;

-- ============================================
-- 7. QUICK STATS
-- ============================================

SELECT 
    'Total Completed Deposits' as metric,
    COUNT(*) as count,
    SUM(amount) as total_usd,
    AVG(amount) as avg_usd,
    MIN(amount) as min_usd,
    MAX(amount) as max_usd
FROM wallet_transactions
WHERE type = 'deposit' AND status = 'completed'

UNION ALL

SELECT 
    'Total Pending Deposits' as metric,
    COUNT(*) as count,
    SUM(amount) as total_usd,
    AVG(amount) as avg_usd,
    MIN(amount) as min_usd,
    MAX(amount) as max_usd
FROM wallet_transactions
WHERE type = 'deposit' AND status = 'pending'

UNION ALL

SELECT 
    'Total Failed Deposits' as metric,
    COUNT(*) as count,
    SUM(amount) as total_usd,
    AVG(amount) as avg_usd,
    MIN(amount) as min_usd,
    MAX(amount) as max_usd
FROM wallet_transactions
WHERE type = 'deposit' AND status = 'failed';

-- ============================================
-- END OF TEST QUERIES
-- ============================================
