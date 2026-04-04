# JWT Authentication System

## Hiểu đơn giản

**Token giống như chìa khóa nhà:**
- Đăng nhập = lấy chìa khóa
- Mỗi lần vào nhà (gọi API) = đưa chìa khóa ra
- Không có chìa khóa = không vào được
- Chìa khóa giả (token sai) = cửa không mở
- Đăng xuất = trả lại chìa khóa, không dùng được nữa

---

## Luồng hoạt động từ đầu đến cuối

### Bước 1: Người dùng đăng nhập

```
User nhập email + password
  ↓
POST /api/auth/login
  {
    "email": "user@example.com",
    "password": "mypassword123"
  }
  ↓
Server kiểm tra:
  - Email có tồn tại không?
  - Password đúng không? (so sánh bcrypt hash)
  ↓
✅ Đúng → Tạo token
❌ Sai → Trả lỗi 401 "Invalid credentials"
```

**Server tạo token:**
```javascript
// 1. Tạo JWT token
const token = jwt.sign(
    { id: 123, role: 'user' },  // Payload: thông tin user
    'JWT_SECRET',                // Secret key (chỉ server biết)
    { expiresIn: '30d' }         // Hết hạn sau 30 ngày
);

// Token trông như này:
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzLCJyb2xlIjoidXNlciIsImlhdCI6MTY0MDk5NTIwMCwiZXhwIjoxNjQzNTg3MjAwfQ.abc123xyz"

// 2. Hash token và lưu vào DB
const tokenHash = sha256(token);
INSERT INTO user_sessions (user_id, token_hash, expires_at)
VALUES (123, 'a3f5b8c9...', '2026-05-01');

// 3. Trả token về client
Response: { token: "eyJhbGc..." }
```

**Client lưu token:**
```javascript
// Lưu vào localStorage hoặc memory
localStorage.setItem('token', token);
```

---

### Bước 2: Người dùng gọi API (có bảo vệ)

```
User muốn xem profile
  ↓
GET /api/user/profile
Headers: {
  Authorization: "Bearer eyJhbGc..."  ← Gửi token kèm theo
}
  ↓
Server nhận request
  ↓
Middleware verifyToken() chạy:
```

**Middleware kiểm tra token (4 bước):**

```javascript
// BƯỚC 1: Lấy token từ header
const token = req.headers.authorization?.split(' ')[1];
if (!token) return 401 "Token missing";

// BƯỚC 2: Verify chữ ký JWT
const decoded = jwt.verify(token, 'JWT_SECRET');
// → Kiểm tra:
//    - Token có bị sửa không? (signature)
//    - Token hết hạn chưa? (exp)
// → Nếu sai → 403 "Invalid token"
// → Nếu hết hạn → 401 "Token expired"

// BƯỚC 3: Kiểm tra session trong DB
const tokenHash = sha256(token);
const session = SELECT * FROM user_sessions 
                WHERE token_hash = tokenHash 
                AND expires_at > NOW();

if (!session) return 401 "Session expired or revoked";

// BƯỚC 4: Gán thông tin user vào request
req.user = { id: 123, role: 'user' };
next(); // Cho phép tiếp tục
```

**Controller xử lý:**
```javascript
// Bây giờ controller biết user là ai
async function getProfile(req, res) {
    const userId = req.user.id;  // 123
    const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    res.json(user);
}
```

---

### Bước 3: Người ngoài cố truy cập (không có token)

```
Hacker gọi API
  ↓
GET /api/user/profile
Headers: {}  ← Không có token
  ↓
Middleware verifyToken():
  - Không tìm thấy token
  ↓
❌ Response: 401 "Token missing"
  ↓
Request bị chặn, không chạy controller
```

---

### Bước 4: Người ngoài cố dùng token giả

```
Hacker tự tạo token giả
  ↓
GET /api/user/profile
Headers: {
  Authorization: "Bearer fake-token-123"
}
  ↓
Middleware verifyToken():
  - jwt.verify(token, JWT_SECRET)
  - Chữ ký không khớp (vì không biết JWT_SECRET)
  ↓
❌ Response: 403 "Invalid token"
```

**Tại sao không fake được?**

