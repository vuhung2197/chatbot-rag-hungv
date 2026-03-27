# DANH SÁCH FILE PHÂN TÍCH SERVICE

## Tổng quan

Tài liệu này liệt kê tất cả các file phân tích chi tiết về các hàm trong service của từng module trong backend.

---

## File đã tạo

### 1. Analytics Module
📄 [analytics/SERVICE_ANALYSIS.md](src/modules/analytics/SERVICE_ANALYSIS.md)

**Nội dung**:
- `logMistake()` - Ghi nhận lỗi của người dùng
- `getTopWeaknesses()` - Lấy điểm yếu phổ biến nhất
- `getRecentMistakes()` - Lấy lịch sử lỗi gần đây
- Tích hợp với Speaking, Writing modules
- Best practices và performance optimization

---

### 2. Vocabulary Module
📄 [vocabulary/SERVICE_ANALYSIS.md](src/modules/vocabulary/SERVICE_ANALYSIS.md)

**Nội dung**:
- **Service Layer**:
  - `getSystemVocabulary()` - Lấy từ vựng hệ thống
  - `getRecommendWords()` - Gợi ý từ mới
  - `addSystemWordToUser()` - Thêm từ vào danh sách cá nhân
  - `getUserVocabulary()` - Lấy từ vựng cá nhân
  - `updateMastery()` - Cập nhật độ thành thạo

- **Repository Layer**:
  - Chi tiết SQL queries
  - Spaced Repetition Algorithm
  - Deterministic random algorithm

- **SRS System**:
  - Mastery levels (0-5)
  - Review intervals (exponential backoff)
  - Update logic

---

### 3. Wallet Module
📄 [wallet/SERVICE_ANALYSIS.md](src/modules/wallet/SERVICE_ANALYSIS.md)

**Nội dung**:
- `getWalletOverview()` - Lấy/tạo ví
- `getTransactions()` - Lịch sử giao dịch với pagination
- `getWalletStats()` - Thống kê tổng quan
- `updateCurrency()` - Đổi loại tiền tệ
- Transaction types và status
- Payment gateway integration (MoMo, VNPay)
- Security considerations
- Transaction atomicity

---

### 4. Speaking Module
📄 [speaking/SERVICE_ANALYSIS.md](src/modules/speaking/SERVICE_ANALYSIS.md)

**Nội dung**:
- **Helper Functions**:
  - `gradePronunciationType()` - Chấm phát âm với Azure
  - `gradeByTopicType()` - Chấm theo loại topic
  - `extractKnowledgeItems()` - Trích xuất lỗi
  - `logMistakesToAnalytics()` - Ghi nhận lỗi
  - `saveKnowledgeBatch()` - Lưu knowledge

- **Main Functions**:
  - `getTopics()` - Lấy danh sách topics
  - `submitSpeaking()` - Nộp bài nói (chi tiết 7 steps)
  - `ensureTopicAudio()` - Tạo audio TTS

- **Topic Types**:
  - Pronunciation, Shadowing, Reflex, Topic
  - Grading criteria cho từng loại

- **Azure Speech Integration**:
  - Pronunciation Assessment API
  - AI Grading fallback

---

### 5. Auth Module
📄 [auth/SERVICE_ANALYSIS.md](src/modules/auth/SERVICE_ANALYSIS.md)

**Nội dung**:
- `findUserById()` - Tìm user theo ID
- `createUser()` - Tạo user mới với bcrypt
- `upsertUser()` - Tạo hoặc cập nhật user (OAuth)
- `createSession()` - Tạo JWT session
- `verifySession()` - Verify JWT token
- OAuth 2.0 integration (Google)
- JWT token management
- Security best practices

---

### 6. Usage Module
📄 [usage/SERVICE_ANALYSIS.md](src/modules/usage/SERVICE_ANALYSIS.md)

**Nội dung**:
- `incrementUsage()` - Tăng usage counter
- `trackUsage()` - Theo dõi chi tiết usage
- `getSubscriptionLimits()` - Lấy giới hạn theo gói
- `checkLimit()` - Kiểm tra đã vượt limit chưa
- Usage types và limits
- Subscription tier management

---

### 7. Subscription Module
📄 [subscription/SERVICE_ANALYSIS.md](src/modules/subscription/SERVICE_ANALYSIS.md)

**Nội dung**:
- `upgradeSubscription()` - Nâng cấp gói (10 steps transaction)
- `getSubscriptionInfo()` - Thông tin gói hiện tại
- `cancelSubscription()` - Hủy gói
- Tier hierarchy (Free → Basic → Premium → Enterprise)
- Payment integration
- Transaction atomicity

---

### 8. Upload Module
📄 [upload/SERVICE_ANALYSIS.md](src/modules/upload/SERVICE_ANALYSIS.md)

