# Module Knowledge

## Mục đích
Module Knowledge quản lý cơ sở tri thức (knowledge base) cho chatbot, bao gồm việc thêm, sửa, xóa và tìm kiếm các tài liệu kiến thức.

## Chức năng chính

### 1. Quản lý Knowledge Base
- Thêm tài liệu kiến thức mới
- Cập nhật tài liệu hiện có
- Xóa tài liệu
- Tìm kiếm tài liệu theo tiêu đề/nội dung

### 2. Vector Embedding
- Tự động tạo embedding cho tài liệu mới
- Lưu trữ vector trong pgvector
- Hỗ trợ semantic search

### 3. Phân loại và Tag
- Gắn tag cho tài liệu
- Phân loại theo category
- Quản lý metadata

### 4. Import/Export
- Import tài liệu từ file (PDF, DOCX, TXT)
- Export knowledge base
- Bulk operations

## Cấu trúc

```
knowledge/
├── controllers/
│   └── knowledge.controller.js    # Xử lý HTTP requests
├── routes/
│   └── knowledge.routes.js        # Định nghĩa API endpoints
└── services/
    └── knowledge.service.js       # Business logic
```

## API Endpoints

### GET /api/knowledge
Lấy danh sách tài liệu kiến thức

**Query Parameters:**
- `page`: Trang hiện tại (mặc định: 1)
- `limit`: Số lượng mỗi trang (mặc định: 20)
- `search`: Từ khóa tìm kiếm
- `category`: Lọc theo danh mục

### POST /api/knowledge
Thêm tài liệu kiến thức mới

**Request Body:**
```json
{
  "title": "React Hooks Guide",
  "content": "React Hooks are functions that...",
  "category": "programming",
  "tags": ["react", "javascript", "hooks"]
}
```

### GET /api/knowledge/:id
Lấy chi tiết một tài liệu

### PUT /api/knowledge/:id
Cập nhật tài liệu

### DELETE /api/knowledge/:id
Xóa tài liệu

### POST /api/knowledge/search
Tìm kiếm semantic

**Request Body:**
```json
{
  "query": "How to use React hooks?",
  "limit": 10
}
```

### POST /api/knowledge/import
Import tài liệu từ file

## Database Schema

### Bảng: knowledge_base
- `id`: Primary key
- `title`: Tiêu đề tài liệu
- `content`: Nội dung
- `category`: Danh mục
- `tags`: Mảng tags (JSON)
- `embedding`: Vector embedding (pgvector)
- `metadata`: Dữ liệu bổ sung (JSON)
- `created_at`: Thời gian tạo
- `updated_at`: Thời gian cập nhật

## Vector Search

### Embedding Generation
- Sử dụng OpenAI text-embedding-ada-002
- Dimension: 1536
- Tự động tạo khi thêm/cập nhật tài liệu

### Similarity Search
```sql
SELECT *,
  1 - (embedding <=> query_embedding) as similarity
FROM knowledge_base
WHERE 1 - (embedding <=> query_embedding) > 0.7
ORDER BY similarity DESC
LIMIT 10;
```

## Tích hợp

### Chat Module
- Cung cấp context cho RAG
- Semantic search cho câu hỏi
- Scoring và ranking

### Upload Module
- Nhận file từ upload
- Extract text content
- Tạo knowledge entries

## Sử dụng

```javascript
import knowledgeService from './services/knowledge.service.js';

// Thêm tài liệu
const doc = await knowledgeService.create({
  title: 'React Guide',
  content: 'React is a JavaScript library...',
  category: 'programming'
});

// Tìm kiếm semantic
const results = await knowledgeService.semanticSearch(
  'How to use hooks?',
  10
);

// Cập nhật
await knowledgeService.update(docId, {
  content: 'Updated content...'
});
```

## Cải tiến trong tương lai
- Hỗ trợ multi-language
- Auto-tagging với AI
- Version control cho tài liệu
- Collaborative editing
- Knowledge graph visualization
