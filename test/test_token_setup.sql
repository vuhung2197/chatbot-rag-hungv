-- Test data setup for token refresh testing
-- Run this to create test scenarios

USE chatbot;

-- Create test token that expires soon (for testing)
INSERT INTO google_tokens (
    email, 
    tokens_encrypted, 
    access_token_expires_at,
    refresh_token_encrypted,
    refresh_attempts
) VALUES (
    'test@example.com',
    'dGVzdF90b2tlbg==.signature', -- fake token for testing
    DATE_ADD(NOW(), INTERVAL 30 SECOND), -- expires in 30 seconds
    'dGVzdF9yZWZyZXNo.signature', -- fake refresh token
    0
) ON DUPLICATE KEY UPDATE
    access_token_expires_at = DATE_ADD(NOW(), INTERVAL 30 SECOND),
    refresh_attempts = 0;

-- Create expired token (for error testing)  
INSERT INTO google_tokens (
    email,
    tokens_encrypted,
    access_token_expires_at,
    refresh_token_encrypted,
    refresh_attempts  
) VALUES (
    'expired@example.com',
    'ZXhwaXJlZA==.signature',
    DATE_SUB(NOW(), INTERVAL 5 MINUTE), -- already expired
    'ZXhwaXJlZF9yZWZyZXNo.signature',
    0
) ON DUPLICATE KEY UPDATE
    access_token_expires_at = DATE_SUB(NOW(), INTERVAL 5 MINUTE);

-- Show current tokens for verification
SELECT 
    email,
    access_token_expires_at,
    TIMESTAMPDIFF(SECOND, NOW(), access_token_expires_at) as seconds_until_expiry,
    refresh_attempts,
    last_refresh_at
FROM google_tokens
WHERE email IN ('test@example.com', 'expired@example.com', 'hung97vu@gmail.com');