**Nội dung**:
- `processFile()` - Xử lý file upload (9 steps)
- `extractTextFromDocx()` - Parse DOCX với mammoth
- `chunkText()` - Chia text thành chunks
- `generateEmbeddings()` - Tạo vector embeddings
- File type support (PDF, DOCX, TXT)
- Vietnamese filename handling
- Chunking strategy

---

### 9. Knowledge Module
📄 [knowledge/SERVICE_ANALYSIS.md](src/modules/knowledge/SERVICE_ANALYSIS.md)

**Nội dung**:
- `addKnowledge()` - Thêm knowledge với embeddings
- `searchKnowledge()` - Semantic search với pgvector
- `updateKnowledge()` - Cập nhật knowledge
- `deleteKnowledge()` - Xóa knowledge
- Vector embeddings với OpenAI
- Chunking strategy (500 chars, 50 overlap)
- Cosine similarity search

---

### 10. Learning Module
📄 [learning/SERVICE_ANALYSIS.md](src/modules/learning/SERVICE_ANALYSIS.md)

**Nội dung**:
- `generateLesson()` - Tạo bài học với GPT-4
- `submitQuiz()` - Nộp quiz và chấm điểm
- `getLearningHistory()` - Lịch sử học tập
- `updateStreak()` - Cập nhật streak
- AI-generated lessons
- Streak system
- Badge system

---

### 11. Reading Module
📄 [reading/SERVICE_ANALYSIS.md](src/modules/reading/SERVICE_ANALYSIS.md)

**Nội dung**:
- `getPassages()` - Lấy đoạn văn theo level
- `submitQuiz()` - Nộp quiz đọc hiểu
- `gradeQuiz()` - Chấm điểm tự động
- Question types (multiple choice, true/false)
- Difficulty levels (A1-C2)
- Score calculation

---

### 12. Writing Module
📄 [writing/SERVICE_ANALYSIS.md](src/modules/writing/SERVICE_ANALYSIS.md)

**Nội dung**:
- `getExercises()` - Lấy bài tập viết
- `submitWriting()` - Nộp bài viết (9 steps)
- `gradeWriting()` - Chấm bài với AI
- `extractMistakes()` - Trích xuất lỗi
- AI grading với GPT-4
- Mistake categorization
- Streak system

---

### 13. Listening Module
📄 [listening/SERVICE_ANALYSIS.md](src/modules/listening/SERVICE_ANALYSIS.md)

**Nội dung**:
- `getExercises()` - Lấy bài tập nghe
- `submitDictation()` - Nộp bài dictation
- `gradeListening()` - Chấm điểm với AI
- Audio file management
- Transcription comparison
- Score calculation

---

### 14. Chat Module
📄 [chat/SERVICE_ANALYSIS.md](src/modules/chat/SERVICE_ANALYSIS.md)

**Nội dung**:
- **chat.service.js**:
  - `processChat()` - Xử lý chat với RAG pipeline
  - `_handleKnowledgeRAG()` - RAG với multi-stage retrieval
  - `_handleLiveSearch()` - Tìm kiếm web với Tavily AI
  - `_handleProgressQuery()` - Trả lời về tiến độ học tập
  - `streamChat()` - SSE streaming
  - `rewriteQuery()` - Chuyển follow-up thành standalone

- **conversation.service.js**:
  - `getUserConversations()` - Danh sách conversations
  - `renameConversation()` - Đổi tên conversation
  - `archiveConversation()` - Archive conversation
  - `deleteConversation()` - Xóa conversation

- **suggestion.service.js**:
  - `suggestNextWord()` - Autocomplete với GPT-3.5
  - `suggestDictionary()` - Gợi ý từ dictionary

- **unanswered.service.js**:
  - `getUnansweredQuestions()` - Câu hỏi chưa trả lời
  - `deleteUnanswered()` - Xóa khỏi danh sách

- **RAG Pipeline**: Multi-stage retrieval, semantic clustering, re-ranking
- **Intent Classification**: 5 intents (GREETING, KNOWLEDGE, LIVE_SEARCH, USER_PROGRESS, OFF_TOPIC)
- **Web Search Fallback**: Tự động khi KB không có thông tin

---

### 15. Settings Module
📄 [settings/SERVICE_ANALYSIS.md](src/modules/settings/SERVICE_ANALYSIS.md)

**Nội dung**:
- `getPublicEnvKeys()` - Lấy public config (OAuth)
- `updatePublicEnvKeys()` - Cập nhật public config
- `getEnvKeys()` - Lấy tất cả env keys (admin)
- `updateEnvKeys()` - Cập nhật env keys (admin)
- `parseEnvFile()` - Parse .env file
- Hot reload (cập nhật process.env runtime)
- 26 config keys (Database, AI, Payment, Email)
- Security: Public/Private key separation

---

