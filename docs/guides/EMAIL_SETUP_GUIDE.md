# 📧 Hướng Dẫn Setup Email Service

## Tổng Quan

Đã implement **Nodemailer + Gmail SMTP** để gửi email verification.

**Giới hạn:**
- ✅ **FREE** - Không tốn phí
- ✅ **500 emails/ngày** - Đủ cho development và testing
- ⚠️ **Cần Gmail App Password** - Phải tạo App Password

---

## 🚀 Setup Gmail App Password

### Bước 1: Bật 2-Step Verification

1. Vào [Google Account Security](https://myaccount.google.com/security)
2. Tìm "2-Step Verification" và bật nó
3. Hoàn thành quá trình setup 2-Step Verification

### Bước 2: Tạo App Password

1. Vào [App Passwords](https://myaccount.google.com/apppasswords)
   - Hoặc: Google Account → Security → 2-Step Verification → App passwords
2. Chọn "Mail" và "Other (Custom name)"
3. Nhập tên: "English Chatbot"
4. Click "Generate"
5. **Copy App Password** (16 ký tự, có dấu cách - xóa dấu cách khi dùng)

### Bước 3: Cấu Hình Environment Variables

Thêm vào file `.env` trong thư mục `backend/`:

```env
# Email Service Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_FROM_NAME=English Chatbot
FRONTEND_URL=http://localhost:3000
```

**Lưu ý:**
- `EMAIL_USER`: Email Gmail của bạn
- `EMAIL_PASSWORD`: App Password (16 ký tự, không có dấu cách)
- `FRONTEND_URL`: URL frontend của bạn (để tạo verification link)

---

## ✅ Test Email Service

Sau khi setup, restart backend server và test:

1. Vào Profile Settings
2. Click "📧 Gửi email xác thực"
3. Kiểm tra email inbox
4. Click link trong email để verify

---

## 🔧 Troubleshooting

### Lỗi: "Invalid login"
- ✅ Kiểm tra App Password đã copy đúng chưa (không có dấu cách)
- ✅ Đảm bảo đã bật 2-Step Verification

### Lỗi: "Less secure app access"
- ✅ Gmail không còn hỗ trợ "Less secure apps"
- ✅ **Phải dùng App Password** (không dùng password thường)

### Email không đến
- ✅ Kiểm tra Spam folder
- ✅ Kiểm tra console backend xem có lỗi không
- ✅ Kiểm tra Gmail có block không

### Vượt quá giới hạn
- ⚠️ Gmail giới hạn **500 emails/ngày**
- ✅ Nếu cần nhiều hơn, upgrade lên Resend/SendGrid

---

## 🔄 Upgrade Lên Production Service

Khi cần gửi nhiều email hơn hoặc production, có thể upgrade:

### Option 1: Resend (Khuyên dùng)
- Free: 3,000 emails/tháng
- Setup: Đăng ký tại resend.com, lấy API key
- Update `.env`:
  ```env
  EMAIL_SERVICE=resend
  RESEND_API_KEY=your-api-key
  ```

### Option 2: SendGrid
- Free: 100 emails/ngày
- Setup: Đăng ký tại sendgrid.com

### Option 3: AWS SES
- Free: 62,000 emails/tháng (nếu chạy trên EC2)
- Rất rẻ: $0.10 per 1,000 emails

---

## 📝 Current Implementation

**File:** `backend/services/emailService.js`
- ✅ Support Gmail SMTP
- ✅ Fallback to console log nếu chưa config
- ✅ HTML email template đẹp
- ✅ Error handling

**File:** `backend/controllers/profileController.js`
- ✅ Gọi `sendVerificationEmail()` khi user request verification
- ✅ Fallback URL nếu email service chưa config

---

## 🎯 Next Steps

1. **Setup Gmail App Password** (theo hướng dẫn trên)
2. **Thêm env variables** vào `.env`
3. **Restart backend server**
4. **Test gửi email verification**

Sau khi setup xong, email sẽ được gửi thực sự thay vì chỉ log ra console!

