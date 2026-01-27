-- ============================================
-- TEST QUERIES: KIỂM TRA LOGIC SỐ DƯ KHẢ DỤNG
-- Ngày: 2026-01-23
-- ============================================

USE chatbot;

-- ============================================
-- 1. KIỂM TRA BALANCE CONSISTENCY
-- ============================================

-- So sánh balance trong wallet với tổng transactions
SELECT 
    u.id,
    u.email,
    w.balance as wallet_balance,
    w.currency as wallet_currency,
    
    -- Tính từ transactions (base USD)
    COALESCE(SUM(CASE 
        WHEN wt.type = 'deposit' AND wt.status = 'completed' 
        THEN wt.amount ELSE 0 
    END), 0) as total_deposits_usd,
    
    COALESCE(SUM(CASE 
        WHEN wt.type IN ('purchase', 'subscription') AND wt.status = 'completed' 
        THEN ABS(wt.amount) ELSE 0 
    END), 0) as total_spent_usd,
    
    COALESCE(SUM(CASE 
        WHEN wt.type = 'refund' AND wt.status = 'completed' 
        THEN wt.amount ELSE 0 
    END), 0) as total_refunds_usd,
    
    -- Balance tính toán (USD)
    COALESCE(SUM(CASE 
        WHEN wt.type = 'deposit' AND wt.status = 'completed' 
        THEN wt.amount ELSE 0 
    END), 0) - 
    COALESCE(SUM(CASE 
        WHEN wt.type IN ('purchase', 'subscription') AND wt.status = 'completed' 
        THEN ABS(wt.amount) ELSE 0 
    END), 0) +
    COALESCE(SUM(CASE 
        WHEN wt.type = 'refund' AND wt.status = 'completed' 
        THEN wt.amount ELSE 0 
    END), 0) as calculated_balance_usd,
    
    -- Convert wallet balance về USD để compare
    CASE 
        WHEN w.currency = 'VND' THEN ROUND(w.balance / 24000, 2)
        ELSE w.balance
    END as wallet_balance_in_usd,
    
    -- Tính difference
    ABS(
        (CASE WHEN w.currency = 'VND' THEN ROUND(w.balance / 24000, 2) ELSE w.balance END) - 
        (COALESCE(SUM(CASE WHEN wt.type = 'deposit' AND wt.status = 'completed' THEN wt.amount ELSE 0 END), 0) - 
         COALESCE(SUM(CASE WHEN wt.type IN ('purchase', 'subscription') AND wt.status = 'completed' THEN ABS(wt.amount) ELSE 0 END), 0) +
         COALESCE(SUM(CASE WHEN wt.type = 'refund' AND wt.status = 'completed' THEN wt.amount ELSE 0 END), 0))
    ) as difference_usd,
    
    -- Status
    CASE 
        WHEN ABS(
            (CASE WHEN w.currency = 'VND' THEN ROUND(w.balance / 24000, 2) ELSE w.balance END) - 
            (COALESCE(SUM(CASE WHEN wt.type = 'deposit' AND wt.status = 'completed' THEN wt.amount ELSE 0 END), 0) - 
             COALESCE(SUM(CASE WHEN wt.type IN ('purchase', 'subscription') AND wt.status = 'completed' THEN ABS(wt.amount) ELSE 0 END), 0) +
             COALESCE(SUM(CASE WHEN wt.type = 'refund' AND wt.status = 'completed' THEN wt.amount ELSE 0 END), 0))
        ) > 0.01 THEN '❌ MISMATCH'
        ELSE '✅ OK'
    END as consistency_status
    
FROM users u
JOIN user_wallets w ON u.id = w.user_id
LEFT JOIN wallet_transactions wt ON w.id = wt.wallet_id
GROUP BY u.id, u.email, w.balance, w.currency
ORDER BY difference_usd DESC;

-- ============================================
-- 2. CHI TIẾT TRANSACTIONS THEO USER
-- ============================================

