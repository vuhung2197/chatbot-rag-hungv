# TÀI LIỆU THUẬT TOÁN LỌC CONTEXT CHATBOT AI

---

## I. Tổng quan

Hệ thống chatbot sử dụng thuật toán lọc context để chọn ra các đoạn kiến thức (context) phù hợp nhất, phục vụ cho việc trả lời câu hỏi người dùng thông qua OpenAI ChatGPT.

---

## II. Mục tiêu

- Lọc các kiến thức liên quan nhất đến câu hỏi.
- Giảm chi phí và tăng độ chính xác khi gọi ChatGPT.
- Dễ mở rộng, bảo trì và tích hợp thêm logic thông minh hơn trong tương lai.

---

## III. Quy trình thuật toán

**Các bước chính:**

1. Nhận câu hỏi từ người dùng.
2. Truy vấn các kiến thức phù hợp từ database (bằng FULLTEXT).
3. Chuẩn hóa câu hỏi, tách thành các từ khóa.
4. Lấy các từ khóa quan trọng từ bảng `important_keywords`.
5. Chấm điểm (scoring) từng context:
   - Điểm cho match từ khóa trong tiêu đề/nội dung.
   - Điểm cao hơn cho match important keyword.
6. Lọc, sắp xếp, lấy top N context phù hợp nhất.
7. Gửi context cùng câu hỏi cho ChatGPT xử lý.
8. Nhận và trả kết quả về cho người dùng.

---

## IV. Flow chart thuật toán

<p align="center">
  <img src="https://i.imgur.com/3it5IbF.png" width="550" alt="flow chart context scoring">
</p>

---

## V. Chi tiết các bước

### 1. Nhận câu hỏi

Người dùng nhập câu hỏi vào chatbot.

### 2. Lấy dữ liệu knowledge

Truy vấn các bản ghi kiến thức có tiêu đề hoặc nội dung liên quan đến câu hỏi bằng SQL FULLTEXT:

```sql
SELECT * FROM knowledge_base WHERE MATCH(title, content) AGAINST(?) LIMIT 10
```

### 3. Chuẩn hóa & tách từ khóa

- Bỏ dấu, chuyển thường, loại từ ngắn.
- Tách thành mảng từ khóa cho so khớp.

### 4. Lấy important keywords

Truy vấn tất cả hoặc các keyword quan trọng liên quan từ bảng `important_keywords`.

### 5. Chấm điểm (scoring) context

Với mỗi context:

- **+1 điểm** cho mỗi từ khóa trùng trong title/content.
- **+2 điểm** cho mỗi important keyword trùng trong title/content.

### 6. Lọc & sắp xếp context

- Bỏ context có điểm số 0.
- Sắp xếp giảm dần theo điểm số.
- Lấy top N (ví dụ 3) context có điểm cao nhất.

### 7. Gửi vào ChatGPT

Gửi N context cùng câu hỏi để ChatGPT tạo câu trả lời tối ưu.

### 8. Nhận và trả kết quả

Nhận câu trả lời từ ChatGPT, trả về giao diện người dùng.

---

## VI. Ưu điểm & Nhược điểm

### Ưu điểm

- Đơn giản, dễ hiểu, dễ mở rộng.
- Hiệu quả với data nhỏ-vừa.

### Nhược điểm

- Chỉ dựa trên khớp từ, không xử lý ngữ nghĩa sâu (semantic).
- Dễ bị nhầm nếu dùng đồng nghĩa, đảo ngữ hoặc từ khóa ẩn.

---

## VII. Đề xuất cải tiến

- Nâng cấp thuật toán scoring (ưu tiên tiêu đề, match cụm, thứ tự keyword...).
- Thêm semantic search (OpenAI Embedding, LlamaIndex...).
- Gợi ý context liên tục học từ các câu hỏi chưa trả lời được.

Config ENV

- default DB_HOST = db, DB_PORT = 3306
- muốn debug -> đổi DB_HOST = localhost, DB_PORT = 3307 + F5
