# KIẾN TRÚC BACKEND - ENGLISH CHATBOT

## Tổng quan

Backend của English Chatbot được xây dựng theo kiến trúc modular, với 16 modules độc lập xử lý các chức năng khác nhau. Hệ thống sử dụng Node.js, PostgreSQL, và tích hợp nhiều dịch vụ AI (OpenAI, Azure Speech).

## Công nghệ sử dụng

- **Runtime**: Node.js
- **Database**: PostgreSQL với pgvector extension
- **AI Services**:
  - OpenAI GPT-4 (Chat, Writing, Reading)
  - Azure Speech Service (Speaking assessment)
  - OpenAI Embeddings (Vector search)
- **Payment Gateways**: MoMo, VNPay
- **Authentication**: JWT, OAuth 2.0 (Google)

## Cấu trúc thư mục

```
backend/
├── src/
│   ├── modules/           # 16 modules chính
│   │   ├── analytics/     # Theo dõi và phân tích lỗi
│   │   ├── auth/          # Xác thực và phân quyền
│   │   ├── chat/          # Chatbot AI với RAG
│   │   ├── knowledge/     # Quản lý knowledge base
│   │   ├── learning/      # Lộ trình học có cấu trúc
│   │   ├── listening/     # Bài tập luyện nghe
│   │   ├── reading/       # Bài tập luyện đọc
│   │   ├── settings/      # Cài đặt hệ thống
│   │   ├── speaking/      # Bài tập luyện nói
│   │   ├── subscription/  # Quản lý gói đăng ký
│   │   ├── upload/        # Xử lý upload file
│   │   ├── usage/         # Theo dõi usage và chi phí
│   │   ├── user/          # Quản lý người dùng
│   │   ├── vocabulary/    # Quản lý từ vựng
│   │   ├── wallet/        # Ví điện tử và thanh toán
│   │   └── writing/       # Bài tập luyện viết
│   ├── services/          # Shared services
│   ├── middleware/        # Middleware chung
│   ├── utils/             # Utility functions
│   └── db/                # Database connection
├── README.md              # Tài liệu thuật toán RAG
└── package.json
```

## Kiến trúc Module

Mỗi module tuân theo cấu trúc chuẩn:

```
module-name/
├── controllers/           # Xử lý HTTP requests
├── routes/                # Định nghĩa API endpoints
├── services/              # Business logic
├── repositories/          # Database operations (optional)
├── middleware/            # Module-specific middleware (optional)
└── README.md              # Documentation
```

## Danh sách Modules

### 1. Core Modules

#### [Analytics](src/modules/analytics/README.md)
Theo dõi và phân tích lỗi của người dùng, xác định điểm yếu để cải thiện trải nghiệm học tập.

#### [Auth](src/modules/auth/README.md)
Xác thực và phân quyền người dùng với JWT và OAuth 2.0 (Google).

#### [User](src/modules/user/README.md)
Quản lý thông tin người dùng, profile, session, password và export/import dữ liệu.

### 2. AI & Learning Modules

#### [Chat](src/modules/chat/README.md)
Chatbot AI thông minh với RAG (Retrieval-Augmented Generation), web search, và quản lý hội thoại.

**Tính năng nổi bật:**
- Multi-stage retrieval
- Semantic clustering
- Adaptive retrieval
- Context reranking
- Intent classification

#### [Knowledge](src/modules/knowledge/README.md)
Quản lý cơ sở tri thức với vector embedding và semantic search.

#### [Learning](src/modules/learning/README.md)
Lộ trình học tập có cấu trúc (curriculum) với AI learning assistant.

### 3. Skills Modules (4 kỹ năng)

#### [Listening](src/modules/listening/README.md)
Bài tập luyện nghe với tự động chấm điểm và AI feedback.

#### [Speaking](src/modules/speaking/README.md)
Đánh giá phát âm và ngữ điệu bằng Azure Speech Service.

#### [Reading](src/modules/reading/README.md)
Bài tập luyện đọc hiểu với nhiều dạng câu hỏi.

#### [Writing](src/modules/writing/README.md)
Đánh giá bài viết tự động với AI grading (grammar, vocabulary, coherence).

#### [Vocabulary](src/modules/vocabulary/README.md)
Quản lý từ vựng với spaced repetition system (SRS).

### 4. Business Modules

#### [Subscription](src/modules/subscription/README.md)
Quản lý gói đăng ký (Free, Premium, Enterprise) và feature access control.

#### [Wallet](src/modules/wallet/README.md)
Ví điện tử với tích hợp MoMo và VNPay.

#### [Usage](src/modules/usage/README.md)
Theo dõi usage và tính toán chi phí API calls.

### 5. Utility Modules

#### [Upload](src/modules/upload/README.md)
Xử lý upload file (images, audio, documents) với validation và processing.

#### [Settings](src/modules/settings/README.md)
Quản lý cài đặt hệ thống và cá nhân.

