# 🤖 Chatbot AI Tư Duy Tri Thức & Dịch Thuật Song Ngữ

## 🧠 Giới thiệu dự án

Dự án phát triển một chatbot AI với các khả năng nổi bật:

- **Học và trả lời dựa trên kiến thức do người dùng cung cấp** (Knowledge-based Retrieval)
- **Dịch song ngữ Anh-Việt và Việt-Anh** thông minh
- **Lưu & dịch nội dung do người dùng chọn (bôi đậm)** trực tiếp từ giao diện

> Hệ thống được xây dựng với kiến trúc **Frontend (React)** + **Backend (Node.js)** và triển khai toàn bộ qua **Docker Compose**.

---

## 📂 Cấu trúc thư mục

<pre>
.
├── docker-compose.yml
├── .env.example
├── backend/        # Node.js API: Chatbot, training, dịch ngôn ngữ
├── frontend/       # React app: giao diện người dùng
└── README.md
</pre>

---

## 🚀 Tính năng chính

### ✅ Chatbot AI học tập kiến thức

- Quản lý kiến thức dưới dạng **Tiêu đề + Nội dung**
- Tự động chia nhỏ (chunk) & tính embedding để truy xuất chính xác
- Sử dụng thuật toán **RAG (Retrieval-Augmented Generation)** để trả lời
- Giao diện quản trị giúp thêm, chỉnh sửa, chunk và huấn luyện file

### 🌐 Dịch song ngữ Anh-Việt

- Tự động nhận diện ngôn ngữ nguồn
- Cho phép bôi đậm văn bản bất kỳ để dịch nhanh
- Dịch linh hoạt cả câu dài hoặc từ đơn

### 📌 Ghi nhớ & đào tạo từ câu hỏi chưa trả lời

- Lưu lại các câu hỏi mà bot chưa thể trả lời
- Admin có thể xem lại và huấn luyện lại dễ dàng từ giao diện

### 📁 Upload file để huấn luyện kiến thức

- Hỗ trợ định dạng: `.txt`, `.docx`, `.pdf`
- Trích xuất nội dung tự động, lưu vào hệ thống và tạo chunk embedding

---

## ⚙️ Cài đặt & chạy dự án

### 1. Cài đặt yêu cầu

- **Docker + Docker Compose**  
  👉 [Tải Docker Desktop](https://www.docker.com/products/docker-desktop)

### 2. Thiết lập biến môi trường

```bash
cp .env.example .env
```
Sau đó mở file `.env` và thiết lập các thông số như:

```env
DB_USER=chatbot_user
DB_PASSWORD=chatbot_pass
DB_NAME=chatbot_db
DB_ROOT_PASSWORD=rootpass
OPENAI_API_KEY=sk-...
```

### 3. Khởi chạy toàn bộ dự án

```bash
docker compose up -d
```

- Truy cập giao diện: [http://localhost:3000](http://localhost:3000)
- API backend: [http://localhost:3001](http://localhost:3001)

---

## 🧪 Tính năng dành cho quản trị viên

- Thêm / sửa / xóa kiến thức
- Xem & chunk dữ liệu kiến thức
- Huấn luyện lại từ câu hỏi chưa trả lời
- Upload file để training tự động

---

## 🔒 Bảo mật

- **KHÔNG commit file `.env` lên Git**
- Chia sẻ file cấu trúc `.env.example` để hỗ trợ người khác cấu hình

---

## 🛠 Một số lệnh hữu ích

```bash
# Theo dõi log
docker compose logs -f

# Dừng toàn bộ service
docker compose down

# Build lại sau khi sửa code
docker compose build
```

---

## 👨‍💻 Đóng góp phát triển

- Fork repo, tạo nhánh mới, commit thay đổi và gửi Pull Request
- Vui lòng kiểm thử kỹ trước khi gửi PR

---

## 👤 Tác giả

- **Hùng Vũ**
- 📧 Email: hung97vu@gmail.com