# Module User

## Mục đích
Module User quản lý thông tin người dùng, profile, session, password và chức năng export/import dữ liệu cá nhân.

## Chức năng chính

### 1. Quản lý Profile
- Xem thông tin cá nhân
- Cập nhật profile (tên, avatar, timezone, language)
- Quản lý preferences

### 2. Quản lý Password
- Đổi mật khẩu
- Reset password qua email
- Xác thực password cũ

### 3. Quản lý Session
- Xem danh sách session đang hoạt động
- Đăng xuất session cụ thể
- Đăng xuất tất cả session

### 4. Export/Import Data
- Export toàn bộ dữ liệu cá nhân (GDPR compliance)
- Import dữ liệu từ backup
- Bao gồm: vocabulary, submissions, progress

## Cấu trúc

```
user/
├── controllers/
│   ├── user.controller.js           # Quản lý user
│   ├── password.controller.js       # Quản lý password
│   ├── session.controller.js        # Quản lý session
│   └── export-import.controller.js  # Export/Import
├── routes/
│   ├── user.routes.js
│   ├── password.routes.js
│   ├── session.routes.js
│   └── export-import.routes.js
└── services/
    ├── password.service.js
    └── export-import.service.js
```

## API Endpoints

### GET /api/users/me
Lấy thông tin user hiện tại

### PUT /api/users/me
Cập nhật profile

**Request Body:**
```json
{
  "name": "Nguyen Van A",
  "timezone": "Asia/Ho_Chi_Minh",
  "language": "vi"
}
```

### POST /api/users/avatar
Upload avatar mới

### POST /api/users/password/change
Đổi mật khẩu

**Request Body:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

### POST /api/users/password/reset-request
Yêu cầu reset password

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### POST /api/users/password/reset
Reset password với token

**Request Body:**
```json
{
  "token": "reset_token",
  "newPassword": "new_password"
}
```

### GET /api/users/sessions
Lấy danh sách session

### DELETE /api/users/sessions/:id
Đăng xuất session cụ thể

### DELETE /api/users/sessions
Đăng xuất tất cả session

### GET /api/users/export
Export dữ liệu cá nhân

**Response:** File JSON chứa toàn bộ dữ liệu

### POST /api/users/import
Import dữ liệu từ backup

## Database Schema

### Bảng: users
- `id`: Primary key
- `name`: Tên người dùng
- `email`: Email (unique)
- `password_hash`: Mật khẩu đã mã hóa
- `role`: Vai trò (user, admin)
- `avatar_url`: URL ảnh đại diện
- `timezone`: Múi giờ
- `language`: Ngôn ngữ (vi, en)
- `email_verified`: Trạng thái xác thực
- `created_at`: Thời gian tạo
- `updated_at`: Thời gian cập nhật

### Bảng: user_sessions
- `id`: Primary key
- `user_id`: ID người dùng
- `token`: Session token
- `device_info`: Thông tin thiết bị
- `ip_address`: Địa chỉ IP
- `last_activity`: Hoạt động cuối
- `expires_at`: Thời gian hết hạn
- `created_at`: Thời gian tạo

### Bảng: password_reset_tokens
- `id`: Primary key
- `user_id`: ID người dùng
- `token`: Reset token
- `expires_at`: Thời gian hết hạn
- `used`: Đã sử dụng chưa
- `created_at`: Thời gian tạo

## Export Data Format

```json
{
  "user": {
    "name": "Nguyen Van A",
    "email": "user@example.com",
    "timezone": "Asia/Ho_Chi_Minh",
    "language": "vi"
  },
  "vocabulary": [
    {
      "word": "hello",
      "definition": "a greeting",
      "mastery": 5,
      "review_count": 10
    }
  ],
  "listening_submissions": [...],
  "reading_submissions": [...],
  "speaking_submissions": [...],
  "writing_submissions": [...],
  "exported_at": "2026-03-27T10:00:00Z"
}
```

## Security

### Password Management
- Minimum 8 characters
- Require current password for change
- Rate limiting on reset requests
- Token expires after 1 hour

### Session Management
- JWT-based sessions
- Device fingerprinting
- IP tracking
- Auto-logout after inactivity

### Data Privacy
- GDPR compliant export
- Encrypted sensitive data
- Audit log for data access

## Sử dụng

```javascript
import exportImportService from './services/export-import.service.js';

// Export dữ liệu
const userData = await exportImportService.exportUserData(userId);

// Import dữ liệu
await exportImportService.importUserData(userId, backupData);
```

## Cải tiến trong tương lai
- Multi-factor authentication
- Social login linking
- Activity log viewer
- Data portability to other platforms
- Scheduled auto-export
