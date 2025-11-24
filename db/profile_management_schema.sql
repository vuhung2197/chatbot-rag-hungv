-- ==========================================
-- Profile Management Schema Update (MySQL 8.4+)
-- ==========================================

-- Thêm cột (chỉ thêm nếu chưa tồn tại)
ALTER TABLE `users`
  ADD COLUMN `display_name` VARCHAR(100) NULL AFTER `name`,
  ADD COLUMN `avatar_url`   VARCHAR(255) NULL AFTER `display_name`,
  ADD COLUMN `bio`          TEXT NULL AFTER `email`,
  ADD COLUMN `timezone`     VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh' AFTER `bio`,
  ADD COLUMN `language`     VARCHAR(10) NOT NULL DEFAULT 'vi' AFTER `timezone`,
  ADD COLUMN `email_verified` TINYINT(1) NOT NULL DEFAULT 0 AFTER `language`,
  ADD COLUMN `email_verification_token` VARCHAR(64) NULL AFTER `email_verified`,
  ADD COLUMN `last_login_at` TIMESTAMP NULL AFTER `email_verification_token`,
  ADD COLUMN `account_status` ENUM('active','suspended','deleted') NOT NULL DEFAULT 'active' AFTER `last_login_at`,
  ADD COLUMN `updated_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `account_status`;

-- Tạo index (chỉ tạo nếu chưa tồn tại)
ALTER TABLE `users`
  ADD INDEX `idx_users_email_verified` (`email_verified`),
  ADD INDEX `idx_users_account_status` (`account_status`);