-- Xem chi tiết từng transaction và balance changes
SELECT 
    wt.id,
    u.email,
    wt.type,
    wt.amount,
    wt.balance_before,
    wt.balance_after,
    wt.balance_after - wt.balance_before as actual_change,
    wt.status,
    wt.description,
    wt.payment_method,
    wt.payment_gateway_id,
    wt.created_at,
    
    -- Verify balance change logic
    CASE 
        WHEN wt.type IN ('deposit', 'refund') AND wt.status = 'completed' 
            THEN CASE WHEN (wt.balance_after - wt.balance_before) = wt.amount THEN '✅' ELSE '❌' END
        WHEN wt.type IN ('purchase', 'subscription', 'withdrawal') AND wt.status = 'completed'
            THEN CASE WHEN (wt.balance_before - wt.balance_after) = wt.amount THEN '✅' ELSE '❌' END
        WHEN wt.status = 'pending' OR wt.status = 'failed'
            THEN CASE WHEN wt.balance_before = wt.balance_after THEN '✅' ELSE '❌' END
        ELSE '🤷'
    END as balance_change_valid
    
FROM wallet_transactions wt
JOIN users u ON wt.user_id = u.id
ORDER BY u.email, wt.created_at DESC;

-- ============================================
-- 3. PENDING/FAILED TRANSACTIONS
-- ============================================

-- Pending và failed transactions KHÔNG nên ảnh hưởng balance
SELECT 
    u.email,
    w.balance as current_balance,
    w.currency,
    
    -- Pending deposits
    COUNT(CASE WHEN wt.status = 'pending' AND wt.type = 'deposit' THEN 1 END) as pending_deposit_count,
    COALESCE(SUM(CASE WHEN wt.status = 'pending' AND wt.type = 'deposit' THEN wt.amount ELSE 0 END), 0) as pending_deposit_amount,
    
    -- Failed deposits
    COUNT(CASE WHEN wt.status = 'failed' AND wt.type = 'deposit' THEN 1 END) as failed_deposit_count,
    COALESCE(SUM(CASE WHEN wt.status = 'failed' AND wt.type = 'deposit' THEN wt.amount ELSE 0 END), 0) as failed_deposit_amount,
    
    -- Verify: balance_before = balance_after for pending/failed
    COUNT(CASE 
        WHEN wt.status IN ('pending', 'failed') AND wt.balance_before != wt.balance_after 
        THEN 1 
    END) as invalid_pending_failed_count,
    
    CASE 
        WHEN COUNT(CASE WHEN wt.status IN ('pending', 'failed') AND wt.balance_before != wt.balance_after THEN 1 END) > 0
        THEN '❌ ERROR: Pending/Failed affected balance'
        ELSE '✅ OK'
    END as status
    
FROM users u
JOIN user_wallets w ON u.id = w.user_id
LEFT JOIN wallet_transactions wt ON w.id = wt.wallet_id
GROUP BY u.email, w.balance, w.currency
HAVING pending_deposit_count > 0 OR failed_deposit_count > 0;

-- ============================================
-- 4. CURRENCY CONVERSION TRACKING
-- ============================================

-- Xem các lần chuyển đổi currency
SELECT 
    wt.id,
    u.email,
    w.currency as current_currency,
    wt.description,
    wt.amount,
    wt.balance_before,
    wt.balance_after,
    JSON_EXTRACT(wt.metadata, '$.action') as action,
    JSON_EXTRACT(wt.metadata, '$.old_currency') as old_currency,
    JSON_EXTRACT(wt.metadata, '$.new_currency') as new_currency,
    JSON_EXTRACT(wt.metadata, '$.old_balance') as old_balance,
    JSON_EXTRACT(wt.metadata, '$.new_balance') as new_balance,
    JSON_EXTRACT(wt.metadata, '$.exchange_rate') as exchange_rate,
    wt.created_at,
    
    -- Verify conversion rate
    CASE 
        WHEN JSON_EXTRACT(wt.metadata, '$.old_currency') = '"USD"' 
         AND JSON_EXTRACT(wt.metadata, '$.new_currency') = '"VND"'
        THEN CONCAT('Expected: ', 
                    CAST(JSON_EXTRACT(wt.metadata, '$.old_balance') AS DECIMAL(10,2)) * 24000, 
                    ', Got: ', 
                    JSON_EXTRACT(wt.metadata, '$.new_balance'))
        WHEN JSON_EXTRACT(wt.metadata, '$.old_currency') = '"VND"' 
         AND JSON_EXTRACT(wt.metadata, '$.new_currency') = '"USD"'
        THEN CONCAT('Expected: ', 
                    ROUND(CAST(JSON_EXTRACT(wt.metadata, '$.old_balance') AS DECIMAL(10,2)) / 24000, 2), 
                    ', Got: ', 
                    JSON_EXTRACT(wt.metadata, '$.new_balance'))
        ELSE 'N/A'
    END as conversion_check
    
