# Hướng dẫn cấu hình file `.env` cho Backend Node.js

---

## 1. Chạy Backend **bên ngoài Docker** (Debug, VSCode, Local)

- **Sử dụng MySQL đang chạy trong Docker**
- Kết nối bằng `localhost` và **cổng đã ánh xạ ra ngoài** (ví dụ: `3307`)

### Ví dụ file `.env`:

```env
DB_HOST=localhost
DB_PORT=3307
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_DATABASE=your_db_name
```

> **Lưu ý:**  
> - `DB_PORT` phải là `3307` nếu bạn mapping `"3307:3306"` trong `docker-compose.yml`.  
> - Các giá trị `user`, `password`, `database` phải trùng với khi khởi tạo container.

---

## 2. Chạy Backend **bên trong Docker Compose**

- Các service cùng mạng Docker, có thể gọi nhau bằng **tên service**
- Kết nối bằng host là **tên service** (ví dụ: `db`), port giữ mặc định `3306`

### Ví dụ file `.env`:

```env
DB_HOST=db
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_DATABASE=your_db_name
```

> **Lưu ý:**  
> - `DB_HOST` phải là **tên service MySQL** trong `docker-compose.yml` (thường là `db`).  
> - `DB_PORT` giữ mặc định `3306`.