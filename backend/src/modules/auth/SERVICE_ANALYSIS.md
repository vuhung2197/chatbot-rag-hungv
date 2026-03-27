# PHÂN TÍCH CHI TIẾT - AUTH SERVICE

## Tổng quan
File: `auth.service.js`

Service này quản lý xác thực và phân quyền người dùng, hỗ trợ đăng nhập bằng email/password và OAuth (Google).

---

## Class: AuthService

### 1. findUserById(userId)

**Mục đích**: Tìm người dùng theo ID

**Parameters**:
- `userId` (number): ID người dùng

**Returns**: `Promise<Object|undefined>` - User object hoặc undefined

**SQL Query**:
```sql
SELECT * FROM users WHERE id = ?
```

**Use cases**:
- Verify user existence
- Load user profile
- Check permissions

---

### 2. findUserByEmail(email)

**Mục đích**: Tìm người dùng theo email

**Parameters**:
- `email` (string): Email người dùng

**Returns**: `Promise<Object|undefined>` - User object hoặc undefined

**SQL Query**:
```sql
SELECT * FROM users WHERE email = ?
```

**Use cases**:
- Login validation
- Check email exists (registration)
- Password reset

---

### 3. createUser({ name, email, password, role, picture, emailVerified })

**Mục đích**: Tạo người dùng mới

**Parameters**:
```javascript
{
  name: string,              // Tên người dùng (bắt buộc)
  email: string,             // Email (bắt buộc)
  password: string,          // Password (optional cho OAuth)
  role: string,              // Vai trò (mặc định: 'user')
  picture: string,           // Avatar URL (optional)
  emailVerified: boolean     // Đã verify email chưa (mặc định: false)
}
```

**Returns**: `Promise<Object>` - User vừa tạo (chỉ có id)

**Logic xử lý**:
1. Nếu có password:
   - Hash password bằng bcrypt với salt rounds = 10
2. Nếu không có password (OAuth user):
   - Set passwordHash = '' (empty string)
3. Insert vào database
4. Return user với id

**SQL Query**:
```sql
INSERT INTO users (name, email, password_hash, role, avatar_url, email_verified)
VALUES (?, ?, ?, ?, ?, ?)
RETURNING id
```

**Security**:
- Password được hash bằng bcrypt
- Salt rounds = 10 (balance giữa security và performance)
- Không bao giờ lưu plain text password

**Ví dụ**:
```javascript
// Email/Password registration
const user = await authService.createUser({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'SecurePass123',
  role: 'user'
});

// OAuth registration (no password)
const oauthUser = await authService.createUser({
  name: 'Jane Doe',
  email: 'jane@example.com',
  password: null,
  picture: 'https://...',
  emailVerified: true
});
```

---

### 4. upsertUser({ name, email, picture })

**Mục đích**: Tìm hoặc tạo user cho OAuth login

**Parameters**:
```javascript
{
  name: string,      // Tên từ OAuth provider
  email: string,     // Email từ OAuth provider
  picture: string    // Avatar URL từ OAuth provider
}
```

**Returns**: `Promise<Object>` - User object (existing hoặc mới tạo)

**Logic xử lý**:
1. Thử insert user mới với:
   - password_hash = '' (empty)
   - role = 'user'
   - email_verified = true
   - avatar_url = picture
   - last_login_at = NOW()
2. Nếu email đã tồn tại (CONFLICT):
   - Update last_login_at = NOW()
   - Update avatar_url nếu chưa có
3. Return user

**SQL Query**:
```sql
INSERT INTO users (name, email, password_hash, role, email_verified, avatar_url, last_login_at)
VALUES (?, ?, '', 'user', ?, ?, CURRENT_TIMESTAMP)
ON CONFLICT (email)
DO UPDATE SET
  last_login_at = CURRENT_TIMESTAMP,
  avatar_url = CASE
    WHEN users.avatar_url IS NULL OR users.avatar_url = ''
    THEN EXCLUDED.avatar_url
    ELSE users.avatar_url
  END
RETURNING *
```

**Giải thích ON CONFLICT**:
- Nếu email chưa tồn tại → tạo user mới
- Nếu email đã tồn tại → update last_login_at
- Avatar chỉ update nếu user chưa có avatar (không overwrite avatar tùy chỉnh)

**Use cases**:
- Google OAuth login
- Facebook OAuth login
- Bất kỳ OAuth provider nào

---

### 5. createSession(userId, token, { userAgent, ip })

**Mục đích**: Tạo session cho user sau khi login

**Parameters**:
```javascript
{
  userId: number,
  token: string,           // JWT token
  userAgent: string,       // Browser/device info
  ip: string              // IP address
}
```