## Database Schema

### Core Tables
- `users` - Thông tin người dùng
- `user_sessions` - Quản lý session
- `user_settings` - Cài đặt cá nhân

### Learning Tables
- `learning_units`, `learning_lessons` - Curriculum
- `user_lesson_progress` - Tiến độ học tập
- `system_vocabulary`, `user_vocabulary` - Từ vựng
- `listening_exercises`, `listening_submissions` - Listening
- `reading_passages`, `reading_submissions` - Reading
- `speaking_topics`, `speaking_submissions` - Speaking
- `writing_exercises`, `writing_submissions` - Writing

### AI & Knowledge Tables
- `knowledge_base` - Knowledge base với vector embeddings
- `conversations`, `chat_history` - Lịch sử chat
- `suggestions` - Gợi ý câu hỏi
- `unanswered_questions` - Câu hỏi chưa trả lời

### Analytics Tables
- `user_mistake_logs` - Lỗi của người dùng
- `usage_logs` - Usage tracking

### Business Tables
- `subscription_plans`, `user_subscriptions` - Đăng ký
- `wallets`, `wallet_transactions` - Ví điện tử
- `withdrawal_requests` - Yêu cầu rút tiền

## API Architecture

### RESTful API
Tất cả modules expose RESTful API endpoints:
- `GET /api/{module}` - List resources
- `GET /api/{module}/:id` - Get resource
- `POST /api/{module}` - Create resource
- `PUT /api/{module}/:id` - Update resource
- `DELETE /api/{module}/:id` - Delete resource

### Authentication
- JWT-based authentication
- Bearer token trong header
- Refresh token mechanism

### Authorization
- Role-based access control (RBAC)
- Subscription-based feature access
- Middleware: `authMiddleware`, `roleMiddleware`

## Advanced Features

### RAG (Retrieval-Augmented Generation)
Module Chat sử dụng RAG pipeline phức tạp:
1. **Multi-stage Retrieval**: Vector search + keyword matching
2. **Semantic Clustering**: Nhóm context tương tự
3. **Multi-hop Reasoning**: Kết hợp nhiều nguồn
4. **Adaptive Retrieval**: Điều chỉnh số lượng context động
5. **Context Reranking**: Sắp xếp lại theo relevance

### Vector Search
- PostgreSQL với pgvector extension
- OpenAI text-embedding-ada-002 (1536 dimensions)
- Cosine similarity search
- Hybrid search (vector + keyword)

### AI Integration
- **OpenAI GPT-4**: Chat, writing assessment, content generation
- **Azure Speech**: Pronunciation assessment, transcription
- **OpenAI Embeddings**: Vector search, semantic similarity

## Security

### Authentication & Authorization
- JWT with refresh tokens
- OAuth 2.0 (Google)
- Password hashing với bcrypt
- Session management

### Data Protection
- Input validation
- SQL injection prevention
- XSS protection
- CORS configuration
- Rate limiting

### Payment Security
- Signature verification (MoMo, VNPay)
- Transaction validation
- Secure webhook handling

## Performance Optimization

### Database
- Indexing cho các truy vấn thường xuyên
- Connection pooling
- Query optimization

### Caching
- Redis cho session và cache
- CDN cho static files

### API
- Pagination cho list endpoints
- Lazy loading
- Response compression

## Monitoring & Analytics

### Usage Tracking
- API call tracking
- Token usage monitoring
- Cost calculation

### Error Tracking
- User mistake logs
- Error analytics
- Performance metrics

## Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=english_chatbot
DB_USER=postgres
DB_PASSWORD=password

# JWT
JWT_SECRET=your_secret
JWT_REFRESH_SECRET=your_refresh_secret

# OpenAI
OPENAI_API_KEY=sk-...

# Azure Speech
AZURE_SPEECH_KEY=...
AZURE_SPEECH_REGION=...

# Payment Gateways
MOMO_PARTNER_CODE=...
MOMO_ACCESS_KEY=...
VNPAY_TMN_CODE=...
VNPAY_HASH_SECRET=...
```

## Development

### Setup
```bash
cd backend
npm install
npm run dev
```

### Testing
```bash
npm test
```

### Database Migration
```bash
npm run migrate
```

## Deployment

### Production Build
```bash
npm run build
npm start
```

### Docker
```bash
docker-compose up -d
```

## Roadmap

### Short-term
- [ ] Real-time collaboration features
- [ ] Mobile app API optimization
- [ ] Advanced analytics dashboard
- [ ] A/B testing framework

### Long-term
- [ ] Multi-language support
- [ ] Voice conversation practice
- [ ] Gamification system
- [ ] Social learning features
- [ ] AI tutor personalization

## Contributing

Mỗi module có documentation riêng trong file README.md. Vui lòng đọc trước khi contribute.

## License

Proprietary - All rights reserved

---

**Cập nhật lần cuối**: 2026-03-27
