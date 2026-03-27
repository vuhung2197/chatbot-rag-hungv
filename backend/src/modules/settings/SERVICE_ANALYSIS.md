# Settings Module - Service Analysis

## Tổng quan
Module Settings quản lý cấu hình hệ thống thông qua file .env. Module này cho phép admin cập nhật các biến môi trường (API keys, database config, payment config) mà không cần restart server.

## Kiến trúc
- **Không có Service File riêng**: Logic nằm trong controller
- **Direct File Manipulation**: Đọc/ghi trực tiếp file .env
- **Hot Reload**: Cập nhật process.env runtime
- **Public/Private Keys**: Phân quyền truy cập theo role

---

## Controller Functions (settings.controller.js)

### 1. getPublicEnvKeys()
**Mục đích**: Lấy các biến môi trường public (không cần authentication)

**Public Keys**:
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET

**Logic Flow**:
1. Parse file .env
2. Lọc chỉ lấy PUBLIC_KEYS
3. Trả về object với giá trị (hoặc empty string)

**Code Example**:
```javascript
// GET /api/settings/public
// Response:
{
  "GOOGLE_CLIENT_ID": "123456.apps.googleusercontent.com",
  "GOOGLE_CLIENT_SECRET": "GOCSPX-abc123"
}
```

**Use Case**: Frontend cần Google OAuth config trước khi user login

---

### 2. updatePublicEnvKeys()
**Mục đích**: Cập nhật public env keys (admin only)

**Logic Flow**:
1. Validate keys thuộc PUBLIC_KEYS
2. Cập nhật process.env runtime
3. Cập nhật file .env
4. Không cần restart server

**Code Example**:
```javascript
// PUT /api/settings/public
// Body:
{
  "GOOGLE_CLIENT_ID": "new-client-id.apps.googleusercontent.com"
}
```

---

### 3. getEnvKeys()
**Mục đích**: Lấy tất cả biến môi trường (admin only)

**All Config Keys** (26 keys):
```javascript
// Public/OAuth
'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',

// AI/Search
'OPENAI_API_KEY', 'TAVILY_API_KEY',

// Database
'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_DATABASE',

// Core/Auth
'JWT_SECRET', 'HMAC_KEY', 'FRONTEND_URL', 'PORT',

// Email
'EMAIL_SERVICE', 'EMAIL_USER', 'EMAIL_PASSWORD', 'EMAIL_FROM_NAME',

// Payment: VNPay
'VNPAY_TMN_CODE', 'VNPAY_HASH_SECRET', 'VNPAY_URL', 'VNPAY_RETURN_URL',

// Payment: MoMo
'MOMO_PARTNER_CODE', 'MOMO_ACCESS_KEY', 'MOMO_SECRET_KEY',
'MOMO_ENDPOINT', 'MOMO_REDIRECT_URL', 'MOMO_IPN_URL'
```

**Response Example**:
```json
{
  "OPENAI_API_KEY": "sk-proj-...",
  "DB_HOST": "localhost",
  "DB_PORT": "5432",
  "JWT_SECRET": "your-secret-key",
  ...
}
```

---

### 4. updateEnvKeys()
**Mục đích**: Cập nhật bất kỳ env key nào (admin only)

**Logic Flow**:
1. Đọc file .env hiện tại
2. Parse thành array of lines
3. Với mỗi key trong request body:
   - Validate key thuộc CONFIG_KEYS
   - Cập nhật process.env[key] runtime
   - Tìm và replace line trong file (hoặc append nếu chưa có)
4. Ghi lại file .env
5. Cleanup empty lines ở cuối file

**Code Example**:
```javascript
// PUT /api/settings
// Body:
{
  "OPENAI_API_KEY": "sk-proj-new-key",
  "TAVILY_API_KEY": "tvly-new-key",
  "DB_PASSWORD": "new-password"
}

// Response:
{
  "message": "Environment variables updated successfully"
}
```

**File Operations**:
```javascript
// Before:
OPENAI_API_KEY=sk-proj-old
DB_HOST=localhost
DB_PORT=5432

// After update with { "OPENAI_API_KEY": "sk-proj-new", "DB_PASSWORD": "secret" }:
OPENAI_API_KEY=sk-proj-new
DB_HOST=localhost
DB_PORT=5432
DB_PASSWORD=secret
```

---

## Helper Functions

### parseEnvFile()
**Mục đích**: Parse file .env thành object