**Returns**: `Promise<void>`

**Logic xử lý**:
1. Hash token bằng SHA256 (không lưu plain token)
2. Tính expires_at = NOW() + 30 days
3. Extract device info từ userAgent
4. Insert session vào database

**SQL Query**:
```sql
INSERT INTO user_sessions (user_id, token_hash, device_info, ip_address, user_agent, expires_at)
VALUES (?, ?, ?, ?, ?, ?)
```

**Security**:
- Token được hash trước khi lưu
- Không lưu plain token trong database
- Session tự động expire sau 30 ngày

**Ví dụ**:
```javascript
const token = jwt.sign({ userId }, JWT_SECRET);
await authService.createSession(userId, token, {
  userAgent: req.headers['user-agent'],
  ip: req.ip
});
```

---

### 6. deleteSession(sessionId, userId)

**Mục đích**: Xóa session (logout)

**Parameters**:
- `sessionId` (string): ID của session
- `userId` (number): ID người dùng (để verify ownership)

**Returns**: `Promise<void>`

**SQL Query**:
```sql
DELETE FROM user_sessions
WHERE id = ? AND user_id = ?
```

**Security**:
- Verify userId để đảm bảo user chỉ xóa session của mình
- Không cho phép xóa session của người khác

---

### 7. findOAuthLink(provider, providerUserId)

**Mục đích**: Tìm OAuth link đã tồn tại

**Parameters**:
- `provider` (string): Tên provider ('google', 'facebook')
- `providerUserId` (string): User ID từ provider

**Returns**: `Promise<Object|undefined>` - OAuth link hoặc undefined

**SQL Query**:
```sql
SELECT user_id FROM user_oauth_providers
WHERE provider = ? AND provider_user_id = ?
```

**Use cases**:
- Check user đã link OAuth chưa
- Login bằng OAuth

---

### 8. isUserLinkedToProvider(userId, provider)

**Mục đích**: Kiểm tra user đã link provider chưa

**Parameters**:
- `userId` (number): ID người dùng
- `provider` (string): Tên provider

**Returns**: `Promise<boolean>` - true nếu đã link

**SQL Query**:
```sql
SELECT * FROM user_oauth_providers
WHERE user_id = ? AND provider = ?
```

---

### 9. linkOAuthProvider({ userId, provider, providerUserId, email, tokens })

**Mục đích**: Link OAuth provider với user account

**Parameters**:
```javascript
{
  userId: number,
  provider: string,           // 'google', 'facebook'
  providerUserId: string,     // User ID từ provider
  email: string,              // Email từ provider
  tokens: {
    access_token: string,
    refresh_token: string     // optional
  }
}
```

**Returns**: `Promise<void>`

**Logic xử lý**:
1. Encrypt tokens bằng base64 (simple encryption)
2. Check user đã link provider chưa
3. Nếu đã link → UPDATE tokens
4. Nếu chưa link → INSERT new link

**SQL Queries**:
```sql
-- Update existing link
UPDATE user_oauth_providers
SET provider_user_id = ?, provider_email = ?,
    access_token_encrypted = ?, refresh_token_encrypted = ?,
    updated_at = CURRENT_TIMESTAMP
WHERE user_id = ? AND provider = ?

-- Insert new link
INSERT INTO user_oauth_providers
(user_id, provider, provider_user_id, provider_email,
 access_token_encrypted, refresh_token_encrypted)
VALUES (?, ?, ?, ?, ?, ?)
```

**Security**:
- Tokens được encrypt trước khi lưu
- Sử dụng base64 encoding (nên nâng cấp lên AES trong production)

---

### 10. unlinkOAuthProvider(userId, provider)

**Mục đích**: Unlink OAuth provider

**Parameters**:
- `userId` (number): ID người dùng
- `provider` (string): Tên provider

**Returns**: `Promise<void>`

**SQL Query**:
```sql
DELETE FROM user_oauth_providers
WHERE user_id = ? AND provider = ?
```

**Use cases**:
- User muốn unlink Google account
- Security: revoke access

---

### 11. getLinkedProviders(userId)

**Mục đích**: Lấy danh sách providers đã link

**Parameters**:
- `userId` (number): ID người dùng

**Returns**: `Promise<Array>` - Danh sách providers

**Return format**:
```javascript
[
  {
    provider: 'google',
    provider_email: 'user@gmail.com',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-03-27T10:00:00Z'
  }
]
```

**SQL Query**:
```sql
SELECT provider, provider_email, created_at, updated_at
FROM user_oauth_providers
WHERE user_id = ?
```

---

### 12. countAuthMethods(userId)

**Mục đích**: Đếm số phương thức đăng nhập của user

