# User Module - Service Analysis

## Tổng quan
Module User quản lý thông tin người dùng, bao gồm profile, avatar, email verification, password management, session management, và export/import dữ liệu. Module này có 4 service files xử lý các chức năng khác nhau.

## Kiến trúc
- **4 Service Files**: user.service.js, password.service.js, session.service.js, export-import.service.js
- **Avatar Management**: Sharp cho image processing
- **Email Verification**: Token-based với crypto
- **Password Reset**: Token với expiration (1 hour)
- **Session Management**: Multi-device support với SHA-256 token hash
- **Export/Import**: JSON format với transaction atomicity

---

## 1. user.service.js

### 1.1. getProfile()
**Mục đích**: Lấy thông tin profile đầy đủ của user

**SQL Queries**:
```sql
SELECT id, name, email, role, created_at,
       avatar_url, display_name, bio, timezone, language,
       email_verified, last_login_at, account_status, updated_at,
       password_hash
FROM users WHERE id = ?
```

**Returns**: Object với hasPassword flag (check OAuth users)

**Code Example**:
```javascript
const profile = await userService.getProfile(123);
// Returns:
{
  id: 123,
  name: "John Doe",
  email: "john@example.com",
  role: "user",
  avatarUrl: "/uploads/avatars/123_1234567890.jpg",
  displayName: "John",
  bio: "English learner",
  timezone: "Asia/Ho_Chi_Minh",
  language: "vi",
  emailVerified: true,
  accountStatus: "active",
  hasPassword: true,  // false for OAuth-only users
  createdAt: "2024-01-01T00:00:00.000Z",
  lastLoginAt: "2024-03-27T10:00:00.000Z"
}
```

**Security**: Không trả về password_hash, chỉ trả về hasPassword boolean

---

### 1.2. updateProfile()
**Mục đích**: Cập nhật thông tin profile

**Parameters**:
- `displayName`: Tên hiển thị
- `bio`: Tiểu sử
- `timezone`: Múi giờ
- `language`: Ngôn ngữ (vi/en)
- `email`: Email mới (trigger re-verification)

**SQL Queries**:
```sql
-- Check email duplicate
SELECT id FROM users WHERE email = ? AND id != ?

-- Update profile
UPDATE users SET display_name = ?, bio = ?, timezone = ?, language = ?
WHERE id = ?

-- Nếu đổi email
UPDATE users SET email = ?, email_verified = FALSE, email_verification_token = NULL
WHERE id = ?
```

**Logic Flow**:
1. Build dynamic UPDATE query (chỉ update fields được provide)
2. Nếu đổi email:
   - Check duplicate email
   - Set email_verified = FALSE
   - Clear email_verification_token
3. Execute update

**Code Example**:
```javascript
await userService.updateProfile(123, {
  displayName: "John Smith",
  bio: "Learning English for 2 years",
  timezone: "Asia/Bangkok",
  email: "newemail@example.com"  // Triggers re-verification
});
```

---

### 1.3. uploadAvatar()
**Mục đích**: Upload và xử lý avatar image

**Logic Flow**:
1. Tạo thư mục uploads/avatars nếu chưa có
2. Generate unique filename: `{userId}_{timestamp}.jpg`
3. Resize image với Sharp:
   - 200x200 pixels
   - Fit: cover (crop to square)
   - Position: center
   - Quality: 90%
   - Format: JPEG
4. Xóa file temp gốc
5. Lấy old avatar URL từ database
6. Update database với avatar URL mới
7. Xóa old avatar file

**Code Example**:
```javascript
const avatarUrl = await userService.uploadAvatar(123, {
  path: '/tmp/upload_abc123.png',
  mimetype: 'image/png'
});
// Returns: "/uploads/avatars/123_1710000000000.jpg"
```

**Image Processing**:
```javascript
await sharp(file.path)
  .resize(200, 200, {
    fit: 'cover',
    position: 'center'
  })
  .jpeg({ quality: 90 })
  .toFile(outputPath);
```

**Security**: Cleanup old avatar để tránh disk space leak

---

### 1.4. deleteAvatar()
**Mục đích**: Xóa avatar của user