JWT token có 3 phần:
```
eyJhbGc...  .  eyJpZCI...  .  abc123xyz
  ↑              ↑              ↑
Header        Payload       Signature
```

**Signature** = HMAC-SHA256(header + payload, JWT_SECRET)

- Hacker không biết `JWT_SECRET`
- Nếu sửa payload (ví dụ đổi `id: 123` → `id: 999`)
- Signature sẽ không khớp → jwt.verify() fail

---

### Bước 5: Người dùng đăng xuất

```
User bấm "Logout"
  ↓
POST /api/auth/logout
Headers: {
  Authorization: "Bearer eyJhbGc..."
}
  ↓
Middleware verifyToken() → OK
  ↓
Controller logout():
  DELETE FROM user_sessions WHERE id = req.sessionId;
  ↓
✅ Response: "Logged out successfully"
```

**Sau khi logout:**
```
User cố dùng token cũ
  ↓
GET /api/user/profile
Headers: {
  Authorization: "Bearer eyJhbGc..."  ← Token cũ
}
  ↓
Middleware verifyToken():
  - jwt.verify() → OK (token chưa hết hạn)
  - Query DB → Không tìm thấy session (đã xóa)
  ↓
❌ Response: 401 "Session expired or revoked"
```

---

## Tóm tắt: Ai làm được gì?

| Người | Có token hợp lệ? | Kết quả |
|-------|------------------|---------|
| User đã login | ✅ Có | ✅ Truy cập được tất cả API protected |
| User đã logout | ❌ Token bị revoke | ❌ 401 "Session expired" |
| Hacker không có token | ❌ Không có | ❌ 401 "Token missing" |
| Hacker dùng token giả | ❌ Signature sai | ❌ 403 "Invalid token" |
| Hacker đánh cắp token | ✅ Token thật | ✅ Truy cập được (cho đến khi user logout) |

**Lưu ý:** Nếu token bị đánh cắp, hacker có thể dùng cho đến khi:
- User logout (xóa session)
- Token hết hạn (30 ngày)
- Admin revoke session

---

## JWT_SECRET - Chìa khóa bí mật

**JWT_SECRET** là chuỗi bí mật chỉ server biết, dùng để:
- **Sign token** khi login (tạo chữ ký)
- **Verify token** khi gọi API (kiểm tra chữ ký)

### Ví dụ minh họa

```javascript
// Server có JWT_SECRET = "my-super-secret-key-12345"

// KHI LOGIN: Tạo token
const token = jwt.sign(
    { id: 123, role: 'user' },
    "my-super-secret-key-12345"  // ← Dùng secret để sign
);
// → Token: "eyJhbGc...abc123xyz"
//          Phần abc123xyz là signature = HMAC(header+payload, secret)

// KHI GỌI API: Verify token
jwt.verify(token, "my-super-secret-key-12345");
// → Tính lại signature từ header+payload
// → So sánh với signature trong token
// → Nếu khớp → token hợp lệ
```

### Nếu hacker không biết JWT_SECRET

```javascript
// Hacker tự tạo token
const fakeToken = jwt.sign(
    { id: 999, role: 'admin' },  // Giả làm admin
    "wrong-secret"               // ← Không biết secret thật
);

// Server verify
jwt.verify(fakeToken, "my-super-secret-key-12345");
// → Signature không khớp
// → Throw error: "Invalid token"
```

### Bảo mật JWT_SECRET

```bash
# ❌ KHÔNG BAO GIỜ làm thế này
const JWT_SECRET = "123456";  // Quá ngắn, dễ đoán

# ✅ Nên làm thế này
JWT_SECRET=a8f3b9c2d7e1f4a6b5c8d9e2f1a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1
```

**Quy tắc:**
- Dài >= 32 ký tự
- Random, không đoán được
- Lưu trong `.env`, không commit vào git
- Rotate định kỳ (nhưng sẽ invalidate tất cả token cũ)

---

## Tổng quan

Hệ thống sử dụng **JWT + Server-side Session** — không phải JWT thuần túy. Token được verify qua chữ ký JWT, nhưng session được kiểm tra qua database để có khả năng revoke.

---

## Luồng hoạt động

### 1. Đăng nhập (Login)

