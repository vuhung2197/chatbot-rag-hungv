# Module Chat

## Mục đích
Module Chat cung cấp chatbot AI thông minh với khả năng trả lời câu hỏi dựa trên RAG (Retrieval-Augmented Generation), tìm kiếm web, và quản lý hội thoại.

## Chức năng chính

### 1. Chat AI với RAG
- Trả lời câu hỏi dựa trên knowledge base
- Sử dụng vector embedding để tìm context phù hợp
- Multi-stage retrieval và semantic clustering
- Adaptive retrieval và reranking

### 2. Web Search Integration
- Tìm kiếm thông tin trên web khi không có trong database
- Fallback tự động khi không tìm thấy context
- Dẫn nguồn với link URL

### 3. Quản lý Conversation
- Tạo và quản lý các cuộc hội thoại
- Lưu trữ lịch sử chat
- Phân loại conversation theo chủ đề

### 4. Suggestion System
- Gợi ý câu hỏi phổ biến
- Gợi ý dựa trên context hiện tại
- Quản lý danh sách suggestions

### 5. Unanswered Questions
- Theo dõi câu hỏi chưa trả lời được
- Đánh dấu và quản lý trạng thái
- Phân tích để cải thiện knowledge base

## Cấu trúc

```
chat/
├── controllers/
│   ├── chat.controller.js           # Chat chính
│   ├── conversation.controller.js   # Quản lý hội thoại
│   ├── suggestion.controller.js     # Gợi ý câu hỏi
│   └── unanswered.controller.js     # Câu hỏi chưa trả lời
├── routes/
│   ├── chat.routes.js
│   ├── advancedChat.routes.js
│   ├── conversation.routes.js
│   ├── suggestion.routes.js
│   └── unanswered.routes.js
└── services/
    └── chat.service.js              # Business logic
```

## API Endpoints

### POST /api/chat
Chat cơ bản với AI

**Request Body:**
```json
{
  "message": "What is React?",
  "conversationId": 123
}
```

### POST /api/chat/advanced
Chat nâng cao với RAG

**Request Body:**
```json
{
  "message": "Explain hooks in React",
  "conversationId": 123,
  "useWebSearch": false
}
```

### GET /api/conversations
Lấy danh sách hội thoại của user

### POST /api/conversations
Tạo hội thoại mới

### GET /api/conversations/:id
Lấy chi tiết một hội thoại

### DELETE /api/conversations/:id
Xóa hội thoại

### GET /api/suggestions
Lấy danh sách gợi ý câu hỏi

### POST /api/suggestions
Tạo gợi ý mới

### GET /api/unanswered
Lấy danh sách câu hỏi chưa trả lời

## Advanced RAG Features

### 1. Multi-Stage Retrieval
- Stage 1: Vector similarity search
- Stage 2: Keyword matching
- Stage 3: Hybrid scoring

### 2. Semantic Clustering
- Nhóm các context tương tự
- Loại bỏ thông tin trùng lặp
- Tối ưu hóa context window

### 3. Multi-Hop Reasoning
- Kết hợp nhiều nguồn thông tin
- Suy luận đa bước
- Trả lời câu hỏi phức tạp

### 4. Adaptive Retrieval
- Điều chỉnh số lượng context động
- Dựa trên độ phức tạp câu hỏi
- Tối ưu chi phí và chất lượng

### 5. Context Reranking
- Sắp xếp lại context theo relevance
- Cross-encoder scoring
- Chọn context tốt nhất

## Intent Classification

Module tự động phân loại ý định người dùng:
- `GENERAL_KNOWLEDGE`: Câu hỏi kiến thức chung
- `NEWS_CURRENT_EVENTS`: Tin tức, sự kiện hiện tại
- `LEARNING_ENGLISH`: Học tiếng Anh
- `TECHNICAL_HELP`: Hỗ trợ kỹ thuật
- `CASUAL_CHAT`: Trò chuyện thông thường

## Database Schema

### Bảng: conversations
- `id`: Primary key
- `user_id`: ID người dùng
- `title`: Tiêu đề hội thoại
- `created_at`: Thời gian tạo
- `updated_at`: Thời gian cập nhật

### Bảng: chat_history
- `id`: Primary key
- `user_id`: ID người dùng
- `conversation_id`: ID hội thoại
- `message`: Tin nhắn người dùng
- `reply`: Phản hồi của AI
- `metadata`: Dữ liệu bổ sung (JSON)
- `created_at`: Thời gian tạo

### Bảng: suggestions
- `id`: Primary key
- `question`: Câu hỏi gợi ý
- `category`: Danh mục
- `order`: Thứ tự hiển thị
- `active`: Trạng thái kích hoạt

### Bảng: unanswered_questions
- `id`: Primary key
- `user_id`: ID người dùng
- `question`: Câu hỏi
- `status`: Trạng thái (pending, resolved)
- `created_at`: Thời gian tạo

## Tích hợp

### Vector Database
- Sử dụng pgvector extension
- Lưu trữ embeddings của knowledge
- Tìm kiếm similarity nhanh

### LLM Service
- Hỗ trợ OpenAI GPT-4
- Streaming response
- Token usage tracking

### Web Search
- Tích hợp Google Search API
- Fallback khi không có context
- Trích xuất và format kết quả

## Sử dụng

```javascript
import chatService from './services/chat.service.js';

// Chat cơ bản
const response = await chatService.chat(userId, message, conversationId);

// Chat nâng cao với RAG
const advancedResponse = await chatService.advancedChat(
  userId,
  message,
  conversationId,
  { useWebSearch: true }
);
```

## Cải tiến trong tương lai
- Thêm memory cho long-term context
- Multi-modal support (hình ảnh, audio)
- Fine-tuning model cho domain cụ thể
- A/B testing các RAG strategies
- Real-time collaboration chat
