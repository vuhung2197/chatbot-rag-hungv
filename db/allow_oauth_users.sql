-- ==========================================
-- Allow OAuth Users (users without password)
-- ==========================================
-- 
-- Migration script to allow password_hash to be NULL for OAuth users
-- This enables users to login via Google OAuth without needing to register first

-- Make password_hash nullable for OAuth users
ALTER TABLE `users` 
  MODIFY COLUMN `password_hash` TEXT NULL;

-- Add a check or note: Users with NULL password_hash can only login via OAuth
-- Users with password_hash can login via email/password or OAuth

