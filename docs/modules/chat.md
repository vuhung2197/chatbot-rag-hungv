# Tài liệu Module Chat (Trò chuyện)

## 1. Tổng quan
**Module Chat** là lõi thông minh của ứng dụng, điều phối sự tương tác giữa người dùng và AI. Nó triển khai quy trình **Advanced RAG (Retrieval-Augmented Generation)**, hỗ trợ **Tìm kiếm Web**, và xử lý **Phân loại ý định (Intent Classification)** để điều hướng câu hỏi một cách hiệu quả.

## 2. Các thành phần chính

### 2.1 Backend (`backend/src/modules/chat`)
- **`ChatService`**: Bộ điều phối chính.
- **`IntentRouter`**: Phân loại ý định người dùng (Chào hỏi, Tìm kiếm trực tiếp, Kiến thức chuyên sâu, v.v.).
- **`AdvancedRAGFixed`**: Logic xử lý truy xuất (retrieval), xếp hạng lại (reranking), và tổng hợp (fusion).

### 2.2 Frontend (`frontend/src/features/chat`)
- **`Chat.js`**: Component giao diện chat chính. Xử lý nhập tin nhắn, hiển thị và cập nhật luồng (stream).
- **`ConversationsList.js`**: Thanh bên hiển thị lịch sử trò chuyện.
- **`ModelManager.js`**: Cài đặt để chọn các mô hình LLM khác nhau (ví dụ: GPT-4, Claude).

## 3. Phân tích kỹ thuật

### 3.1 Luồng dữ liệu
`Tin nhắn người dùng` -> `Bộ định tuyến ý định (Router)` -> [Trình xử lý] -> `Phản hồi`

#### Trình xử lý: Knowledge (RAG - Kiến thức)
1.  **Viết lại câu hỏi (Rewrite)**: Nếu có lịch sử trò chuyện, câu hỏi được viết lại thành câu độc lập (giải quyết các đại từ như "nó", "anh ấy").
2.  **Truy xuất (Retrieval)**: Gọi `multiStageRetrieval`.
3.  **Dự phòng (Fallback)**: Nếu tìm thấy 0 đoạn dữ liệu (chunks), kích hoạt **Dự phòng Tìm kiếm Web**.
4.  **Sinh văn bản (Generation)**: Tạo phản hồi định dạng Markdown kèm trích dẫn nguồn.

#### Trình xử lý: Live Search (Tìm kiếm trực tiếp)
1.  **Tìm kiếm**: Gọi `performWebSearch` (ví dụ: Tavily API).
2.  **Ngữ cảnh**: Kết quả tìm kiếm được đưa vào làm ngữ cảnh cho LLM.
3.  **Trích dẫn**: Chỉ thị nghiêm ngặt để dẫn link nguồn.

### 3.2 Hỗ trợ Streaming (`streamChat`)
Module hỗ trợ Server-Sent Events (SSE) để phản hồi thời gian thực (real-time).
- Các sự kiện (events): `status` (bước xử lý), `text` (token văn bản), `done` (hoàn tất kèm metadata).
- **Lợi ích**: Cải thiện độ trễ cảm nhận được của người dùng.

### 3.3 Tích hợp Cơ sở dữ liệu
- **`user_questions`**: Lưu trữ toàn bộ lịch sử hội thoại.
- **`metadata`**: Trường JSON lưu thời gian xử lý, model sử dụng và lượng token tiêu thụ.

## 4. Hướng dẫn sử dụng

### Chat tiêu chuẩn
```javascript
const response = await chatService.processChat({
    userId: 1,
    message: "Các tính năng mới nhất là gì?",
    conversationId: "uuid-v4",
    model: { name: 'gpt-4o', url: '...' }
});
```

### Chat Streaming
```javascript
await chatService.streamChat(
    { userId, message, conversationId },
    (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
);
```
