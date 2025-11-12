# 🔐 Giải Thích Về Session Management

## 📋 Tổng Quan

Session management là hệ thống quản lý các phiên đăng nhập của người dùng. Mỗi khi user đăng nhập (bằng password hoặc OAuth), hệ thống tạo một **session** để theo dõi và quản lý phiên đăng nhập đó.

---

## 🗄️ Database Schema

### Bảng `user_sessions`

```sql
CREATE TABLE `user_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,                    -- ID của user
  `token_hash` VARCHAR(255) NOT NULL,         -- Hash của JWT token (SHA-256)
  `device_info` VARCHAR(255) NULL,            -- Thông tin thiết bị (từ User-Agent)
  `ip_address` VARCHAR(45) NULL,               -- Địa chỉ IP của user
  `user_agent` TEXT NULL,                    -- User-Agent header đầy đủ
  `expires_at` TIMESTAMP NOT NULL,            -- Thời gian hết hạn (30 ngày)
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_token_hash` (`token_hash`),
  INDEX `idx_expires_at` (`expires_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
```

**Giải thích các trường:**
- `token_hash`: Hash của JWT token (SHA-256) - **KHÔNG lưu token gốc** để bảo mật
- `device_info`: Thông tin thiết bị (ví dụ: "Chrome on Windows")
- `ip_address`: Địa chỉ IP khi đăng nhập
- `expires_at`: Thời gian hết hạn (30 ngày sau khi đăng nhập)
- `ON DELETE CASCADE`: Tự động xóa sessions khi user bị xóa

---

## 🔄 Luồng Hoạt Động

### 1. **Khi User Đăng Nhập**

#### A. Đăng nhập bằng Password (`/auth/login`)

```javascript
// 1. Verify email/password
const user = await verifyCredentials(email, password);

// 2. Tạo JWT token (30 ngày)
const token = jwt.sign(
  { id: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '30d' }
);

// 3. Hash token để lưu vào database (bảo mật)
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

// 4. Lưu session vào database
await pool.execute(
  `INSERT INTO user_sessions 
   (user_id, token_hash, device_info, ip_address, user_agent, expires_at)
   VALUES (?, ?, ?, ?, ?, ?)`,
  [
    user.id,
    tokenHash,                    // Hash của token (KHÔNG lưu token gốc)
    deviceInfo,                   // "Chrome on Windows"
    ipAddress,                    // "192.168.1.1"
    userAgent,                    // Full User-Agent string
    expiresAt                     // 30 ngày sau
  ]
);

// 5. Trả về token cho client
res.json({ token, role: user.role, id: user.id });
```

#### B. Đăng nhập bằng OAuth (`/auth/google/callback`)

```javascript
// 1. Xác thực với Google OAuth
const { tokens } = await oauth2Client.getToken(code);
const profile = await getGoogleProfile(tokens);

// 2. Tìm hoặc tạo user
let user = await findOrCreateUser(profile.email);

// 3. Tạo JWT token (giống như login bằng password)
const jwtToken = jwt.sign(
  { id: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '30d' }
);

// 4. Lưu session vào database (giống như login bằng password)
const tokenHash = crypto.createHash('sha256').update(jwtToken).digest('hex');
await pool.execute(
  `INSERT INTO user_sessions (...) VALUES (...)`,
  [user.id, tokenHash, deviceInfo, ipAddress, userAgent, expiresAt]
);

