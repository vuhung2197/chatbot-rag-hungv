# Tài liệu Module Auth (Xác thực)

## 1. Tổng quan
**Module Auth** chịu trách nhiệm quản lý danh tính người dùng, xác thực, phiên đăng nhập và bảo mật. Module này hỗ trợ cả đăng nhập truyền thống bằng email/mật khẩu và tích hợp OAuth (Đăng nhập mạng xã hội). Ngoài ra, nó cũng xử lý việc khởi tạo các thực thể liên quan đến người dùng như ví (wallet) ngay khi đăng ký.

## 2. Các thành phần chính

### 2.1 Backend (`backend/src/modules/auth`)
- **`AuthService`**: Chứa logic cốt lõi về băm mật khẩu (hashing), tạo token và tương tác với cơ sở dữ liệu (DB).
- **Bảng Database**: `users` (người dùng), `user_sessions` (phiên đăng nhập), `user_oauth_providers` (liên kết MXH).

### 2.2 Frontend (`frontend/src/features/auth`)
- **`Login.js`**: Form đăng nhập tiêu chuẩn.
- **`Register.js`**: Form đăng ký người dùng.
- **`OAuthProviders.js`**: Các nút và logic đăng nhập Google/Facebook.
- **`VerifyEmailPage.js`**: Xử lý token xác thực email từ URL.

## 3. Phân tích kỹ thuật

### 3.1 Đăng ký người dùng (`createUser`)
1.  **Băm mật khẩu (Password Hashing)**: Nếu người dùng cung cấp mật khẩu, nó sẽ được băm bằng `bcrypt` (salt rounds: 10).
2.  **Tạo người dùng**: Chèn bản ghi người dùng mới vào bảng `users`.
3.  **Gán quyền (Role)**: Quyền mặc định là 'user'.

### 3.2 Luồng OAuth (`upsertUser`, `linkOAuthProvider`)
1.  **Logic Upsert (Cập nhật hoặc Chèn)**: Khi người dùng đăng nhập qua OAuth:
    - Nếu email đã tồn tại: Cập nhật `last_login_at` và `avatar_url`.
    - Nếu chưa: Tạo người dùng mới với mật khẩu trống.
2.  **Liên kết nhà cung cấp**: Lưu ID và token đặc thù của nhà cung cấp (đã mã hóa) vào bảng `user_oauth_providers`.

### 3.3 Quản lý phiên (Session Management)
- **Lưu trữ Token**: Token phiên được **băm** (SHA-256) trước khi lưu vào `user_sessions`. Điều này đảm bảo rằng ngay cả khi DB bị lộ, các token đang hoạt động cũng không thể bị đánh cắp dễ dàng.
- **Hết hạn**: Các phiên mặc định tồn tại trong 30 ngày.
- **Thông tin thiết bị**: Ghi lại User-Agent và địa chỉ IP để kiểm tra bảo mật.

### 3.4 Tích hợp Ví (Wallet)
- **Tự động tạo**: Ngay sau khi đăng ký thành công hoặc đăng nhập lần đầu, hàm `createWalletIfNotExists` được gọi để đảm bảo mọi người dùng đều có một ví USD được khởi tạo với số dư 0.00.

## 4. Hướng dẫn sử dụng

### Đăng ký
```javascript
const newUser = await authService.createUser({
    name: "John Doe",
    email: "john@example.com",
    password: "securePassword123"
});
```

### Tạo phiên làm việc
```javascript
// Tạo token (ví dụ: JWT hoặc chuỗi ngẫu nhiên)
const token = generateToken(); 
await authService.createSession(user.id, token, {
    userAgent: req.headers['user-agent'],
    ip: req.ip
});
```

### Xử lý OAuth
```javascript
// Xử lý dữ liệu từ Google/Facebook
const user = await authService.upsertUser({
    name: profile.displayName,
    email: profile.emails[0].value,
    picture: profile.photos[0].value
});
```
