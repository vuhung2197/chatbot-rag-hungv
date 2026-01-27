-- ============================================
-- Update Payment Method Limits
-- Database: PostgreSQL
-- Purpose: Configure minimum/maximum deposit amounts
-- ============================================

-- Note: Connect to the 'chatbot' database before running:
-- psql -U postgres -d chatbot -f update_payment_limits.sql

\echo '============================================'
\echo 'Updating Payment Method Limits...'
\echo '============================================'

-- Update VNPay limits
-- Min: 10,000 VND (VNPay requirement - CANNOT go lower)
-- Max: 50,000,000 VND (Bank/VNPay hard limit)
UPDATE payment_methods 
SET min_amount = 10000.00,
    max_amount = 50000000.00,
    updated_at = NOW()
WHERE name = 'vnpay';

\echo 'Updated VNPay: 10,000 - 50,000,000 VND'

-- Update MoMo limits
-- Min: 10,000 VND (MoMo requirement - CANNOT go lower)
-- Max: 50,000,000 VND (MoMo hard limit)
UPDATE payment_methods 
SET min_amount = 10000.00,
    max_amount = 50000000.00,
    updated_at = NOW()
WHERE name = 'momo';

\echo 'Updated MoMo: 10,000 - 50,000,000 VND'

-- Update Stripe limits (more flexible)
-- Min: $0.50 (Stripe allows from $0.50)
-- Max: $999,999 (very high limit)
UPDATE payment_methods 
SET min_amount = 0.50,
    max_amount = 999999.00,
    updated_at = NOW()
WHERE name = 'stripe';

\echo 'Updated Stripe: $0.50 - $999,999'

-- Update PayPal limits
-- Min: $0.50
-- Max: $10,000
UPDATE payment_methods 
SET min_amount = 0.50,
    max_amount = 10000.00,
    updated_at = NOW()
WHERE name = 'paypal';

\echo 'Updated PayPal: $0.50 - $10,000'

\echo ''
\echo '============================================'
\echo 'Verification: Current Payment Method Limits'
\echo '============================================'

-- Verify changes with formatted output
SELECT 
    name AS "Method",
    display_name AS "Display Name",
    CASE 
        WHEN supported_currencies::text LIKE '%VND%' 
        THEN to_char(min_amount, '999,999,999') || ' VND'
        ELSE '$' || to_char(min_amount, '999,999,999.99')
    END AS "Minimum",
    CASE 
        WHEN supported_currencies::text LIKE '%VND%' 
        THEN to_char(max_amount, '999,999,999') || ' VND'
        ELSE '$' || to_char(max_amount, '999,999,999.99')
    END AS "Maximum",
    is_active AS "Active"
FROM payment_methods
ORDER BY name;

\echo ''
\echo 'Done! Payment limits updated successfully.'