**Parameters**:
- `userId` (number): ID người dùng

**Returns**: `Promise<Object>` - Thống kê auth methods

**Return format**:
```javascript
{
  hasPassword: true,      // Có password không
  oauthCount: 2,         // Số OAuth providers
  total: 3               // Tổng số methods
}
```

**Logic xử lý**:
1. Check user có password không (password_hash != '')
2. Đếm số OAuth providers đã link
3. Tính total = hasPassword + oauthCount

**Use cases**:
- Prevent user từ xóa method cuối cùng
- Hiển thị security settings

**Ví dụ**:
```javascript
const methods = await authService.countAuthMethods(userId);

if (methods.total === 1) {
  throw new Error('Cannot remove last auth method');
}
```

---

### 13. createWalletIfNotExists(userId)

**Mục đích**: Tạo ví cho user nếu chưa có

**Parameters**:
- `userId` (number): ID người dùng

**Returns**: `Promise<void>`

**Logic xử lý**:
1. Check user đã có wallet chưa
2. Nếu chưa có → tạo wallet mới với:
   - balance = 0.00
   - currency = 'USD'
   - status = 'active'
3. Catch error nhưng không throw (silent fail)

**SQL Queries**:
```sql
-- Check existing wallet
SELECT id FROM user_wallets WHERE user_id = ?

-- Create wallet
INSERT INTO user_wallets (user_id, balance, currency, status)
VALUES (?, 0.00, 'USD', 'active')
```

**Use cases**:
- Gọi sau khi tạo user mới
- Ensure user có wallet để thanh toán

---

## Authentication Flow

### Email/Password Login
```
1. User submits email + password
2. findUserByEmail(email)
3. bcrypt.compare(password, user.password_hash)
4. If match:
   - Generate JWT token
   - createSession(userId, token, { userAgent, ip })
   - Return token to client
5. If not match:
   - Return error
```

### OAuth Login (Google)
```
1. User clicks "Login with Google"
2. Redirect to Google OAuth
3. Google returns with code
4. Exchange code for tokens + user info
5. findOAuthLink(provider, providerUserId)
6. If link exists:
   - Get userId from link
   - upsertUser() to update last_login
7. If link not exists:
   - upsertUser() to create/find user
   - linkOAuthProvider() to create link
8. Generate JWT token
9. createSession(userId, token, { userAgent, ip })
10. Return token to client
```

---

## Security Best Practices

### 1. Password Hashing
```javascript
// GOOD: Use bcrypt with salt rounds = 10
const hash = await bcrypt.hash(password, 10);

// BAD: Plain text or weak hashing
const hash = crypto.createHash('md5').update(password).digest('hex');
```

### 2. Token Storage
```javascript
// GOOD: Hash token before storing
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

// BAD: Store plain token
await saveToken(token);
```

### 3. Session Management
```javascript
// GOOD: Verify ownership before deleting
await deleteSession(sessionId, userId);

// BAD: Delete without verification
await deleteSession(sessionId);
```

### 4. OAuth Token Encryption
```javascript
// CURRENT: Base64 encoding (better than nothing)
const encrypted = Buffer.from(token).toString('base64');

// RECOMMENDED: AES encryption
const encrypted = crypto.encrypt(token, SECRET_KEY);
```

---

## Database Schema

### users table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### user_sessions table
```sql
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  token_hash VARCHAR(255) NOT NULL,
  device_info TEXT,
  ip_address VARCHAR(50),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### user_oauth_providers table
```sql
CREATE TABLE user_oauth_providers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  provider VARCHAR(50) NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  provider_email VARCHAR(255),
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, provider)
);
```

---

## Error Handling

### Common Errors
```javascript
// User not found
if (!user) {
  throw new Error('User not found');
}

// Invalid credentials
if (!await bcrypt.compare(password, user.password_hash)) {
  throw new Error('Invalid credentials');
}

// Email already exists
if (await findUserByEmail(email)) {
  throw new Error('Email already exists');
}

// Cannot remove last auth method
const methods = await countAuthMethods(userId);
if (methods.total === 1) {
  throw new Error('Cannot remove last authentication method');
}
```

---

## Cải tiến trong tương lai

1. **2FA (Two-Factor Authentication)**: SMS/TOTP
2. **More OAuth Providers**: Facebook, GitHub, Apple
3. **Password Reset**: Email-based reset flow
4. **Email Verification**: Verify email after registration
5. **Rate Limiting**: Prevent brute force attacks
6. **Session Management**: View/revoke all sessions
7. **Security Logs**: Track login attempts, IP changes
8. **AES Encryption**: Upgrade from base64 to AES for tokens
