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
// Middleware: authMiddleware.js (ĐÃ CẢI THIỆN)
export async function verifyToken(req, res, next) {
  // 1. Lấy token từ header
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token missing' });
  }

  try {
    // 2. Verify JWT token signature và expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. Hash token để kiểm tra trong database
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // 4. Kiểm tra session có trong database và chưa hết hạn
    const [sessions] = await pool.execute(
      `SELECT id, user_id, expires_at 
       FROM user_sessions 
       WHERE token_hash = ? AND expires_at > NOW()`,
      [tokenHash]
    );
    
    // 5. Nếu không tìm thấy session hoặc đã hết hạn
    if (sessions.length === 0) {
      return res.status(401).json({ 
        message: 'Session expired or revoked. Please login again.' 
      });
    }
    
    // 6. Verify user_id trong session khớp với user_id trong token
    const session = sessions[0];
    if (session.user_id !== decoded.id) {
      return res.status(401).json({ 
        message: 'Session user mismatch' 
      });
    }
    
    // 7. Gán thông tin user vào req.user
    req.user = decoded;
    req.sessionId = session.id; // Thêm sessionId vào request
    
    // 8. Chuyển sang middleware tiếp theo
    next();
  } catch (error) {
    // Xử lý lỗi JWT (invalid, expired, etc.)
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please login again.' });
    }
    return res.status(500).json({ message: 'Authentication error' });
  }
}
```

**Cải thiện:** 
- ✅ Middleware **ĐÃ kiểm tra session trong database**
- ✅ Token sẽ không hợp lệ nếu session bị revoke
- ✅ Token sẽ không hợp lệ nếu session đã hết hạn
- ✅ Kiểm tra user_id khớp giữa token và session
- ✅ Thêm `req.sessionId` để có thể dùng sau này

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

## ✅ Đã Cải Thiện

### 1. **Middleware đã kiểm tra session trong database** ✅

```javascript
// authMiddleware.js - ĐÃ CẢI THIỆN
export async function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
  // ✅ Kiểm tra session có trong database không
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const [sessions] = await pool.execute(
    'SELECT id, user_id FROM user_sessions WHERE token_hash = ? AND expires_at > NOW()',
    [tokenHash]
  );
  
  if (sessions.length === 0) {
    return res.status(401).json({ message: 'Session expired or revoked' });
  }
  
  // ✅ Verify user_id khớp
  if (sessions[0].user_id !== decoded.id) {
    return res.status(401).json({ message: 'Session user mismatch' });
  }
  
  req.user = decoded;
  req.sessionId = sessions[0].id; // ✅ Thêm sessionId
  next();
}
```

**Đã giải quyết:**
- ✅ Nếu user revoke session, token sẽ không hợp lệ ngay lập tức
- ✅ Attacker có token cũ không thể dùng nếu session đã bị revoke
- ✅ Kiểm tra session expiry trong database
- ✅ Verify user_id khớp giữa token và session

### 2. **Logout đã xóa session** ✅

**Đã cải thiện:**
- ✅ Tạo endpoint `POST /auth/logout`
- ✅ Xóa session trong database khi logout
- ✅ Frontend gọi API logout trước khi xóa localStorage

**Cách hoạt động:**
```javascript
// Backend: POST /auth/logout
export async function logout(req, res) {
  const userId = req.user?.id;
  const sessionId = req.sessionId; // Từ verifyToken middleware
  
  // Hash token để verify
  const tokenHash = crypto.createHash('sha256')
    .update(token).digest('hex');
  
  // Verify và xóa session
  await pool.execute(
    'DELETE FROM user_sessions WHERE id = ? AND user_id = ? AND token_hash = ?',
    [sessionId, userId, tokenHash]
  );
  
  res.json({ message: 'Logged out successfully' });
}

// Frontend: App.js
async function handleLogout() {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      // Gọi API để xóa session trong database
      await axios.post(`${API_URL}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  } catch (err) {
    console.error('Logout API error:', err);
  } finally {
    // Luôn xóa localStorage dù API có lỗi hay không
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    setRole(null);
  }
}
```

### 3. **Auto-logout khi session bị revoke** ✅

**Đã cải thiện:**
- ✅ Tạo axios interceptor để tự động logout khi nhận 401 (session expired/revoked)
- ✅ Khi revoke all other sessions, các thiết bị khác sẽ tự động logout ở request tiếp theo
- ✅ User được thông báo rõ ràng khi bị logout do session bị revoke

**Cách hoạt động:**
```javascript
// frontend/src/utils/axiosConfig.js
export function setupAxiosInterceptor(onLogout) {
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        const errorMessage = error.response?.data?.message || '';
        const sessionErrors = [
          'Session expired or revoked',
          'Session expired',
          'Token expired',
          // ...
        ];
        
        if (sessionErrors.some(msg => errorMessage.includes(msg))) {
          // Clear localStorage
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          localStorage.removeItem('userId');
          
          // Call logout callback
          onLogout();
        }
      }
      return Promise.reject(error);
    }
  );
}
```

**Kết quả:**
- Khi user A revoke all other sessions từ thiết bị 1
- User A ở thiết bị 2 sẽ tự động logout ở request tiếp theo
- User A ở thiết bị 2 nhận được thông báo: "Phiên đăng nhập đã hết hạn hoặc bị hủy"

### 4. **Đổi mật khẩu không revoke sessions**

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
5. API logout để xóa session hiện tại
6. Session expiry (30 ngày)
7. Cascade delete khi user bị xóa
8. Middleware verify session trong database

### ✅ **Đã cải thiện:**
1. ✅ Middleware verify session trong database - **ĐÃ HOÀN THÀNH**
2. ✅ Logout endpoint để xóa session - **ĐÃ HOÀN THÀNH**

### ⚠️ **Cần cải thiện tiếp:**
1. Revoke sessions khi đổi mật khẩu
2. Cleanup expired sessions (cron job)
3. Session rotation cho sensitive operations

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