```
Client gửi email/password
  ↓
Server verify bcrypt hash
  ↓
jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '30d' })
  ↓
SHA256(token) lưu vào bảng user_sessions
  - expires_at = NOW() + 30 days
  - user_agent, ip_address
  ↓
Trả token về client
```

**Code:** `auth.controller.js` → `login()`

```javascript
const jwtToken = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
);

await authService.createSession(user.id, jwtToken, {
    userAgent: req.headers['user-agent'],
    ip: req.ip
});
```

---

### 2. Xác thực mỗi request (Authentication)

```
Client gửi: Authorization: Bearer <token>
  ↓
Tách token từ header
  ↓
jwt.verify(token, JWT_SECRET)
  - Kiểm tra chữ ký (signature)
  - Kiểm tra hết hạn (expiry)
  ↓
SHA256(token) → query user_sessions
  - WHERE token_hash = ? AND expires_at > NOW()
  ↓
So khớp session.user_id == decoded.id
  ↓
Gán req.user = decoded
Gán req.sessionId = session.id
  ↓
next()
```

**Code:** `auth.middleware.js` → `verifyToken()`

---

### 3. Đăng xuất (Logout)

```
Client gửi request với token
  ↓
verifyToken middleware
  ↓
DELETE FROM user_sessions WHERE id = req.sessionId
  ↓
Token cũ vẫn valid về mặt JWT
nhưng không còn session trong DB
  ↓
Mọi request tiếp theo bị từ chối
```

**Code:** `auth.controller.js` → `logout()`

---

## Tại sao dùng cả JWT lẫn DB session?

| Tính năng | JWT thuần | JWT + Session (hệ thống này) |
|-----------|-----------|------------------------------|
| Logout thực sự | ❌ Không | ✅ Có (xóa session) |
| Revoke khi bị lộ | ❌ Không | ✅ Có |
| DB query mỗi request | ❌ Không | ⚠️ Có (1 query) |
| Stateless | ✅ Có | ❌ Không |

**JWT thuần túy** không thể revoke trước khi hết hạn — nếu token bị lộ, không có cách nào vô hiệu hóa cho đến khi token tự hết hạn (30 ngày).

**Hệ thống này** giải quyết bằng cách lưu hash token vào DB:
- Logout → xóa session → token không còn valid
- Token bị lộ → admin xóa session → token bị revoke ngay lập tức
- Trade-off: mỗi request cần 1 query DB

---

## Cấu trúc Database

### Bảng `user_sessions`

```sql
CREATE TABLE user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token_hash VARCHAR(64) NOT NULL,  -- SHA256 của JWT token (KHÔNG phải token gốc)
    user_agent TEXT,
    ip_address VARCHAR(45),
    expires_at DATETIME NOT NULL,     -- NOW() + 30 days
    created_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token_hash (token_hash),
    INDEX idx_user_expires (user_id, expires_at)
);
```

### Database lưu gì?

**❌ KHÔNG lưu token gốc:**
```sql
-- SAI - Nguy hiểm!
INSERT INTO user_sessions (user_id, token) 
VALUES (123, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzfQ.abc123');
```

**✅ Lưu hash của token:**
```sql
-- ĐÚNG - An toàn
INSERT INTO user_sessions (user_id, token_hash) 
VALUES (123, 'a3f5b8c9d2e1f4a7b6c5d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0');
```

### Ví dụ cụ thể

**Khi user login:**

```javascript
// 1. Tạo JWT token
const token = jwt.sign({ id: 123, role: 'user' }, JWT_SECRET, { expiresIn: '30d' });
console.log('Token gốc:', token);
// → "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzLCJyb2xlIjoidXNlciIsImlhdCI6MTcxMjA0ODM2NiwiZXhwIjoxNzE0NjQwMzY2fQ.K7vGx2mP9nQ8rS5tU6wV7xY8zA9bC0dE1fF2gG3hH4i"

// 2. Hash token bằng SHA256
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
console.log('Token hash:', tokenHash);
// → "a3f5b8c9d2e1f4a7b6c5d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0"

// 3. Lưu HASH vào database (KHÔNG lưu token gốc)
await pool.execute(
    'INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [123, tokenHash, '2026-05-01']
);

// 4. Trả token GỐC về client (client cần token gốc để gửi lên server)
res.json({ token: token });  // ← Client lưu cái này
```