FROM wallet_transactions wt
JOIN user_wallets w ON wt.wallet_id = w.id
JOIN users u ON wt.user_id = u.id
WHERE JSON_EXTRACT(wt.metadata, '$.action') = 'currency_change'
ORDER BY wt.created_at DESC;

-- ============================================
-- 5. WALLET AUDIT LOG
-- ============================================

-- Xem lịch sử thay đổi balance từ audit log
SELECT 
    wal.id,
    u.email,
    wal.action,
    wal.old_balance,
    wal.new_balance,
    wal.new_balance - wal.old_balance as change_amount,
    CASE 
        WHEN wal.new_balance > wal.old_balance THEN '📈 INCREASE'
        WHEN wal.new_balance < wal.old_balance THEN '📉 DECREASE'
        ELSE '➡️  NO CHANGE'
    END as change_direction,
    wal.changed_by,
    wal.ip_address,
    wal.created_at
FROM wallet_audit_log wal
JOIN users u ON wal.user_id = u.id
ORDER BY wal.created_at DESC
LIMIT 100;

-- ============================================
-- 6. NEGATIVE BALANCE CHECK
-- ============================================

-- Không nên có balance < 0
SELECT 
    u.id,
    u.email,
    w.balance,
    w.currency,
    w.status as wallet_status,
    w.updated_at as last_updated,
    '❌ CRITICAL: Negative balance!' as alert
FROM users u
JOIN user_wallets w ON u.id = w.user_id
WHERE w.balance < 0
ORDER BY w.balance ASC;

-- ============================================
-- 7. BALANCE CHANGE STATISTICS
-- ============================================

-- Thống kê về các thay đổi balance
SELECT 
    'Total Balance Increases (Deposits)' as metric,
    COUNT(*) as transaction_count,
    SUM(balance_after - balance_before) as total_amount_usd,
    AVG(balance_after - balance_before) as avg_amount_usd,
    MIN(balance_after - balance_before) as min_amount_usd,
    MAX(balance_after - balance_before) as max_amount_usd
FROM wallet_transactions
WHERE type = 'deposit' AND status = 'completed'

UNION ALL

SELECT 
    'Total Balance Decreases (Purchases/Subscriptions)' as metric,
    COUNT(*) as transaction_count,
    SUM(balance_before - balance_after) as total_amount_usd,
    AVG(balance_before - balance_after) as avg_amount_usd,
    MIN(balance_before - balance_after) as min_amount_usd,
    MAX(balance_before - balance_after) as max_amount_usd
FROM wallet_transactions
WHERE type IN ('purchase', 'subscription') AND status = 'completed'

UNION ALL

SELECT 
    'Pending Transactions (No Balance Change)' as metric,
    COUNT(*) as transaction_count,
    SUM(amount) as proposed_amount_usd,
    AVG(amount) as avg_proposed_usd,
    MIN(amount) as min_proposed_usd,
    MAX(amount) as max_proposed_usd
FROM wallet_transactions
WHERE status = 'pending'

UNION ALL

SELECT 
    'Failed Transactions (No Balance Change)' as metric,
    COUNT(*) as transaction_count,
    SUM(amount) as failed_amount_usd,
    AVG(amount) as avg_failed_usd,
    MIN(amount) as min_failed_usd,
    MAX(amount) as max_failed_usd
FROM wallet_transactions
WHERE status = 'failed';

-- ============================================
-- 8. USER BALANCE SUMMARY
-- ============================================

