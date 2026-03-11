# 🍎 Hướng dẫn cài đặt dự án English Chatbot trên macOS

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
| Hệ điều hành | macOS 12 Monterey trở lên |
| Chip | Intel hoặc Apple Silicon (M1/M2/M3/M4) |
| RAM | 4 GB (khuyến nghị 8 GB) |
| Dung lượng ổ đĩa trống | 5 GB |
| Kết nối Internet | Cần thiết |

---

## 2. Cài đặt các công cụ cần thiết

> 💡 **Tóm tắt nhanh**: Nếu bạn đã có sẵn thư mục source code (nhận qua USB, ZIP...), bạn **chỉ cần cài Docker Desktop** là đủ để chạy toàn bộ dự án. Không cần cài thêm Git, Node.js, Homebrew, hay PostgreSQL.

### 2.1. Mở Terminal

Terminal là ứng dụng để nhập lệnh trên macOS. Có 2 cách mở:
- **Cách 1**: Nhấn `⌘ Cmd + Space` → gõ `Terminal` → nhấn Enter
- **Cách 2**: Vào **Finder** → **Applications** → **Utilities** → **Terminal**

### 2.2. Cài đặt Homebrew (Trình quản lý phần mềm cho Mac)

Homebrew giúp cài đặt mọi thứ cần thiết chỉ bằng 1 lệnh. Paste lệnh sau vào Terminal:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

> ⏳ Quá trình cài đặt sẽ mất vài phút. Nhập **mật khẩu máy Mac** khi được yêu cầu (bạn sẽ không thấy ký tự khi gõ, đó là bình thường).

Sau khi cài xong, nếu Terminal yêu cầu bạn thêm Homebrew vào PATH, hãy chạy các lệnh hiển thị trên màn hình (thường giống như sau):
```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

Kiểm tra cài đặt thành công:
```bash
brew --version
```

### 2.3. Cài đặt Docker Desktop (Cách dễ nhất - khuyến nghị)

Docker giúp bạn chạy toàn bộ dự án chỉ bằng **1 lệnh duy nhất**.

1. Truy cập: https://www.docker.com/products/docker-desktop/
2. Nhấn **"Download for Mac"**
   - Chọn **Apple Chip** nếu bạn dùng Mac M1/M2/M3/M4
   - Chọn **Intel Chip** nếu bạn dùng Mac Intel
   - (Không biết? Nhấn  → **About This Mac** → xem dòng **Chip**)
3. Mở file `.dmg` vừa tải
4. Kéo biểu tượng **Docker** vào thư mục **Applications**
5. Mở **Docker** từ Launchpad hoặc Applications
6. Nhấn **Accept** khi được hỏi về điều khoản
7. Đợi đến khi biểu tượng Docker ở thanh menu bar (góc trên phải) hiện **màu xanh**

### 2.4. Cài đặt Git (chỉ cần nếu tải mã nguồn từ GitHub)

> ⏩ **Bỏ qua bước này** nếu bạn đã nhận sẵn thư mục source code qua USB, email, hoặc file ZIP.

```bash
brew install git
```

Kiểm tra:
```bash
git --version
```

### 2.5. Cài đặt Node.js (chỉ cần nếu KHÔNG dùng Docker)

> Bỏ qua bước này nếu bạn chọn dùng Docker ở bước 2.3.

```bash
brew install node@20
```

Kiểm tra:
```bash
node --version
npm --version
```

### 2.6. Cài đặt PostgreSQL (chỉ cần nếu KHÔNG dùng Docker)

> Bỏ qua bước này nếu bạn chọn dùng Docker ở bước 2.3.

```bash
# Cài đặt PostgreSQL
brew install postgresql@15

