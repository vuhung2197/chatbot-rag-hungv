# 🪟 Hướng dẫn cài đặt dự án English Chatbot trên Windows

> Tài liệu này dành cho người **không có kiến thức lập trình**. Mọi bước đều được hướng dẫn chi tiết từ A-Z.

---

## 📋 Mục lục
1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Cài đặt các công cụ cần thiết](#2-cài-đặt-các-công-cụ-cần-thiết)
3. [Tải mã nguồn dự án](#3-tải-mã-nguồn-dự-án)
4. [Khởi chạy dự án bằng Docker (Cách dễ nhất)](#4-khởi-chạy-dự-án-bằng-docker-cách-dễ-nhất)
5. [Khởi chạy dự án thủ công (Không dùng Docker)](#5-khởi-chạy-dự-án-thủ-công-không-dùng-docker)
6. [Cấu hình hệ thống lần đầu](#6-cấu-hình-hệ-thống-lần-đầu)
7. [Hướng dẫn lấy các API Key](#7-hướng-dẫn-lấy-các-api-key)
8. [Xử lý sự cố thường gặp](#8-xử-lý-sự-cố-thường-gặp)

---

## 1. Yêu cầu hệ thống

| Yêu cầu | Tối thiểu |
|---|---|
| Hệ điều hành | Windows 10 (64-bit) trở lên |
| RAM | 4 GB (khuyến nghị 8 GB) |
| Dung lượng ổ đĩa trống | 5 GB |
| Kết nối Internet | Cần thiết |

---

## 2. Cài đặt các công cụ cần thiết

> 💡 **Tóm tắt nhanh**: Nếu bạn đã có sẵn thư mục source code (nhận qua USB, ZIP...), bạn **chỉ cần cài Docker Desktop** là đủ để chạy toàn bộ dự án. Không cần cài thêm Git, Node.js, hay PostgreSQL.

### 2.1. Cài đặt Docker Desktop (Cách dễ nhất - khuyến nghị)

Docker giúp bạn chạy toàn bộ dự án chỉ bằng **1 lệnh duy nhất** mà không cần cài thêm gì khác.

1. Truy cập: https://www.docker.com/products/docker-desktop/
2. Nhấn nút **"Download for Windows"**
3. Chạy file `.exe` vừa tải về
4. Trong quá trình cài đặt:
   - ✅ Tick chọn **"Use WSL 2 instead of Hyper-V"** (nếu có)
   - Nhấn **Next → Install → Close**
5. **Khởi động lại máy tính** khi được yêu cầu
6. Mở **Docker Desktop** từ menu Start
7. Đợi đến khi biểu tượng Docker ở thanh taskbar chuyển thành **màu xanh** (đang chạy)

> ⚠️ **Lưu ý quan trọng**: Nếu máy bạn chưa bật WSL 2, Docker sẽ yêu cầu bạn cài. Hãy mở **PowerShell với quyền Admin** và chạy:
> ```
> wsl --install
> ```
> Sau đó khởi động lại máy.

### 2.2. Cài đặt Git (chỉ cần nếu tải mã nguồn từ GitHub)

> ⏩ **Bỏ qua bước này** nếu bạn đã nhận sẵn thư mục source code qua USB, email, hoặc file ZIP.

1. Truy cập: https://git-scm.com/download/win
2. Tải bản cài đặt phù hợp (64-bit)
3. Chạy file cài đặt → nhấn **Next** liên tục → **Install** → **Finish**

### 2.3. Cài đặt Node.js (chỉ cần nếu KHÔNG dùng Docker)

> Bỏ qua bước này nếu bạn chọn dùng Docker ở bước 2.1.

1. Truy cập: https://nodejs.org/
2. Tải phiên bản **LTS** (Long Term Support) — nút màu xanh
3. Chạy file cài đặt → nhấn **Next** liên tục
4. ✅ Khi được hỏi, tick chọn **"Automatically install the necessary tools"**
5. Nhấn **Install** → **Finish**
6. Mở **PowerShell** và kiểm tra:
   ```
   node --version
   npm --version
   ```
   Nếu hiện số phiên bản (vd: `v20.x.x`) là thành công.

### 2.4. Cài đặt PostgreSQL (chỉ cần nếu KHÔNG dùng Docker)

> Bỏ qua bước này nếu bạn chọn dùng Docker ở bước 2.1.

1. Truy cập: https://www.postgresql.org/download/windows/
2. Nhấn **"Download the installer"**
3. Tải phiên bản mới nhất (15 hoặc 16)
4. Chạy file cài đặt:
   - Chọn thư mục cài đặt → **Next**
   - Chọn tất cả components → **Next**
   - Đặt **mật khẩu** cho tài khoản `postgres` (ghi nhớ mật khẩu này!)
   - Giữ **Port** mặc định: `5432` → **Next** → **Install**
5. Sau khi cài xong, mở **pgAdmin 4** (được cài kèm) để quản lý database

---

## 3. Tải mã nguồn dự án

1. Mở **PowerShell** hoặc **Command Prompt**
2. Di chuyển đến thư mục bạn muốn lưu dự án (ví dụ Desktop):
   ```
   cd C:\Users\TenBan\Desktop
   ```
3. Tải mã nguồn:
   ```
   git clone https://github.com/vuhung2197/chatbot-rag-hungv.git
   ```
4. Vào thư mục dự án:
   ```
   cd chatbot-rag-hungv
   ```

> 💡 Nếu bạn nhận được file ZIP từ người khác, hãy giải nén vào thư mục bất kỳ rồi mở PowerShell tại thư mục đó.

---

## 4. Khởi chạy dự án bằng Docker (Cách dễ nhất)

> ✅ Đây là cách **đơn giản nhất**, chỉ cần 1 lệnh. Đảm bảo Docker Desktop đang chạy (biểu tượng xanh ở taskbar).

### Bước 1: Mở PowerShell tại thư mục dự án
```
cd C:\Users\TenBan\Desktop\chatbot-rag-hungv
```

### Bước 2: Khởi chạy toàn bộ hệ thống
```
docker-compose up --build -d
```

> ⏳ **Lần đầu tiên** sẽ mất khoảng **5-10 phút** để tải và cài đặt. Các lần sau sẽ rất nhanh.

### Bước 3: Kiểm tra trạng thái
```
docker-compose ps
```
Bạn sẽ thấy các dịch vụ đang chạy:
- `chatbot-postgres` — Database
- `chatbot-backend` — Server API
- `chatbot-frontend` — Giao diện web

### Bước 4: Truy cập ứng dụng
Mở trình duyệt web và truy cập:
- 🌐 **Ứng dụng chính**: http://localhost:3000
- 🔧 **pgAdmin (quản lý database)**: http://localhost:5050
  - Email: `admin@example.com`
  - Password: `admin123`

### Dừng hệ thống:
```
docker-compose down
```

### Khởi động lại:
```
docker-compose up -d
```

---

## 5. Khởi chạy dự án thủ công (Không dùng Docker)

> Chỉ dùng cách này nếu bạn **không muốn hoặc không thể cài Docker**.

### Bước 1: Tạo Database

1. Mở **pgAdmin 4**
2. Kết nối đến server PostgreSQL local
3. Click phải vào **Databases** → **Create** → **Database**
4. Đặt tên: `chatbot` → **Save**
5. Click vào database `chatbot` → **Tools** → **Query Tool**
6. Mở file `db/init_postgres.sql` bằng Notepad, copy toàn bộ nội dung
7. Paste vào Query Tool → Nhấn **▶ Execute** (hoặc F5)

### Bước 2: Cài đặt Backend

Mở **PowerShell** tại thư mục dự án:

```powershell
# Vào thư mục backend
cd backend

# Cài đặt các thư viện cần thiết
npm install

# Khởi chạy server backend
npm start
```

Nếu thấy dòng `Backend running at http://localhost:3001` là thành công ✅

> ⚠️ **Giữ cửa sổ PowerShell này mở**, đừng đóng nó.

### Bước 3: Cài đặt Frontend

Mở **một cửa sổ PowerShell mới** (không đóng cửa sổ backend):

```powershell
# Vào thư mục frontend
cd frontend

# Cài đặt các thư viện cần thiết
npm install

# Khởi chạy giao diện web
npm start
```

Nếu mọi thứ thành công, trình duyệt sẽ tự mở trang http://localhost:3000 ✅

---

## 6. Cấu hình hệ thống lần đầu

Khi bạn mở ứng dụng lần đầu tiên, hệ thống sẽ **tự động hiện popup** yêu cầu bạn cấu hình:

### Bước 1: Cấu hình Google OAuth (trước khi đăng nhập)
- Nếu chưa có `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET`, popup sẽ tự động hiện ra
- Xem mục [7.1](#71-lấy-google-oauth-keys) để biết cách lấy 2 giá trị này
- Nhập xong → nhấn **Save Configuration**

### Bước 2: Đăng nhập
- Đăng nhập bằng **tài khoản Google** hoặc **email/password**

### Bước 3: Cấu hình AI & Hệ thống (sau khi đăng nhập)
- Nếu chưa có `OPENAI_API_KEY`, popup sẽ tự động hiện ra yêu cầu nhập
- Các thông số khác (VNPay, MoMo, Email...) là **không bắt buộc**, có thể để trống
- Bất cứ lúc nào, nhấn nút **"⚙️ System Config"** trên thanh header để chỉnh sửa

---

## 7. Hướng dẫn lấy các API Key

### 7.1. Lấy Google OAuth Keys

1. Truy cập: https://console.cloud.google.com/
2. Đăng nhập bằng tài khoản Google của bạn
3. Tạo **Project mới** (hoặc chọn project đã có)
4. Vào **APIs & Services** → **Credentials**
5. Nhấn **"+ CREATE CREDENTIALS"** → **"OAuth 2.0 Client IDs"**
6. Nếu chưa cấu hình **Consent Screen**:
   - Chọn **External** → **Create**
   - Điền tên ứng dụng (vd: "English Chatbot") → **Save**
7. Quay lại **Credentials** → **Create OAuth Client ID**:
   - Application type: **Web application**
   - Name: `English Chatbot`
   - Authorized redirect URIs: thêm `http://localhost:3001/auth/google/callback`
8. Nhấn **Create**
9. Copy **Client ID** và **Client Secret** → dán vào popup System Config

### 7.2. Lấy OpenAI API Key

1. Truy cập: https://platform.openai.com/api-keys
2. Đăng nhập hoặc tạo tài khoản OpenAI
3. Nhấn **"+ Create new secret key"**
4. Đặt tên (vd: "English Chatbot") → **Create**
5. **Copy ngay** key vừa tạo (bắt đầu bằng `sk-...`)
6. Dán vào ô `OPENAI_API_KEY` trong popup System Config

> ⚠️ OpenAI yêu cầu **nạp tiền** ($5 trở lên) để sử dụng API. Truy cập https://platform.openai.com/account/billing để nạp.

### 7.3. Lấy Tavily API Key (Tùy chọn)

1. Truy cập: https://tavily.com/
2. Đăng ký tài khoản miễn phí
3. Vào **Dashboard** → copy API Key
4. Dán vào ô `TAVILY_API_KEY` trong popup System Config

### 7.4. Lấy VNPay Keys (Tùy chọn - cho thanh toán)

1. Truy cập: https://sandbox.vnpayment.vn/
2. Đăng ký tài khoản **Sandbox** (môi trường test)
3. Sau khi được duyệt, vào **Dashboard** để lấy:
   - `VNPAY_TMN_CODE` (Mã website)
   - `VNPAY_HASH_SECRET` (Chuỗi bí mật)
4. Dán vào popup System Config

---

## 8. Xử lý sự cố thường gặp

### ❌ Docker: "WSL 2 is not installed"
```
wsl --install
```
Sau đó khởi động lại máy.

### ❌ Docker: Port 3000 hoặc 3001 đã bị chiếm
Kiểm tra và tắt ứng dụng đang chiếm port:
```powershell
# Kiểm tra port 3000
netstat -ano | findstr :3000

# Tắt process bằng PID (thay <PID> bằng số hiện ra)
taskkill /PID <PID> /F
```

### ❌ npm install bị lỗi
```powershell
# Xóa cache và thử lại
npm cache clean --force
rm -r node_modules
npm install
```

### ❌ Lỗi kết nối database
- **Nếu dùng Docker**: Chạy `docker-compose down` rồi `docker-compose up --build -d`
- **Nếu dùng thủ công**: Kiểm tra PostgreSQL đang chạy, và thông tin trong System Config (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD) chính xác

### ❌ Popup System Config không hiện dữ liệu
- Reload lại trang web (F5)
- Kiểm tra backend có đang chạy không
- Mở **Developer Tools** (F12) → tab **Console** để xem lỗi chi tiết

---

## ✅ Hoàn tất!

Nếu mọi thứ thành công, bạn có thể:
- 🔐 Đăng nhập bằng Google hoặc tạo tài khoản mới
- 💬 Sử dụng chatbot AI để học tiếng Anh
- ✍️ Luyện viết, nghe, đọc, nói
- 📊 Xem thống kê học tập
- ⚙️ Quản lý cấu hình hệ thống qua nút "System Config"

**Chúc bạn sử dụng vui vẻ! 🎉**