-- Overview tất cả users và balance của họ
SELECT 
    u.id,
    u.email,
    u.name,
    w.balance,
    w.currency,
    w.status as wallet_status,
    
    -- Format balance với currency
    CASE 
        WHEN w.currency = 'VND' 
        THEN CONCAT(FORMAT(w.balance, 0), ' ₫')
        ELSE CONCAT('$', FORMAT(w.balance, 2))
    END as formatted_balance,
    
    -- Transaction counts
    COUNT(DISTINCT wt.id) as total_transactions,
    COUNT(DISTINCT CASE WHEN wt.type = 'deposit' AND wt.status = 'completed' THEN wt.id END) as completed_deposits,
    COUNT(DISTINCT CASE WHEN wt.type IN ('purchase', 'subscription') AND wt.status = 'completed' THEN wt.id END) as completed_purchases,
    COUNT(DISTINCT CASE WHEN wt.status = 'pending' THEN wt.id END) as pending_transactions,
    
    w.created_at as wallet_created_at,
    w.updated_at as wallet_last_updated,
    MAX(wt.created_at) as last_transaction_at
    
FROM users u
LEFT JOIN user_wallets w ON u.id = w.user_id
LEFT JOIN wallet_transactions wt ON w.id = wt.wallet_id
GROUP BY u.id, u.email, u.name, w.balance, w.currency, w.status, w.created_at, w.updated_at
ORDER BY w.balance DESC;

-- ============================================
-- 9. CONCURRENT TRANSACTION TEST
-- ============================================

-- Kiểm tra xem có transactions xảy ra cùng lúc không
SELECT 
    wt1.id as transaction_1_id,
    wt2.id as transaction_2_id,
    u.email,
    wt1.type as tx1_type,
    wt2.type as tx2_type,
    wt1.created_at as tx1_time,
    wt2.created_at as tx2_time,
    TIMESTAMPDIFF(SECOND, wt1.created_at, wt2.created_at) as time_diff_seconds,
    
    -- Check if balance states are consistent
    CASE 
        WHEN wt1.balance_after != wt2.balance_before 
         AND wt1.created_at < wt2.created_at
        THEN '❌ INCONSISTENT'
        ELSE '✅ OK'
    END as consistency_check
    
FROM wallet_transactions wt1
JOIN wallet_transactions wt2 ON wt1.wallet_id = wt2.wallet_id 
    AND wt1.id < wt2.id
    AND wt1.status = 'completed'
    AND wt2.status = 'completed'
    AND TIMESTAMPDIFF(SECOND, wt1.created_at, wt2.created_at) BETWEEN 0 AND 5
JOIN users u ON wt1.user_id = u.id
ORDER BY time_diff_seconds ASC
LIMIT 50;

-- ============================================
-- 10. BALANCE DISTRIBUTION
-- ============================================

-- Phân bố balance theo ranges
SELECT 
    CASE 
        WHEN currency = 'USD' THEN
            CASE 
                WHEN balance = 0 THEN '0 - Empty'
                WHEN balance > 0 AND balance <= 10 THEN '1 - $0-10'
                WHEN balance > 10 AND balance <= 50 THEN '2 - $10-50'
                WHEN balance > 50 AND balance <= 100 THEN '3 - $50-100'
                WHEN balance > 100 AND balance <= 500 THEN '4 - $100-500'
                ELSE '5 - $500+'
            END
        WHEN currency = 'VND' THEN
            CASE 
                WHEN balance = 0 THEN '0 - Empty'
                WHEN balance > 0 AND balance <= 100000 THEN '1 - 0-100k ₫'
                WHEN balance > 100000 AND balance <= 500000 THEN '2 - 100k-500k ₫'
                WHEN balance > 500000 AND balance <= 1000000 THEN '3 - 500k-1M ₫'
                WHEN balance > 1000000 AND balance <= 5000000 THEN '4 - 1M-5M ₫'
                ELSE '5 - 5M+ ₫'
            END
        ELSE 'Unknown Currency'
    END as balance_range,
    currency,
    COUNT(*) as user_count,
    SUM(balance) as total_balance,
    AVG(balance) as avg_balance,
    MIN(balance) as min_balance,
    MAX(balance) as max_balance
FROM user_wallets
GROUP BY balance_range, currency
ORDER BY currency, balance_range;

-- ============================================
-- END OF TEST QUERIES
-- ============================================