**Logic**:
1. Đọc file .env
2. Split theo newline
3. Bỏ qua comments (#) và empty lines
4. Parse theo format KEY=VALUE
5. Trim whitespace

**Code Example**:
```javascript
// File .env:
# Database config
DB_HOST=localhost
DB_PORT=5432

// Parsed:
{
  "DB_HOST": "localhost",
  "DB_PORT": "5432"
}
```

---

### handleEnvUpdate()
**Mục đích**: Xử lý logic update env keys (shared helper)

**Parameters**:
- `req.body`: Object chứa key-value cần update
- `allowedKeys`: Array các keys được phép update

**Logic Flow**:
1. Validate keys thuộc allowedKeys
2. Update process.env runtime (hot reload)
3. Update file content:
   - Tìm line có key (regex: `^KEY=.*$`)
   - Replace nếu tồn tại
   - Append nếu chưa có
4. Cleanup trailing empty lines
5. Write file với newline ở cuối

**Security**:
- Chỉ cho phép update keys trong allowedKeys
- Ignore keys không hợp lệ (không throw error)

---

## Best Practices

### Security
1. **Role-Based Access**: Public keys cho tất cả, full keys chỉ cho admin
2. **Whitelist Validation**: Chỉ cho phép update keys trong CONFIG_KEYS
3. **No Secrets in Response**: Trả về empty string nếu key không tồn tại
4. **File Permissions**: .env file nên có permissions 600 (owner read/write only)

### Performance
1. **Hot Reload**: Cập nhật process.env runtime, không cần restart
2. **Atomic Write**: Đọc toàn bộ file, modify, rồi write một lần
3. **No Database**: Không cần query database, chỉ file I/O

### Reliability
1. **Create if Not Exists**: Tự động tạo .env nếu chưa có
2. **Preserve Comments**: Giữ nguyên comments trong file
3. **Cleanup Empty Lines**: Xóa trailing empty lines
4. **Error Handling**: Try-catch và trả về 500 nếu lỗi

---

## Security Considerations

### Critical
1. **Admin Only**: Tất cả endpoints (trừ getPublicEnvKeys) phải require admin role
2. **Sensitive Keys**: JWT_SECRET, DB_PASSWORD, API keys không được expose qua public endpoint
3. **File Path Validation**: ENV_PATH phải được resolve an toàn
4. **Backup**: Nên backup .env trước khi update

### Recommendations
1. **Audit Log**: Ghi log mỗi lần update env keys (ai, khi nào, key nào)
2. **Validation**: Validate format của values (email, URL, port number)
3. **Encryption**: Encrypt sensitive values trong .env
4. **Version Control**: .env không được commit vào git (.gitignore)

---

## Future Improvements

1. **Validation Rules**: Validate format cho từng key type
   - Email: EMAIL_USER phải là email hợp lệ
   - URL: FRONTEND_URL, VNPAY_URL phải là URL hợp lệ
   - Port: DB_PORT, PORT phải là số 1-65535
   - API Key: Validate format của OpenAI, Tavily keys

2. **Backup System**: Tự động backup .env trước mỗi update
   ```javascript
   fs.copyFileSync('.env', `.env.backup.${Date.now()}`);
   ```

3. **Audit Trail**: Log tất cả changes
   ```sql
   INSERT INTO env_changes (user_id, key, old_value, new_value, changed_at)
   VALUES (?, ?, ?, ?, NOW())
   ```

4. **Test Connection**: Test config sau khi update
   - Database: Test connection với DB_* mới
   - Email: Send test email với EMAIL_* mới
   - Payment: Test API với VNPAY_*/MOMO_* mới

5. **Rollback**: Cho phép rollback về version trước
   ```javascript
   POST /api/settings/rollback
   { "timestamp": 1234567890 }
   ```

6. **Environment Profiles**: Hỗ trợ nhiều profiles (.env.dev, .env.prod)

7. **Secret Management**: Tích hợp với HashiCorp Vault hoặc AWS Secrets Manager

8. **Real-time Sync**: WebSocket để notify tất cả server instances khi config thay đổi (cho multi-server setup)

---

## Usage Examples

### Frontend Integration
```javascript
// 1. Get public config (no auth)
const publicConfig = await fetch('/api/settings/public').then(r => r.json());
// Use for Google OAuth button

// 2. Admin: Get all config
const allConfig = await fetch('/api/settings', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
}).then(r => r.json());

// 3. Admin: Update config
await fetch('/api/settings', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    OPENAI_API_KEY: 'sk-proj-new-key',
    TAVILY_API_KEY: 'tvly-new-key'
  })
});
```

### Testing
```javascript
// Test hot reload
console.log('Before:', process.env.OPENAI_API_KEY);
await updateEnvKeys({ OPENAI_API_KEY: 'new-key' });
console.log('After:', process.env.OPENAI_API_KEY); // Should be 'new-key'
```
