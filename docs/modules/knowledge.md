# Tài liệu Module Knowledge (Kiến thức)

## 1. Tổng quan
**Module Knowledge** quản lý việc nhập liệu, xử lý và tổ chức tài liệu cho hệ thống RAG. Nó đảm bảo văn bản thô (bài viết, hướng dẫn) được chuyển đổi thành các vector có thể truy xuất được.

## 2. Các thành phần chính

### 2.1 Backend (`backend/src/modules/knowledge`)
- **`KnowledgeService`**: Các thao tác CRUD và tạo embedding.
- **`updateChunksForKnowledge`**: Helper để chia nhỏ/phân mảnh tài liệu.

### 2.2 Frontend (`frontend/src/features/knowledge`)
- **`KnowledgeAdmin.js`**: Giao diện Admin để thêm, sửa, xóa tài liệu kiến thức. Hiển thị số lượng chunk và metadata.
- **`KnowledgeSearch.js`**: Component để tìm kiếm thủ công trong cơ sở tri thức (chủ yếu để debug/admin).

## 3. Phân tích kỹ thuật

### 3.1 Quy trình Nhập liệu (`addKnowledge`)
1.  **Embedding**: Một vector embedding được tạo cho *toàn bộ* tiêu đề + nội dung tài liệu.
2.  **Lưu trữ**: Tài liệu được lưu vào bảng `knowledge_base`.
3.  **Trích xuất từ khóa**: Chuẩn hóa văn bản và lưu các từ khóa duy nhất vào `important_keywords` để phục vụ tìm kiếm lai (hybrid retrieval).
4.  **Phân mảnh (Chunking)**: Gọi `updateChunksForKnowledge` để chia nội dung thành các đoạn nhỏ hơn (ví dụ: 500 tokens).

### 3.2 Cơ chế Cập nhật (`updateKnowledge`)
- Thay thế hoàn toàn tiêu đề, nội dung và embedding.
- **Tạo lại Chunks**: Xóa các chunk cũ và tạo chunk mới để đảm bảo tính nhất quán.
- **Cập nhật Từ khóa**: Làm mới chỉ mục từ khóa.

## 4. Hướng dẫn sử dụng

### Thêm tài liệu
```javascript
await knowledgeService.addKnowledge(
    "Hướng dẫn về Chính sách Hoàn tiền",
    "Hoàn tiền được xử lý trong vòng 14 ngày..."
);
```

### Lấy Metadata Kiến thức
```javascript
// Trả về danh sách tài liệu cùng số lượng chunk
const allDocs = await knowledgeService.getAllKnowledge();
```
