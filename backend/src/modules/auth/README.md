# Module Auth

## Mục đích
Module Auth quản lý xác thực và phân quyền người dùng, hỗ trợ đăng nhập bằng email/password và OAuth (Google).

## Chức năng chính

### 1. Đăng ký (Register)
- Tạo tài khoản mới với email và password
- Mã hóa password bằng bcrypt
- Gửi email xác thực (nếu cấu hình)

### 2. Đăng nhập (Login)
- Đăng nhập bằng email/password
- Đăng nhập bằng Google OAuth
- Tạo JWT token cho session

### 3. Quản lý Token
- Tạo access token và refresh token
- Xác thực token
- Làm mới token khi hết hạn

### 4. Quản lý User
- Tìm user theo ID hoặc email
- Upsert user cho OAuth login
- Cập nhật thông tin user

## Cấu trúc

```
auth/
├── controllers/
│   └── auth.controller.js    # Xử lý HTTP requests
├── routes/
│   └── auth.routes.js        # Định nghĩa API endpoints
└── services/
    └── auth.service.js       # Business logic
```

## API Endpoints

### POST /api/auth/register
Đăng ký tài khoản mới

**Request Body:**
```json
{
  "name": "Nguyen Van A",
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

### POST /api/auth/login
Đăng nhập bằng email/password

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "token": "jwt_access_token",
  "refreshToken": "jwt_refresh_token",
  "user": {
    "id": 1,
    "name": "Nguyen Van A",
    "email": "user@example.com"
  }
}
```

### POST /api/auth/google
Đăng nhập bằng Google OAuth

**Request Body:**
```json
{
  "credential": "google_id_token"
}
```

### POST /api/auth/refresh
Làm mới access token

**Request Body:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

### GET /api/auth/me
Lấy thông tin user hiện tại (yêu cầu authentication)

## Database Schema

### Bảng: users
- `id`: Primary key
- `name`: Tên người dùng
- `email`: Email (unique)
- `password_hash`: Mật khẩu đã mã hóa
- `role`: Vai trò (user, admin)
- `avatar_url`: URL ảnh đại diện
- `email_verified`: Trạng thái xác thực email
- `created_at`: Thời gian tạo
- `updated_at`: Thời gian cập nhật

## Security

### Password Hashing
- Sử dụng bcrypt với salt rounds = 10
- Không lưu password dạng plain text

### JWT Token
- Access token: Hết hạn sau 1 giờ
- Refresh token: Hết hạn sau 7 ngày
- Secret key lưu trong biến môi trường

### OAuth Integration
- Google OAuth 2.0
- Verify ID token từ Google
- Tự động tạo user nếu chưa tồn tại

## Middleware

### authMiddleware
Xác thực JWT token cho các route được bảo vệ

```javascript
import { authMiddleware } from './middleware/auth.js';

router.get('/protected', authMiddleware, controller.method);
```

### roleMiddleware
Kiểm tra quyền truy cập theo role

```javascript
import { roleMiddleware } from './middleware/auth.js';

router.delete('/admin', authMiddleware, roleMiddleware(['admin']), controller.method);
```

## Environment Variables

```env
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your_google_client_id
```

## Sử dụng

```javascript
import authService from './services/auth.service.js';

// Tạo user mới
const user = await authService.createUser({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'password123'
});

// Tìm user
const foundUser = await authService.findUserByEmail('john@example.com');

// Upsert OAuth user
const oauthUser = await authService.upsertUser({
  name: 'Jane Doe',
  email: 'jane@example.com',
  picture: 'https://...'
});
```

## Cải tiến trong tương lai
- Thêm 2FA (Two-Factor Authentication)
- Hỗ trợ thêm OAuth providers (Facebook, GitHub)
- Rate limiting cho login attempts
- Password reset qua email
- Email verification workflow
