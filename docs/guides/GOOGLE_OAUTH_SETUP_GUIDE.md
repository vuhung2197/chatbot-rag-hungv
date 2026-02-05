# 🔐 Hướng Dẫn Setup Google OAuth Login

## Tổng Quan

Google OAuth cho phép người dùng đăng nhập bằng tài khoản Google của họ. Bất kỳ tài khoản Google nào cũng có thể đăng nhập, không chỉ tài khoản của bạn.

## Bước 1: Tạo OAuth Application trong Google Cloud Console

### 1.1. Truy cập Google Cloud Console

1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Đăng nhập bằng tài khoản Google của bạn (bất kỳ tài khoản nào)
3. Chọn project hoặc tạo project mới:
   - Click vào dropdown project ở top bar
   - Click "New Project"
   - Đặt tên project (ví dụ: "English Chatbot")
   - Click "Create"

### 1.2. Enable Google Identity API

1. Vào **APIs & Services** > **Library**
2. Tìm "Google Identity" hoặc "Google+ API"
3. Click vào và chọn **Enable**

### 1.3. Configure OAuth Consent Screen

1. Vào **APIs & Services** > **OAuth consent screen**
2. Chọn **External** (cho development) hoặc **Internal** (chỉ cho G Suite)
3. Điền thông tin:
   - **App name**: English Chatbot (hoặc tên bạn muốn)
   - **User support email**: Email của bạn
   - **Developer contact information**: Email của bạn
4. Click **Save and Continue**
5. Ở màn hình **Scopes**, click **Save and Continue** (không cần thêm scope)
6. Ở màn hình **Test users** (nếu chọn External), có thể bỏ qua
7. Click **Back to Dashboard**

### 1.4. Tạo OAuth 2.0 Client ID

1. Vào **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Chọn **Application type**: **Web application**
4. Đặt tên (ví dụ: "English Chatbot Web Client")
5. **Authorized JavaScript origins** (nếu cần):
   - `http://localhost:3000` (frontend)
   - `http://localhost:3001` (backend)
6. **Authorized redirect URIs** (QUAN TRỌNG):
   - `http://localhost:3001/auth/google/callback` (cho development)
   - Nếu deploy production, thêm: `https://yourdomain.com/auth/google/callback`
7. Click **Create**
8. **SAVE LẠI** Client ID và Client Secret (bạn sẽ không thấy secret lần nữa!)

## Bước 2: Cấu Hình Environment Variables

Thêm vào file `.env` trong thư mục `backend/`:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001

# JWT Secret (nếu chưa có)
JWT_SECRET=your_jwt_secret_here

# HMAC Key for CSRF protection (optional, có default)
HMAC_KEY=your_32_byte_hex_key_here
```

### Generate HMAC_KEY (Optional)

Nếu muốn tạo HMAC_KEY riêng:

```bash
# Trong Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Bước 3: Kiểm Tra

### 3.1. Restart Backend Server

```bash
cd backend
npm start
```

### 3.2. Test Login

1. Mở frontend: `http://localhost:3000`
2. Click "Đăng nhập bằng Google"
3. Chọn tài khoản Google (bất kỳ tài khoản nào)
4. Cho phép ứng dụng truy cập
5. Bạn sẽ được redirect về và đăng nhập tự động

## FAQ

### Q: Tôi có cần dùng tài khoản Google của mình để tạo OAuth app không?

**A:** KHÔNG. Bạn chỉ cần một tài khoản Google để tạo OAuth application trong Google Cloud Console. Sau đó, BẤT KỲ tài khoản Google nào cũng có thể đăng nhập.

### Q: Tại sao tôi không thể login?

**A:** Kiểm tra:
1. ✅ OAuth app đã được tạo chưa?
2. ✅ Redirect URI đã đúng chưa? (`http://localhost:3001/auth/google/callback`)
3. ✅ Environment variables đã được set chưa?
4. ✅ Backend server đã restart chưa?
5. ✅ Xem backend console logs để debug

### Q: Tôi có thể dùng nhiều tài khoản Google để login không?

**A:** CÓ. Bất kỳ tài khoản Google nào cũng có thể đăng nhập. Mỗi tài khoản sẽ tạo một user riêng trong database.

### Q: Tôi muốn chỉ cho phép một số email nhất định login?

**A:** Bạn có thể thêm validation trong `googleCallback` function:

```javascript
// Chỉ cho phép email từ domain cụ thể
const allowedDomains = ['@yourcompany.com'];
if (!allowedDomains.some(domain => email.endsWith(domain))) {
  return res.redirect(`${frontendUrl}?error=unauthorized_domain`);
}
```

### Q: Production setup khác gì?

**A:** 
1. Thay đổi Redirect URI trong Google Cloud Console thành production URL
2. Update `FRONTEND_URL` và `BACKEND_URL` trong `.env`
3. Đảm bảo OAuth consent screen đã được verify (nếu cần)
4. Sử dụng HTTPS cho production

## Troubleshooting

### Lỗi: "redirect_uri_mismatch"

**Giải pháp:** Kiểm tra Redirect URI trong Google Cloud Console phải khớp chính xác với URL trong code:
- Code: `http://localhost:3001/auth/google/callback`
- Google Console: Phải có `http://localhost:3001/auth/google/callback`

### Lỗi: "CSRF verification failed"

**Giải pháp:** 
- Kiểm tra cookies có được gửi không (xem Network tab)
- Kiểm tra CORS settings đã cho phép credentials chưa
- Xem backend logs để biết chi tiết

### Lỗi: "No oauth_state cookie found"

**Giải pháp:**
- Kiểm tra CORS đã set `credentials: true` chưa
- Kiểm tra cookie settings trong `cookieState.js`
- Đảm bảo frontend và backend cùng domain hoặc CORS đã được config đúng

## Security Notes

1. **KHÔNG commit** `.env` file vào git
2. **KHÔNG share** Client Secret
3. Sử dụng HTTPS cho production
4. Set `HMAC_KEY` riêng cho production
5. Review OAuth scopes - chỉ request những gì cần thiết

---

**Tóm lại:** `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET` là credentials của OAuth Application, KHÔNG phải của tài khoản Google cá nhân. Bất kỳ tài khoản Google nào cũng có thể đăng nhập qua ứng dụng này.