**Trong database:**
```
+----+---------+------------------------------------------------------------------+---------------------+
| id | user_id | token_hash                                                       | expires_at          |
+----+---------+------------------------------------------------------------------+---------------------+
| 1  | 123     | a3f5b8c9d2e1f4a7b6c5d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0 | 2026-05-01 10:30:00 |
+----+---------+------------------------------------------------------------------+---------------------+
```

**Khi user gọi API:**

```javascript
// 1. Client gửi token GỐC trong header
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzfQ.K7vGx2mP9nQ8rS5tU6wV7xY8zA9bC0dE1fF2gG3hH4i

// 2. Server nhận token gốc
const token = req.headers.authorization.split(' ')[1];

// 3. Hash token để so sánh với DB
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
// → "a3f5b8c9d2e1f4a7b6c5d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0"

// 4. Query DB bằng hash
const session = await pool.execute(
    'SELECT * FROM user_sessions WHERE token_hash = ? AND expires_at > NOW()',
    [tokenHash]
);

// 5. Nếu tìm thấy → token hợp lệ
if (session.length > 0) {
    // Token valid
}
```

### Tại sao phải hash?

**Kịch bản: Database bị leak**

#### ❌ Nếu lưu token gốc (nguy hiểm)

```sql
-- Hacker dump database
SELECT * FROM user_sessions;

+----+---------+-------------------------------------------------------------------------+
| id | user_id | token                                                                   |
+----+---------+-------------------------------------------------------------------------+
| 1  | 123     | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzfQ.K7vGx2mP9nQ8rS5tU6wV... |
| 2  | 456     | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NDU2fQ.L8wHy3nQ0oR9sT6uV7xW... |
+----+---------+-------------------------------------------------------------------------+
```

**Hacker làm gì:**
```bash
# Copy token từ database
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzfQ.K7vGx2mP9nQ8rS5tU6wV..."
     https://api.example.com/user/profile

# → ✅ Thành công! Hacker giả làm user 123
```

#### ✅ Nếu lưu hash (an toàn)

```sql
-- Hacker dump database
SELECT * FROM user_sessions;

+----+---------+------------------------------------------------------------------+
| id | user_id | token_hash                                                       |
+----+---------+------------------------------------------------------------------+
| 1  | 123     | a3f5b8c9d2e1f4a7b6c5d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0 |
| 2  | 456     | b4g6c0e3f5b8d1f9c2e5a7d0f3b6c9e2f5a8d1f4b7c0e3f6a9d2e5f8b1c4d7e0f3 |
+----+---------+------------------------------------------------------------------+
```

**Hacker làm gì:**
```bash
# Copy hash từ database
curl -H "Authorization: Bearer a3f5b8c9d2e1f4a7b6c5d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0"
     https://api.example.com/user/profile

# → ❌ Thất bại! Hash không phải token hợp lệ
# Server sẽ trả lỗi: "Invalid token"
```

**Tại sao không dùng được hash?**
- Hash là kết quả của SHA256(token)
- Không thể reverse: hash → token gốc
- Server cần token GỐC để verify JWT signature
- Hash chỉ dùng để SO SÁNH, không dùng để authenticate

### Luồng so sánh

```
Client có: Token gốc (150 ký tự)
  ↓
Gửi lên server
  ↓
Server hash token → Hash A (64 ký tự)
  ↓
Query DB: SELECT * WHERE token_hash = Hash A
  ↓
DB trả về: token_hash = Hash B (64 ký tự)
  ↓
So sánh: Hash A == Hash B?
  ✅ Bằng nhau → Token hợp lệ
  ❌ Khác nhau → Token không hợp lệ
```

**Đặc điểm quan trọng:**
- Cùng token → cùng hash (deterministic)
- Token khác 1 ký tự → hash hoàn toàn khác
- Không thể từ hash tìm ra token gốc

---

## Hash Token - Giải thích chi tiết

### SHA256 là gì?

**SHA256** (Secure Hash Algorithm 256-bit) là hàm băm mật mã học:
- Input: chuỗi bất kỳ (token)
- Output: chuỗi 64 ký tự hex (256 bits)
- **One-way**: không thể reverse từ hash về token gốc
- **Deterministic**: cùng input → cùng output
- **Collision-resistant**: gần như không thể tìm 2 input khác nhau cho cùng hash

