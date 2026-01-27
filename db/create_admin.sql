-- ============================================
-- SCRIPT TẠO TÀI KHOẢN ADMIN
-- Ngày: 2026-01-23
-- Mục đích: Tạo tài khoản admin từ database
-- ============================================

USE chatbot;

-- ============================================
-- HƯỚNG DẪN:
-- Admin KHÔNG thể tự đăng ký qua form.
-- Admin chỉ được tạo bởi database administrator.
-- ============================================

-- ================================================
-- OPTION 1: PROMOTE USER ĐÃ CÓ THÀNH ADMIN
-- ================================================

-- Xem danh sách users hiện tại
SELECT id, name, email, role, created_at 
FROM users 
ORDER BY created_at DESC;

-- Promote user thành admin bằng EMAIL
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-email@example.com'  -- ← THAY ĐỔI EMAIL TẠI ĐÂY
LIMIT 1;

-- Hoặc promote bằng ID
UPDATE users 
SET role = 'admin' 
WHERE id = 1  -- ← THAY ĐỔI ID TẠI ĐÂY
LIMIT 1;

-- Verify thành công
SELECT id, name, email, role 
FROM users 
WHERE role = 'admin';

-- ================================================
-- OPTION 2: TẠO ADMIN MỚI HOÀN TOÀN
-- ================================================

-- Lưu ý: Password cần hash trước
-- Sử dụng bcrypt với salt rounds = 10
-- Password mẫu dưới đây là "admin123" đã hash

INSERT INTO users (name, email, password_hash, role, email_verified, account_status)
VALUES (
    'Administrator',                    -- Tên admin
    'admin@example.com',                -- Email admin - THAY ĐỔI
    '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHJKLMNOPQRSTUVWXYZ12',  -- Password hash - THAY ĐỔI
    'admin',                            -- Role
    TRUE,                               -- Email đã verify
    'active'                            -- Status
);

-- ⚠️ QUAN TRỌNG: 
-- Password hash trên chỉ là ví dụ!
-- Bạn cần generate hash thật từ password của bạn.

-- ================================================
-- TẠO VÍ CHO ADMIN MỚI
-- ================================================

-- Nếu tạo admin mới, cần tạo ví cho admin
SET @new_admin_id = LAST_INSERT_ID();

INSERT INTO user_wallets (user_id, balance, currency, status)
VALUES (@new_admin_id, 0.00, 'USD', 'active');

-- Verify ví đã tạo
SELECT 
    u.id,
    u.email,
    u.role,
    w.balance,
    w.currency
FROM users u
LEFT JOIN user_wallets w ON u.id = w.user_id
WHERE u.id = @new_admin_id;

-- ================================================
-- HELPER: TẠO PASSWORD HASH
-- ================================================

-- Sử dụng Node.js để tạo password hash:
-- 
-- const bcrypt = require('bcrypt');
-- const password = 'your-password-here';
-- const hash = await bcrypt.hash(password, 10);
-- console.log(hash);
-- 
-- Hoặc chạy lệnh sau trong terminal tại thư mục backend:
-- 
-- node -e "const bcrypt = require('bcrypt'); bcrypt.hash('your-password', 10).then(console.log);"

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- 1. Kiểm tra tổng số admin
SELECT COUNT(*) as total_admins 
FROM users 
WHERE role = 'admin';

-- 2. Xem tất cả admins
SELECT 
    id,
    name,
    email,
    role,
    email_verified,
    account_status,
    created_at,
    last_login_at
FROM users 
WHERE role = 'admin'
ORDER BY created_at DESC;

-- 3. Kiểm tra admin có ví không
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    CASE 
        WHEN w.id IS NOT NULL THEN 'Có ví'
        ELSE 'CHƯA CÓ VÍ ⚠️'
    END as wallet_status,
    w.balance,
    w.currency
FROM users u
LEFT JOIN user_wallets w ON u.id = w.user_id
WHERE u.role = 'admin';

-- 4. Nếu admin chưa có ví, tạo ngay
INSERT IGNORE INTO user_wallets (user_id, balance, currency, status)
SELECT id, 0.00, 'USD', 'active'
FROM users
WHERE role = 'admin' 
  AND id NOT IN (SELECT user_id FROM user_wallets);

-- ================================================
-- REVOKE ADMIN (Hủy quyền admin)
-- ================================================

-- Nếu cần hủy quyền admin của ai đó
UPDATE users 
SET role = 'user' 
WHERE email = 'email-to-demote@example.com'
  AND role = 'admin'
LIMIT 1;

-- Verify
SELECT id, name, email, role 
FROM users 
WHERE email = 'email-to-demote@example.com';

-- ================================================
-- AUDIT LOG
-- ================================================

-- Xem lịch sử thay đổi admin (nếu có audit table)
SELECT 
    wal.id,
    wal.user_id,
    u.email,
    wal.action,
    wal.changed_by,
    wal.created_at
FROM wallet_audit_log wal
JOIN users u ON wal.user_id = u.id
WHERE u.role = 'admin'
ORDER BY wal.created_at DESC
LIMIT 20;

-- ================================================
-- BEST PRACTICES
-- ================================================

-- ✅ Luôn tạo ít nhất 1 admin
-- ✅ Sử dụng email riêng cho admin (không dùng chung với user)
-- ✅ Sử dụng password mạnh cho admin
--  ✅ Verify email cho admin
-- ✅ Tạo ví cho admin ngay sau khi tạo tài khoản
-- ✅ Không chia sẻ thông tin admin với người khác
-- ✅ Thường xuyên kiểm tra danh sách admin

-- ================================================
-- END OF SCRIPT
-- ================================================