# Khởi động PostgreSQL tự động
brew services start postgresql@15
```

Kiểm tra PostgreSQL đang chạy:
```bash
brew services list
```
Nếu thấy `postgresql@15` có trạng thái `started` là thành công ✅

---

## 3. Tải mã nguồn dự án

1. Mở **Terminal**
2. Di chuyển đến thư mục bạn muốn lưu dự án (ví dụ Desktop):
   ```bash
   cd ~/Desktop
   ```
3. Tải mã nguồn:
   ```bash
   git clone https://github.com/vuhung2197/chatbot-rag-hungv.git
   ```
4. Vào thư mục dự án:
   ```bash
   cd chatbot-rag-hungv
   ```

> 💡 Nếu bạn nhận được file ZIP, hãy giải nén vào thư mục bất kỳ rồi mở Terminal tại thư mục đó bằng cách kéo thư mục vào biểu tượng Terminal.

---

## 4. Khởi chạy dự án bằng Docker (Cách dễ nhất)

> ✅ Đây là cách **đơn giản nhất**, chỉ cần 1 lệnh. Đảm bảo Docker Desktop đang chạy (biểu tượng xanh ở menu bar).

### Bước 1: Mở Terminal tại thư mục dự án
```bash
cd ~/Desktop/chatbot-rag-hungv
```

### Bước 2: Khởi chạy toàn bộ hệ thống
```bash
docker-compose up --build -d
```

> ⏳ **Lần đầu tiên** sẽ mất khoảng **5-10 phút** để tải và cài đặt. Các lần sau sẽ rất nhanh.

### Bước 3: Kiểm tra trạng thái
```bash
docker-compose ps
```
Bạn sẽ thấy các dịch vụ đang chạy:
- `chatbot-postgres` — Database
- `chatbot-backend` — Server API
- `chatbot-frontend` — Giao diện web

### Bước 4: Truy cập ứng dụng
Mở trình duyệt web (Safari, Chrome...) và truy cập:
- 🌐 **Ứng dụng chính**: http://localhost:3000
- 🔧 **pgAdmin (quản lý database)**: http://localhost:5050
  - Email: `admin@example.com`
  - Password: `admin123`

### Dừng hệ thống:
```bash
docker-compose down
```

### Khởi động lại:
```bash
docker-compose up -d
```

---

## 5. Khởi chạy dự án thủ công (Không dùng Docker)

> Chỉ dùng cách này nếu bạn **không muốn hoặc không thể cài Docker**.

### Bước 1: Tạo Database

```bash
# Tạo database
createdb chatbot

# Khởi tạo bảng và dữ liệu
psql chatbot < db/init_postgres.sql
```

### Bước 2: Cài đặt và chạy Backend

```bash
# Vào thư mục backend
cd backend

# Cài đặt thư viện
npm install

# Chạy backend server
npm start
```

Nếu thấy dòng `Backend running at http://localhost:3001` là thành công ✅

> ⚠️ **Giữ cửa sổ Terminal này mở**, đừng đóng nó.

### Bước 3: Cài đặt và chạy Frontend

Mở **một tab Terminal mới** (`⌘ Cmd + T`):

```bash
# Vào thư mục frontend
cd frontend

# Cài đặt thư viện
npm install

# Chạy giao diện web
npm start
```

Trình duyệt sẽ tự mở trang http://localhost:3000 ✅

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
2. Đăng nhập bằng tài khoản Google
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

### ❌ Homebrew: "Command not found: brew"
Chạy lại lệnh thêm vào PATH:
```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
source ~/.zprofile
```

### ❌ Docker: "Cannot connect to Docker daemon"
- Đảm bảo Docker Desktop đang mở và biểu tượng ở menu bar là **màu xanh**
- Nếu không, mở lại Docker Desktop từ Applications

### ❌ Docker: Port 3000 hoặc 3001 đã bị chiếm
```bash
# Kiểm tra process đang chiếm port 3000
lsof -i :3000

# Tắt process (thay <PID> bằng số hiện ra)
kill -9 <PID>
```

### ❌ npm install bị lỗi
```bash
# Xóa cache và thử lại
npm cache clean --force
rm -rf node_modules
npm install
```

### ❌ Lỗi "permission denied"
Thêm `sudo` trước lệnh (cần nhập mật khẩu máy Mac):
```bash
sudo npm install
```

### ❌ PostgreSQL: "role does not exist"
```bash
# Tạo user mặc định
createuser -s postgres
```

### ❌ Popup System Config không hiện dữ liệu
- Reload lại trang web (`⌘ Cmd + R`)
- Kiểm tra backend có đang chạy không
- Mở **Developer Tools** (`⌘ Cmd + Option + I`) → tab **Console** để xem lỗi chi tiết

---

## ✅ Hoàn tất!

Nếu mọi thứ thành công, bạn có thể:
- 🔐 Đăng nhập bằng Google hoặc tạo tài khoản mới
- 💬 Sử dụng chatbot AI để học tiếng Anh
- ✍️ Luyện viết, nghe, đọc, nói
- 📊 Xem thống kê học tập
- ⚙️ Quản lý cấu hình hệ thống qua nút "System Config"

**Chúc bạn sử dụng vui vẻ! 🎉**