**SQL Queries**:
```sql
-- Get current avatar
SELECT avatar_url FROM users WHERE id = ?

-- Remove avatar
UPDATE users SET avatar_url = NULL WHERE id = ?
```

**Logic**: Xóa cả database record và file trên disk

---

### 1.5. sendEmailVerification()
**Mục đích**: Gửi email verification link

**SQL Queries**:
```sql
-- Check verification status
SELECT email_verified, email FROM users WHERE id = ?

-- Save token
UPDATE users SET email_verification_token = ? WHERE id = ?
```

**Logic Flow**:
1. Check nếu email đã verified → throw error
2. Generate random token (32 bytes hex = 64 chars)
3. Save token vào database
4. Gửi email với sendVerificationEmail()
5. Nếu email service chưa config:
   - Trả về verificationUrl và formatted token
   - Format token: "12345678-90abcdef-..." (8 chars mỗi group)

**Code Example**:
```javascript
const result = await userService.sendEmailVerification(123);
// If email service configured:
{
  message: "Email verification đã được gửi thành công!",
  serviceConfigured: true
}

// If email service NOT configured:
{
  message: "Verification email sent (check console for code)",
  verificationUrl: "http://localhost:3000/verify-email?token=abc123...",
  verificationCode: "abc12345-def67890-...",
  serviceConfigured: false
}
```

**Security**: Token không có expiration (user có thể verify bất cứ lúc nào)

---

### 1.6. verifyEmail()
**Mục đích**: Verify email bằng token

**SQL Queries**:
```sql
-- Find user by token
SELECT id, email_verified FROM users
WHERE email_verification_token = ?

-- Mark as verified
UPDATE users SET email_verified = TRUE, email_verification_token = NULL
WHERE id = ?
```

**Validation**:
- Token không hợp lệ → throw error
- Email đã verified → throw error

---

## 2. password.service.js

### 2.1. changePassword()
**Mục đích**: Đổi mật khẩu (user đã login)

**SQL Queries**:
```sql
-- Get current password hash
SELECT password_hash FROM users WHERE id = ?

-- Update password
UPDATE users SET password_hash = ? WHERE id = ?
```

**Logic Flow**:
1. Lấy password_hash hiện tại
2. Check nếu user chưa có password (OAuth user) → throw 'NO_PASSWORD_SET'
3. Verify current password với bcrypt.compare()
4. Check new password khác current password
5. Hash new password với bcrypt (salt rounds: 10)
6. Update database

**Code Example**:
```javascript
await passwordService.changePassword(123, "oldPass123", "newPass456");
// Returns: { message: "Mật khẩu đã được thay đổi thành công" }
```

**Security**:
- Bcrypt với 10 salt rounds
- Verify current password trước khi đổi
- Không cho phép đổi sang password giống cũ

---

### 2.2. requestPasswordReset()
**Mục đích**: Yêu cầu reset password (forgot password)

**SQL Queries**:
```sql
-- Find user by email
SELECT id, email FROM users WHERE email = ?

-- Delete old unused tokens
DELETE FROM password_reset_tokens
WHERE user_id = ? AND used = FALSE

-- Insert new token
INSERT INTO password_reset_tokens (user_id, token, expires_at)
VALUES (?, ?, ?)
```

**Logic Flow**:
1. Tìm user theo email
2. Nếu không tìm thấy → vẫn trả về success message (security: không leak user existence)
3. Generate random token (32 bytes hex)
4. Set expiration: 1 hour từ bây giờ
5. Xóa old unused tokens
6. Save token mới
7. Gửi email với sendPasswordResetEmail()

**Code Example**:
```javascript
const result = await passwordService.requestPasswordReset("user@example.com");
// Returns:
{
  message: "Link reset mật khẩu đã được gửi đến email của bạn",
  serviceConfigured: true
}
```

**Security**:
- Token expires sau 1 hour
- Xóa old tokens để tránh multiple active tokens
- Không leak user existence (luôn trả về success)

---

### 2.3. resetPassword()
**Mục đích**: Reset password bằng token

**SQL Queries**:
```sql
-- Validate token
SELECT user_id, expires_at, used
FROM password_reset_tokens WHERE token = ?

-- Update password
UPDATE users SET password_hash = ? WHERE id = ?

-- Mark token as used
UPDATE password_reset_tokens SET used = TRUE WHERE token = ?
```

