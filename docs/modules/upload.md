# Tài liệu Module Upload (Tải lên)

## 1. Tổng quan
**Module Upload** xử lý việc tiếp nhận các tập tin (Tài liệu, Văn bản) vào hệ thống nhằm mục đích huấn luyện Cơ sở tri thức AI (Knowledge Base).

## 2. Các thành phần chính

### 2.1 Backend (`backend/src/modules/upload`)
- **`UploadService`**: Xử lý phân tích các file gửi đến và lưu trữ chúng.
- **Hỗ trợ**: Sử dụng `mammoth` để trích xuất nội dung file `.docx`.

### 2.2 Frontend (`frontend/src/features/knowledge`)
- **`KnowledgeAdmin.js`**: Nhận đầu vào file từ người dùng, gửi yêu cầu `multipart/form-data` đến endpoint upload.

## 3. Phân tích kỹ thuật

### 3.1 Quy trình Xử lý
1.  **Tiếp nhận File**: Nhận đối tượng file từ `multer`.
2.  **Trích xuất**: Đọc nội dung dựa trên phần mở rộng (extension).
3.  **Kiểm tra Trùng lặp**: Ngăn chặn việc tải lên cùng một tên file hai lần.
4.  **Ghi Database**: Tạo bản ghi `knowledge_base`.
5.  **Kích hoạt Phân mảnh**: Gọi `updateChunksForKnowledge` để chia nhỏ văn bản phục vụ RAG.
6.  **Dọn dẹp**: Xóa file tạm đã tải lên khỏi ổ đĩa.

## 4. Hướng dẫn sử dụng

### Tải file lên
Service mong đợi một đối tượng file (thường từ `multer`).
```javascript
const result = await uploadService.processFile(req.file);
console.log(`Knowledge ID: ${result.knowledgeId}`);
```
