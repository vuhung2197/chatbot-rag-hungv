-- Profile Management Schema
-- Thêm các columns mới vào bảng users cho Profile Management

-- Kiểm tra và thêm các columns nếu chưa tồn tại
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255) NULL AFTER name,
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(100) NULL AFTER name,
  ADD COLUMN IF NOT EXISTS bio TEXT NULL AFTER email,
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh' AFTER bio,
  ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'vi' AFTER timezone,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE AFTER language,
  ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(64) NULL AFTER email_verified,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL AFTER email_verification_token,
  ADD COLUMN IF NOT EXISTS account_status ENUM('active', 'suspended', 'deleted') DEFAULT 'active' AFTER last_login_at,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER account_status;

-- Tạo index cho các columns thường được query
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);