### Hash vs Encryption

| | Hash (SHA256) | Encryption (AES) |
|---|---|---|
| Chiều | One-way (không đảo ngược) | Two-way (encrypt/decrypt) |
| Key | Không cần key | Cần key để decrypt |
| Output | Luôn 64 ký tự hex | Tùy thuộc input |
| Use case | Verify, không cần lấy lại gốc | Lưu trữ, cần lấy lại gốc |

### Ví dụ cụ thể

```javascript
import crypto from 'crypto';

// Token gốc (JWT)
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzLCJyb2xlIjoidXNlciJ9.abc123";

// Hash bằng SHA256
const tokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

console.log(tokenHash);
// Output: "a3f5b8c9d2e1f4a7b6c5d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0"
```

**Đặc điểm:**
- Token gốc: 150+ ký tự
- Hash: luôn 64 ký tự
- Thay đổi 1 ký tự trong token → hash hoàn toàn khác

### Luồng hoạt động trong code

#### 1. Khi login (tạo session)

**File:** `auth.service.js` → `createSession()`

```javascript
async createSession(userId, token, { userAgent, ip }) {
    // Hash token trước khi lưu
    const tokenHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await pool.execute(
        `INSERT INTO user_sessions 
         (user_id, token_hash, user_agent, ip_address, expires_at)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, tokenHash, userAgent, ip, expiresAt]
    );
}
```

**Lưu vào DB:**
```
user_id: 123
token_hash: "a3f5b8c9d2e1f4a7b6c5d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0"
expires_at: "2026-05-01 10:30:00"
```

#### 2. Khi verify (mỗi request)

**File:** `auth.middleware.js` → `verifyToken()`

```javascript
// Client gửi token trong header
const token = req.headers.authorization?.split(' ')[1];

// 1. Verify JWT signature
const decoded = jwt.verify(token, process.env.JWT_SECRET);

// 2. Hash token để so sánh với DB
const tokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

// 3. Query DB bằng hash
const [sessions] = await pool.execute(
    `SELECT id, user_id, expires_at 
     FROM user_sessions 
     WHERE token_hash = ? AND expires_at > NOW()`,
    [tokenHash]
);

// 4. Nếu tìm thấy → token valid
if (sessions.length > 0) {
    req.user = decoded;
    next();
}
```

### Tại sao không lưu token gốc?

#### ❌ Nếu lưu token gốc vào DB

```sql
-- BAD: Lưu token gốc
INSERT INTO user_sessions (user_id, token, ...) 
VALUES (123, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', ...);
```

**Rủi ro:**
1. **DB leak** → attacker lấy được tất cả token → impersonate users
2. **SQL injection** → attacker đọc được token
3. **Backup leak** → token trong file backup bị lộ
4. **Admin abuse** → admin có thể đọc token của user

#### ✅ Lưu hash token

```sql
-- GOOD: Lưu hash
INSERT INTO user_sessions (user_id, token_hash, ...) 
VALUES (123, 'a3f5b8c9d2e1f4a7...', ...);
```

**An toàn hơn:**
1. **DB leak** → attacker chỉ có hash, không dùng được
2. Hash không thể reverse về token gốc
3. Chỉ người có token gốc mới verify được

### So sánh với password hashing

| | Password | Token |
|---|---|---|
| Hash algorithm | bcrypt (slow) | SHA256 (fast) |
| Salt | Có (random per user) | Không cần |
| Lý do khác nhau | Password cần chống brute-force | Token đủ dài + random, không cần salt |

**Password:** `bcrypt` chậm → khó brute-force  
**Token:** SHA256 nhanh → không sao vì token đủ random (JWT signature)

### Ví dụ thực tế

```javascript
// Token 1
const token1 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzfQ.abc123";
const hash1 = sha256(token1);
// → "a3f5b8c9d2e1f4a7b6c5d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0"

// Token 2 (chỉ khác 1 ký tự cuối)
const token2 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzfQ.abc124";
const hash2 = sha256(token2);
// → "7d2e9f1a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0"
```

**Avalanche effect:** Thay đổi 1 bit → hash thay đổi hoàn toàn (~50% bits khác).

### Khi nào cần hash?

✅ **Cần hash:**
- Token (như hệ thống này)
- Password
- API keys
- Session IDs
- Bất kỳ secret nào cần verify nhưng không cần lấy lại

❌ **Không nên hash:**
- User data (email, name) → cần đọc lại
- Encrypted data → cần decrypt
- Dữ liệu cần search → hash không search được

---

## JWT Payload

```javascript
{
  id: 123,           // user_id
  role: 'user',      // 'user' | 'admin'
  iat: 1234567890,   // issued at (tự động)
  exp: 1237159890    // expires (30 ngày sau)
}
```

**Lưu ý:**
- Không chứa `email`, `name`, `picture` → giảm kích thước token
- Nếu cần thông tin user, query DB bằng `req.user.id`

---

## 3 loại route protection

### 1. Public (không cần auth)

```javascript
router.post('/register', register);
router.post('/login', login);
```

### 2. Optional auth (có token thì dùng, không có vẫn OK)

```javascript
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        try {
            await verifyToken(req, res, () => {});
            next();
        } catch (error) {
            next(); // Continue without user
        }
    } else {
        next();
    }
};