**Validation**:
- Token không tồn tại → throw error
- Token đã used → throw error
- Token expired → throw error

**Logic Flow**:
1. Validate token
2. Hash new password
3. Update user password
4. Mark token as used

---

### 2.4. setPasswordForOAuthUser()
**Mục đích**: Thiết lập password cho OAuth user (lần đầu)

**SQL Queries**:
```sql
-- Check if user already has password
SELECT password_hash FROM users WHERE id = ?

-- Set password
UPDATE users SET password_hash = ? WHERE id = ?
```

**Validation**:
- User đã có password → throw 'ALREADY_HAS_PASSWORD'

**Use Case**: OAuth user muốn thêm password để login bằng email/password

---

## 3. session.service.js

### 3.1. getSessions()
**Mục đích**: Lấy danh sách sessions của user (multi-device)

**SQL Queries**:
```sql
SELECT id, device_info, ip_address, user_agent, expires_at, created_at,
       CASE WHEN token_hash = ? THEN 1 ELSE 0 END as is_current
FROM user_sessions
WHERE user_id = ? AND expires_at > NOW()
ORDER BY created_at DESC
```

**Parameters**:
- `currentToken`: JWT token hiện tại (để mark session hiện tại)

**Returns**: Array of sessions với is_current flag

**Code Example**:
```javascript
const sessions = await sessionService.getSessions(123, "jwt-token-abc");
// Returns:
[
  {
    id: 1,
    deviceInfo: "Chrome on Windows",
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0...",
    isCurrent: true,
    expiresAt: "2024-04-01T00:00:00.000Z",
    createdAt: "2024-03-27T10:00:00.000Z"
  },
  {
    id: 2,
    deviceInfo: "Safari on iPhone",
    ipAddress: "192.168.1.101",
    isCurrent: false,
    ...
  }
]
```

**Security**: Hash token với SHA-256 để so sánh

---

### 3.2. revokeSession()
**Mục đích**: Revoke (logout) một session cụ thể

**SQL Queries**:
```sql
-- Validate ownership
SELECT id FROM user_sessions WHERE id = ? AND user_id = ?

-- Delete session
DELETE FROM user_sessions WHERE id = ? AND user_id = ?
```

**Security**: Validate user_id để tránh revoke session của người khác

---

### 3.3. revokeAllOtherSessions()
**Mục đích**: Logout tất cả devices khác (giữ lại session hiện tại)

**SQL Queries**:
```sql
-- Count sessions to delete
SELECT COUNT(*) as count FROM user_sessions
WHERE user_id = ? AND token_hash != ?

-- Delete all other sessions
DELETE FROM user_sessions
WHERE user_id = ? AND token_hash != ?
```

**Returns**:
```javascript
{
  message: "All other sessions revoked successfully",
  revokedCount: 3,
  messageDetail: "3 session(s) đã bị hủy. Các thiết bị khác sẽ bị đăng xuất tự động."
}
```

**Use Case**: User nghi ngờ account bị compromise

---

## 4. export-import.service.js

### 4.1. exportUserData()
**Mục đích**: Export toàn bộ dữ liệu học tập của user (GDPR compliance)

**SQL Queries** (8 queries):
```sql
-- 1. User info
SELECT name, email, timezone, language FROM users WHERE id = $1

-- 2. Vocabulary
SELECT word, definition, translation, level, topic, mastery,
       review_count, next_review_at, created_at
FROM user_vocabulary WHERE user_id = $1

-- 3. Listening submissions
SELECT ls.exercise_id, le.title, le.level, ls.score_total, ls.created_at
FROM listening_submissions ls
LEFT JOIN listening_exercises le ON ls.exercise_id = le.id
WHERE ls.user_id = $1

-- 4. Reading submissions
SELECT passage_id, score_total, created_at
FROM reading_submissions WHERE user_id = $1

-- 5. Speaking submissions
SELECT topic_id, score_total, created_at
FROM speaking_submissions WHERE user_id = $1

-- 6. Writing submissions
SELECT ws.exercise_id, we.title, we.level, ws.score_total, ws.created_at
FROM writing_submissions ws
LEFT JOIN writing_exercises we ON ws.exercise_id = we.id
WHERE ws.user_id = $1

-- 7. Learning history
SELECT category, level, title, score, created_at
FROM learning_history WHERE user_id = $1

-- 8. Learning streaks
SELECT current_streak, longest_streak, last_activity_date,
       total_exercises, total_words_learned, avg_score, badges
FROM learning_streaks WHERE user_id = $1
```

