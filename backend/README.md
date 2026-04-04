# English Chatbot — Backend

Backend API cho hệ thống học tiếng Anh tích hợp AI, hỗ trợ chat, luyện kỹ năng (viết, đọc, nghe, nói), quản lý kiến thức, ví điểm và thanh toán.

---

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Runtime | Node.js (ES Modules) |
| Framework | Express.js |
| Database | PostgreSQL + pgvector |
| AI | OpenAI API (chat, embedding, assessment) |
| Speech | Azure Cognitive Services Speech SDK |
| Auth | JWT + bcrypt + Google OAuth 2.0 |
| File processing | pdf-parse, mammoth, sharp, fluent-ffmpeg |
| Payment | VNPay, MoMo |
| Security | helmet, cors, express-rate-limit |

---

## Cấu trúc module

| Module | Chức năng |
|---|---|
| `auth` | Đăng ký, đăng nhập, logout, Google OAuth, quản lý session |
| `user` | Hồ sơ người dùng, đổi mật khẩu, xuất/nhập dữ liệu |
| `chat` | Chat AI với RAG (Retrieval-Augmented Generation), streaming |
| `knowledge` | Quản lý knowledge base phục vụ RAG |
| `upload` | Upload file: PDF, DOCX, ảnh, audio |
| `writing` | Bài tập viết và chấm điểm AI |
| `reading` | Bài tập đọc hiểu |
| `listening` | Bài tập nghe |
| `speaking` | Luyện nói, chấm điểm phát âm qua Azure Speech |
| `learning` | Lộ trình học có cấu trúc |
| `vocabulary` | Quản lý và luyện từ vựng |
| `wallet` | Ví điểm của người dùng |
| `payment` | Xử lý thanh toán (VNPay, MoMo) |
| `subscription` | Gói đăng ký và quyền truy cập |
| `usage` | Theo dõi lượt sử dụng API/tính năng |
| `analytics` | Ghi nhận và phân tích lỗi hệ thống |
| `settings` | Cài đặt cá nhân của người dùng |

---

## API chính

### Auth

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/auth/register` | Đăng ký tài khoản |
| POST | `/auth/login` | Đăng nhập |
| POST | `/auth/logout` | Đăng xuất |
| GET | `/auth/google` | Bắt đầu Google OAuth |
| GET | `/auth/google/callback` | Callback Google OAuth |
| GET | `/auth/oauth` | Danh sách provider đã liên kết |
| POST | `/auth/oauth/:provider` | Liên kết OAuth provider |
| DELETE | `/auth/oauth/:provider` | Huỷ liên kết OAuth provider |

### Chat

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| POST | `/chat` | Gửi tin nhắn | Tuỳ chọn |
| POST | `/chat/stream` | Chat streaming | Tuỳ chọn |
| GET | `/chat/history` | Lịch sử chat | Bắt buộc |
| DELETE | `/chat/history/:id` | Xoá lịch sử | Bắt buộc |

Các nhóm route khác: `/knowledge`, `/upload`, `/writing`, `/reading`, `/listening`, `/speaking`, `/vocabulary`, `/wallet`, `/payment`, `/subscription`, `/usage`, `/analytics`, `/settings`.

---

## Cơ chế xác thực

- **JWT**: Token truyền qua header `Authorization: Bearer <token>`, hash của token được lưu vào bảng `user_sessions`
- **Session**: Thời hạn 30 ngày, kiểm tra JWT signature + hash trong DB + trạng thái session + user_id
- **Password**: bcrypt với 10 salt rounds
- **OAuth**: Google OAuth 2.0, có thể liên kết/huỷ liên kết với tài khoản hiện có

---

## RAG — Hệ thống chat có ngữ cảnh

Luồng xử lý khi người dùng gửi câu hỏi:

1. Nhận câu hỏi từ người dùng
2. Tìm kiếm knowledge base bằng FULLTEXT + keyword scoring
3. Tính điểm từng context (match từ khóa thường: +1, important keyword: +2)
4. Lấy top N context có điểm cao nhất
5. Gửi context + câu hỏi vào OpenAI để tạo câu trả lời
6. Trả kết quả về client (hoặc stream từng chunk)

---

## Biến môi trường

Tạo file `.env` ở thư mục gốc dự án (cùng cấp với `backend/`):

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=chatbot_user
DB_PASSWORD=your_secure_password
DB_DATABASE=chatbot

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# JWT
JWT_SECRET=your_jwt_secret_minimum_32_characters_long
JWT_EXPIRES_IN=7d
ENCRYPTION_KEY=your_32_character_encryption_key

# OpenAI
OPENAI_API_KEY=sk-proj-XXXXXXXXXXXXXXXX

# Azure Speech
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=southeastasia

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

# Email (tuỳ chọn)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# VNPay
VNPAY_TMN_CODE=your_vnpay_tmn_code
VNPAY_HASH_SECRET=your_vnpay_hash_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
```

---

## Cài đặt & chạy

```bash
# Cài dependencies
npm install

# Chạy development
npm start

# Lint + format
npm run check
```

Server khởi động tại `http://localhost:3001`.

**Thứ tự khởi động:**
1. Load `.env` qua `bootstrap/env.js`
2. Khởi tạo connection pool PostgreSQL
3. Cấu hình Express: helmet, CORS, rate limiting
4. Đăng ký 17 route modules
5. Gắn error handler middleware
6. Listen trên PORT

---

## Docker

```bash
# Build image
docker build -t english-chatbot-backend .

# Chạy container
docker run -p 3001:3001 --env-file .env english-chatbot-backend
```

---

## Rate limiting

| Nhóm | Route áp dụng |
|---|---|
| `authLimiter` | `/auth/login`, `/auth/register` |
| `aiLimiter` | `/chat`, `/writing`, `/reading`, `/listening`, `/speaking` |
| `webhookLimiter` | `/payment/vnpay/ipn`, `/payment/momo/ipn` |

---

## Test

```bash
npm run test:proactive    # Test proactive refresh
npm run test:errors       # Test các tình huống lỗi
npm run test:monitor      # Test monitoring
npm run test:report       # Sinh báo cáo
npm run test:integrity    # Kiểm tra tính toàn vẹn
```