### 16. User Module
📄 [user/SERVICE_ANALYSIS.md](src/modules/user/SERVICE_ANALYSIS.md)

**Nội dung**:
- **user.service.js**:
  - `getProfile()` - Lấy profile với hasPassword flag
  - `updateProfile()` - Cập nhật profile
  - `uploadAvatar()` - Upload avatar với Sharp (resize 200x200)
  - `deleteAvatar()` - Xóa avatar
  - `sendEmailVerification()` - Gửi email verification
  - `verifyEmail()` - Verify email bằng token

- **password.service.js**:
  - `changePassword()` - Đổi password (bcrypt)
  - `requestPasswordReset()` - Yêu cầu reset password
  - `resetPassword()` - Reset password bằng token (1h expiration)
  - `setPasswordForOAuthUser()` - Set password cho OAuth user

- **session.service.js**:
  - `getSessions()` - Danh sách sessions (multi-device)
  - `revokeSession()` - Logout một device
  - `revokeAllOtherSessions()` - Logout tất cả devices khác

- **export-import.service.js**:
  - `exportUserData()` - Export toàn bộ data (GDPR)
  - `importUserData()` - Import data với transaction

- **Security**: Bcrypt, SHA-256 token hash, email verification
- **Image Processing**: Sharp cho avatar optimization
- **GDPR Compliance**: Export/import functionality

---

## Cấu trúc File Phân tích

Mỗi file SERVICE_ANALYSIS.md bao gồm:

### 1. Tổng quan
- Tên file service
- Mô tả chức năng chính

### 2. Phân tích từng hàm
Cho mỗi hàm:
- **Mục đích**: Giải thích hàm làm gì
- **Parameters**: Chi tiết các tham số
- **Returns**: Format dữ liệu trả về
- **Logic xử lý**: Các bước thực hiện
- **SQL Queries**: Câu query database (nếu có)
- **Ví dụ sử dụng**: Code examples
- **Use cases**: Khi nào dùng hàm này

### 3. Algorithms & Patterns
- Giải thích thuật toán đặc biệt
- Design patterns được sử dụng
- Trade-offs và lý do chọn approach

### 4. Integration
- Tích hợp với modules khác
- Data flow giữa các modules

### 5. Best Practices
- Cách sử dụng đúng
- Common pitfalls cần tránh
- Error handling

### 6. Performance Optimization
- Database indexes
- Caching strategies
- Query optimization

### 7. Security Considerations
- Validation
- SQL injection prevention
- Transaction safety

### 8. Cải tiến trong tương lai
- Roadmap features
- Technical debt
- Optimization opportunities

---

## Tổng kết

Tất cả 16 modules đã có file SERVICE_ANALYSIS.md chi tiết:

✅ **Analytics** - Phân tích lỗi và điểm yếu
✅ **Auth** - Xác thực và phân quyền
✅ **Chat** - Chatbot AI với RAG
✅ **Knowledge** - Quản lý knowledge base
✅ **Learning** - Lộ trình học tập
✅ **Listening** - Bài tập luyện nghe
✅ **Reading** - Bài tập luyện đọc
✅ **Settings** - Cài đặt hệ thống
✅ **Speaking** - Bài tập luyện nói
✅ **Subscription** - Quản lý gói đăng ký
✅ **Upload** - Xử lý upload file
✅ **Usage** - Theo dõi usage
✅ **User** - Quản lý người dùng
✅ **Vocabulary** - Quản lý từ vựng với SRS
✅ **Wallet** - Quản lý ví và giao dịch
✅ **Writing** - Bài tập luyện viết

---

## Cách sử dụng tài liệu

### Cho Developers
1. Đọc file README.md của module để hiểu tổng quan
2. Đọc SERVICE_ANALYSIS.md để hiểu chi tiết implementation
3. Tham khảo code examples để implement tính năng mới

### Cho Code Reviewers
1. Check logic xử lý có đúng với documentation không
2. Verify security considerations được implement
3. Ensure best practices được follow

### Cho New Team Members
1. Bắt đầu với ARCHITECTURE.md để hiểu big picture
2. Đọc README.md của module cần làm việc
3. Deep dive vào SERVICE_ANALYSIS.md để hiểu chi tiết

---

## Quy ước viết tài liệu

### Format
- Sử dụng Markdown
- Code blocks với syntax highlighting
- Ví dụ cụ thể cho mọi hàm

### Nội dung
- Giải thích "why" không chỉ "what"
- Bao gồm edge cases và error handling
- Cung cấp context về design decisions

### Cập nhật
- Update khi có thay đổi logic quan trọng
- Thêm examples khi có use case mới
- Document breaking changes

---

## Liên hệ

Nếu có câu hỏi về tài liệu hoặc cần thêm phân tích cho module nào, vui lòng tạo issue hoặc liên hệ team.

---

**Cập nhật lần cuối**: 2026-03-27