router.post('/chat', optionalAuth, chat);
```

**Use case:** Chat stream cho phép guest user, nhưng nếu có token thì lưu history.

### 3. Protected (bắt buộc token)

```javascript
router.get('/profile', verifyToken, getProfile);
router.post('/writing/submit', verifyToken, submitWriting);
```

---

## Error Handling

### 401 Unauthorized
- Token missing
- Token expired (JWT expiry)
- Session expired (DB expiry)
- Session revoked (đã logout)

### 403 Forbidden
- Invalid token signature
- Admin-only route nhưng user không phải admin

### 500 Internal Server Error
- DB connection error
- Unexpected error trong middleware

---

## OAuth Integration

Hệ thống hỗ trợ Google OAuth:

```
1. User click "Login with Google"
2. Redirect đến Google OAuth consent screen
3. Google callback với authorization code
4. Exchange code → access token + user info
5. Upsert user vào DB (find or create)
6. Tạo JWT token + session (giống login thường)
7. Redirect về frontend với token
```

**Code:** `auth.controller.js` → `googleAuth()`, `googleCallback()`

---

## Security Best Practices

### ✅ Đang làm đúng
- Hash token trước khi lưu DB (SHA256)
- Verify cả JWT signature lẫn DB session
- Bcrypt password với salt rounds
- Session expiry trong DB
- CORS configuration
- SQL injection protection (parameterized queries)

### ⚠️ Cần cải thiện
- Chưa có refresh token (token hết hạn sau 30 ngày, user phải login lại)
- Chưa có rate limiting cho login endpoint
- Chưa có device fingerprinting
- Chưa có session management UI (xem/revoke các session đang active)

---

## Environment Variables

```env
JWT_SECRET=your-secret-key-here  # Dùng để sign/verify JWT
```

**Lưu ý:**
- JWT_SECRET phải đủ dài (>= 32 ký tự)
- Không commit vào git
- Rotate định kỳ (nhưng sẽ invalidate tất cả token cũ)

---

## Debugging

### Kiểm tra token có valid không

```bash
# Decode JWT (không verify signature)
echo "eyJhbGc..." | base64 -d

# Hoặc dùng jwt.io
```

### Kiểm tra session trong DB

```sql
SELECT * FROM user_sessions 
WHERE user_id = 123 
AND expires_at > NOW();
```

### Log middleware

Thêm vào `auth.middleware.js`:

```javascript
console.log('Token:', token.substring(0, 20) + '...');
console.log('Decoded:', decoded);
console.log('Session:', session);
```

---

## Files liên quan

- `backend/src/shared/middlewares/auth.middleware.js` - JWT verification logic
- `backend/src/modules/auth/controllers/auth.controller.js` - Login/logout/OAuth
- `backend/src/modules/auth/services/auth.service.js` - Session management
- `backend/src/modules/auth/routes/auth.routes.js` - Auth endpoints
- `db/migrations/*_user_sessions.sql` - Session table schema