// 5. Redirect về frontend với token
res.redirect(`${frontendUrl}?token=${jwtToken}&role=${user.role}`);
```

### 2. **Khi User Gửi Request (Authentication)**

```javascript
// Middleware: authMiddleware.js
export function verifyToken(req, res, next) {
  // 1. Lấy token từ header
  const token = req.headers.authorization?.split(' ')[1];
  
  // 2. Verify JWT token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
  // 3. Gán thông tin user vào req.user
  req.user = decoded; // { id: 123, role: 'user' }
  
  // 4. Chuyển sang middleware tiếp theo
  next();
}
```

**Lưu ý:** 
- Middleware hiện tại **CHỈ verify JWT token**, không kiểm tra session trong database
- Điều này có nghĩa là token vẫn hợp lệ cho đến khi hết hạn (30 ngày)
- **Chưa có cơ chế revoke session** trong middleware (có thể cải thiện)

### 3. **Khi User Xem Sessions**

```javascript
// GET /auth/sessions
export async function getSessions(req, res) {
  const userId = req.user.id;
  
  // 1. Hash token hiện tại để so sánh
  const currentToken = req.headers.authorization?.replace('Bearer ', '');
  const currentTokenHash = crypto.createHash('sha256')
    .update(currentToken)
    .digest('hex');
  
  // 2. Lấy tất cả sessions còn hiệu lực (chưa hết hạn)
  const [sessions] = await pool.execute(
    `SELECT 
      id, device_info, ip_address, user_agent,
      expires_at, created_at,
      CASE WHEN token_hash = ? THEN 1 ELSE 0 END as is_current
     FROM user_sessions 
     WHERE user_id = ? AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [currentTokenHash, userId]
  );
  
  // 3. Format và trả về
  res.json({ sessions: formattedSessions });
}
```

### 4. **Khi User Revoke Session**

#### A. Revoke một session cụ thể

```javascript
// DELETE /auth/sessions/:sessionId
export async function revokeSession(req, res) {
  const userId = req.user.id;
  const { sessionId } = req.params;
  
  // 1. Kiểm tra session thuộc về user
  const [session] = await pool.execute(
    'SELECT id FROM user_sessions WHERE id = ? AND user_id = ?',
    [sessionId, userId]
  );
  
  if (session.length === 0) {
    return res.status(404).json({ message: 'Session not found' });
  }
  
  // 2. Xóa session
  await pool.execute(
    'DELETE FROM user_sessions WHERE id = ? AND user_id = ?',
    [sessionId, userId]
  );
  
  res.json({ message: 'Session revoked successfully' });
}
```

#### B. Revoke tất cả sessions khác (giữ lại session hiện tại)

```javascript
// DELETE /auth/sessions/all/others
export async function revokeAllOtherSessions(req, res) {
  const userId = req.user.id;
  
  // 1. Hash token hiện tại
  const currentToken = req.headers.authorization?.replace('Bearer ', '');
  const currentTokenHash = crypto.createHash('sha256')
    .update(currentToken)
    .digest('hex');
  
  // 2. Xóa tất cả sessions trừ session hiện tại
  await pool.execute(
    'DELETE FROM user_sessions WHERE user_id = ? AND token_hash != ?',
    [userId, currentTokenHash]
  );
  
  res.json({ message: 'All other sessions revoked successfully' });
}
```

---

## 🔐 Bảo Mật

### 1. **Token Hash thay vì Token Gốc**

**Tại sao?**
- Nếu database bị hack, attacker không thể dùng token hash để đăng nhập
- Token hash chỉ dùng để **so sánh**, không thể reverse về token gốc

**Cách hoạt động:**
```javascript
// Khi tạo session
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
// tokenHash = "a1b2c3d4e5f6..." (64 ký tự hex)

// Lưu vào database
INSERT INTO user_sessions (token_hash) VALUES ('a1b2c3d4e5f6...');

// Khi verify
const currentTokenHash = crypto.createHash('sha256').update(currentToken).digest('hex');
// So sánh: currentTokenHash === tokenHash trong database
```

### 2. **Session Expiry (30 ngày)**

- Mỗi session có thời gian hết hạn: **30 ngày**
- Sau 30 ngày, session tự động hết hiệu lực
- User phải đăng nhập lại

### 3. **Cascade Delete**

- Khi user bị xóa → Tất cả sessions tự động bị xóa
- Đảm bảo không có orphan sessions

---

## 📊 Ví Dụ Thực Tế

### Scenario 1: User đăng nhập từ nhiều thiết bị

```
User đăng nhập:
1. Laptop (Chrome) → Session 1
2. Phone (Safari) → Session 2
3. Tablet (Chrome) → Session 3

Database:
user_sessions:
- id: 1, user_id: 123, device_info: "Chrome on Windows", ip: "192.168.1.1"
- id: 2, user_id: 123, device_info: "Safari on iOS", ip: "192.168.1.2"
- id: 3, user_id: 123, device_info: "Chrome on Android", ip: "192.168.1.3"

User có thể:
- Xem tất cả 3 sessions
- Revoke session 2 (phone) → Chỉ session 2 bị xóa
- Revoke all others → Chỉ giữ lại session hiện tại
```

### Scenario 2: User đổi mật khẩu

**Hiện tại:** 
- Đổi mật khẩu **KHÔNG** revoke sessions
- Sessions vẫn còn hiệu lực cho đến khi hết hạn (30 ngày)

**Có thể cải thiện:**
- Khi đổi mật khẩu → Revoke tất cả sessions khác
- Chỉ giữ lại session hiện tại (nơi user đang đổi mật khẩu)

### Scenario 3: User logout

**Hiện tại:**
- Logout chỉ xóa token ở frontend (localStorage)
- Session vẫn còn trong database
- Token vẫn hợp lệ nếu ai đó có token

**Có thể cải thiện:**
- Khi logout → Xóa session trong database
- Token không còn hợp lệ nữa

---

## ⚠️ Hạn Chế Hiện Tại

### 1. **Middleware không kiểm tra session trong database**

```javascript
// authMiddleware.js - HIỆN TẠI
export function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded;
  next();
  // ❌ KHÔNG kiểm tra session có trong database không
  // ❌ KHÔNG kiểm tra session đã bị revoke chưa
}
```

**Vấn đề:**
- Nếu user revoke session, token vẫn hợp lệ cho đến khi hết hạn
- Attacker có token cũ vẫn có thể dùng

**Giải pháp:**
```javascript
// CẢI THIỆN
export async function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
  // Kiểm tra session có trong database không
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const [sessions] = await pool.execute(
    'SELECT id FROM user_sessions WHERE token_hash = ? AND expires_at > NOW()',
    [tokenHash]
  );
  
  if (sessions.length === 0) {
    return res.status(401).json({ message: 'Session expired or revoked' });
  }
  
  req.user = decoded;
  next();
}
```

### 2. **Logout không xóa session**

**Hiện tại:**
- Logout chỉ xóa token ở frontend
- Session vẫn còn trong database

**Cải thiện:**
- Tạo endpoint `/auth/logout`
- Xóa session trong database khi logout

### 3. **Đổi mật khẩu không revoke sessions**

**Cải thiện:**
- Khi đổi mật khẩu → Revoke tất cả sessions khác
- Chỉ giữ lại session hiện tại

---

## 🎯 Best Practices

### 1. **Session Rotation**

- Mỗi request quan trọng → Tạo session mới
- Xóa session cũ
- Giảm nguy cơ token bị lộ

### 2. **Session Timeout**

- Hiện tại: 30 ngày (cố định)
- Có thể: 
  - Short session: 1 giờ (cho sensitive operations)
  - Long session: 30 ngày (cho remember me)

### 3. **Device Fingerprinting**

- Hiện tại: Chỉ lưu User-Agent
- Có thể: Lưu thêm device fingerprint phức tạp hơn

### 4. **Suspicious Activity Detection**

- Phát hiện đăng nhập từ IP/device mới
- Yêu cầu xác thực lại
- Gửi email thông báo

---

## 📝 Tóm Tắt

### ✅ **Đã có:**
1. Database schema cho sessions
2. Tạo session khi đăng nhập (password + OAuth)
3. API xem danh sách sessions
4. API revoke session (một hoặc tất cả)
5. Session expiry (30 ngày)
6. Cascade delete khi user bị xóa

### ⚠️ **Cần cải thiện:**
1. Middleware verify session trong database
2. Logout endpoint để xóa session
3. Revoke sessions khi đổi mật khẩu
4. Cleanup expired sessions (cron job)
5. Session rotation cho sensitive operations

---

## 🔗 Liên Kết

- **Database Schema:** `db/phase1_2_enhanced_auth_schema.sql`
- **Session Controller:** `backend/controllers/sessionController.js`
- **Auth Controller:** `backend/controllers/authController.js`
- **Auth Middleware:** `backend/middlewares/authMiddleware.js`
- **Routes:** `backend/routes/session.js`

---

**Tác giả:** AI Assistant  
**Ngày:** 2024  
**Phiên bản:** 1.0