**Returns**: JSON object với structure:
```javascript
{
  export_version: "1.0",
  exported_at: "2024-03-27T10:00:00.000Z",
  user: { name, email, timezone, language },
  vocabulary: [...],
  listening: {
    total_completed: 50,
    average_score: 85.5,
    submissions: [...]
  },
  reading: { total_completed, average_score, submissions },
  speaking: { total_completed, average_score, submissions },
  writing: { total_completed, average_score, submissions },
  learning_history: [...],
  learning_streaks: { current_streak, longest_streak, ... }
}
```

**Helper**: _calculateAvg() để tính average score

---

### 4.2. importUserData()
**Mục đích**: Import dữ liệu từ JSON export (restore backup)

**Transaction Flow**:
```javascript
BEGIN TRANSACTION

// 1. Delete old data
DELETE FROM user_vocabulary WHERE user_id = ?
DELETE FROM learning_history WHERE user_id = ?
DELETE FROM learning_streaks WHERE user_id = ?
DELETE FROM listening_submissions WHERE user_id = ?
DELETE FROM reading_submissions WHERE user_id = ?
DELETE FROM speaking_submissions WHERE user_id = ?
DELETE FROM writing_submissions WHERE user_id = ?

// 2. Import vocabulary
INSERT INTO user_vocabulary (...) VALUES (...)
ON CONFLICT (user_id, word, item_type) DO UPDATE SET ...

// 3. Import learning history
INSERT INTO learning_history (...) VALUES (...)

// 4. Import learning streaks
INSERT INTO learning_streaks (...) VALUES (...)
ON CONFLICT (user_id) DO UPDATE SET ...

// 5. Import submissions (listening, reading, speaking, writing)
INSERT INTO listening_submissions (...) VALUES (...)
...

COMMIT
```

**Security**:
- Sử dụng transaction để đảm bảo atomicity
- Rollback nếu có lỗi
- Validate exercise_id/passage_id/topic_id tồn tại

**Code Example**:
```javascript
const exportData = await userService.exportUserData(123);
// Save to file or send to user

// Later, restore from backup
await userService.importUserData(123, exportData);
```

---

## Best Practices

### Security
1. **Password Hashing**: Bcrypt với 10 salt rounds
2. **Token Security**: SHA-256 hash cho session tokens
3. **Email Verification**: Random 32-byte tokens
4. **Password Reset**: 1-hour expiration, one-time use
5. **Session Management**: Multi-device support với revoke capability
6. **GDPR Compliance**: Export/import cho data portability

### Performance
1. **Avatar Optimization**: Resize to 200x200, JPEG quality 90%
2. **Cleanup Old Files**: Xóa old avatar khi upload mới
3. **Transaction Batching**: Import sử dụng transaction
4. **Index**: Index trên email, email_verification_token, password_reset_tokens.token

### Reliability
1. **Transaction Atomicity**: Import/export sử dụng transactions
2. **Error Handling**: Try-catch và rollback
3. **File Cleanup**: Xóa temp files sau khi process
4. **Validation**: Check user existence, token validity, email duplicate

---

## Future Improvements

1. **Avatar CDN**: Upload avatar lên S3/CloudFront thay vì local disk
2. **Email Queue**: Sử dụng queue (Bull/BullMQ) cho email sending
3. **2FA**: Two-factor authentication với TOTP
4. **Password Policy**: Enforce minimum length, complexity
5. **Session Analytics**: Track login locations, devices
6. **Suspicious Activity Detection**: Alert khi login từ location mới
7. **Data Encryption**: Encrypt sensitive data at rest
8. **Incremental Export**: Export chỉ data mới từ last export
9. **Import Validation**: Validate JSON schema trước khi import
10. **Audit Log**: Log tất cả profile changes, password changes
