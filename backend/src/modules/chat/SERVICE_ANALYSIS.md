# Chat Module - Service Analysis

## Tổng quan
Module Chat cung cấp hệ thống chatbot thông minh với RAG (Retrieval-Augmented Generation), tích hợp tìm kiếm web, phân loại intent, và quản lý hội thoại. Hệ thống sử dụng OpenAI GPT-4, vector embeddings, và Tavily AI để trả lời câu hỏi người dùng.

## Kiến trúc
- **4 Service Files**: chat.service.js, conversation.service.js, suggestion.service.js, unanswered.service.js
- **RAG Pipeline**: Multi-stage retrieval, semantic clustering, re-ranking
- **Intent Classification**: GREETING, KNOWLEDGE, LIVE_SEARCH, USER_PROGRESS, OFF_TOPIC
- **Web Search Fallback**: Tự động tìm kiếm web khi không tìm thấy trong knowledge base
- **Streaming Support**: Server-Sent Events (SSE) cho real-time response

---

## 1. chat.service.js

### 1.1. processChat()
**Mục đích**: Xử lý câu hỏi của người dùng với RAG pipeline đầy đủ

**Parameters**:
- `userId` (number): ID người dùng
- `message` (string): Câu hỏi
- `model` (object): Cấu hình LLM {url, name}
- `conversationId` (string): ID hội thoại

**Returns**: Object chứa reply, chunks_used, reasoning_steps, conversationId

**Logic Flow**:
1. Lấy lịch sử hội thoại (6 tin nhắn gần nhất)
2. Rewrite query nếu có context (chuyển câu hỏi follow-up thành standalone)
3. Phân loại intent (classifyIntent)
4. Route đến handler tương ứng:
   - USER_PROGRESS → _handleProgressQuery()
   - OFF_TOPIC → Từ chối trả lời
   - GREETING → _handleGreeting()
   - LIVE_SEARCH → _handleLiveSearch()
   - KNOWLEDGE → _handleKnowledgeRAG()

**SQL Queries**:
```sql
-- Lấy lịch sử hội thoại
SELECT question, bot_reply FROM user_questions
WHERE user_id = ? AND conversation_id = ?
ORDER BY created_at DESC LIMIT ?
```

**Code Example**:
```javascript
const result = await chatService.processChat({
  userId: 123,
  message: "Giải thích về SRS algorithm",
  model: { url: 'https://api.openai.com/v1', name: 'gpt-4o-mini' },
  conversationId: 'abc123'
});
// Returns: { reply, chunks_used, reasoning_steps, conversationId }
```

**Best Practices**:
- Luôn rewrite query để xử lý follow-up questions
- Phân loại intent trước khi xử lý để tối ưu performance
- Sử dụng web search fallback khi KB không có thông tin

---

### 1.2. _handleKnowledgeRAG()
**Mục đích**: Xử lý câu hỏi bằng RAG pipeline với multi-stage retrieval

**Logic Flow**:
1. Tạo embedding cho câu hỏi
2. Adaptive retrieval (xác định số chunks cần lấy)
3. Multi-stage retrieval (vector + keyword + hybrid)
4. Re-ranking với cross-encoder
5. Semantic clustering và multi-hop reasoning
6. Fuse context và gọi LLM
7. Fallback sang web search nếu 0 chunks

**SQL Queries**: Sử dụng pgvector trong multiStageRetrieval()

**Code Example**:
```javascript
const result = await chatService._handleKnowledgeRAG({
  userId: 123,
  message: "SRS là gì?",
  processingMessage: "SRS (Spaced Repetition System) là gì?",
  history: [],
  modelConfig: { url: '...', name: 'gpt-4o-mini' },
  conversationId: 'abc',
  intent: 'KNOWLEDGE',
  reasoning: 'Educational query'
});
```

---

### 1.3. _handleLiveSearch()
**Mục đích**: Tìm kiếm thông tin real-time từ internet

**Logic Flow**:
1. Gọi performWebSearch() với Tavily AI
2. Build system prompt cho web search
3. Gọi LLM với search context
4. Format markdown và trả về với sources

**Code Example**:
```javascript
const result = await chatService._handleLiveSearch({
  userId: 123,
  message: "Tin tức AI mới nhất?",
  processingMessage: "Tin tức về AI mới nhất năm 2026",
  history: [],
  modelConfig: { url: '...', name: 'gpt-4o-mini' },
  conversationId: 'abc',
  reasoning: 'Current events query'
});
// Returns: { reply, web_sources: [{title, url}], source_type: 'web_search' }
```

---

### 1.4. _handleProgressQuery()
**Mục đích**: Trả lời câu hỏi về tiến độ học tập của user

**SQL Queries**:
```sql
-- Tổng quan tiến độ
SELECT COUNT(DISTINCT uv.id) as vocabulary_count,
       COUNT(DISTINCT CASE WHEN uv.mastery >= 3 THEN uv.id END) as mastered_words,
       COUNT(DISTINCT ls.id) as listening_completed,
       COUNT(DISTINCT rs.id) as reading_completed,
       COUNT(DISTINCT ss.id) as speaking_completed,
       COUNT(DISTINCT ws.id) as writing_completed
FROM users u
LEFT JOIN user_vocabulary uv ON u.id = uv.user_id
LEFT JOIN listening_submissions ls ON u.id = ls.user_id
LEFT JOIN reading_submissions rs ON u.id = rs.user_id
LEFT JOIN speaking_submissions ss ON u.id = ss.user_id
LEFT JOIN writing_submissions ws ON u.id = ws.user_id
WHERE u.id = ?

-- Từ vựng theo level
SELECT level, COUNT(*) as count
FROM user_vocabulary
WHERE user_id = ?
GROUP BY level ORDER BY level

-- Learning streaks
SELECT current_streak, longest_streak, last_activity_date,
       total_exercises, total_words_learned, avg_score, badges
FROM learning_streaks WHERE user_id = ?
```

**Logic Flow**:
1. Query 8 bảng khác nhau (vocabulary, listening, reading, speaking, writing, learning_history, learning_streaks)
2. Tổng hợp thành context text
3. Gọi LLM với context để trả lời câu hỏi cụ thể
4. Lưu chat và track usage

---

### 1.5. streamChat()
**Mục đích**: Xử lý chat với Server-Sent Events (SSE) streaming

**Parameters**:
- `sendEvent` (function): Callback để gửi events (status, text, done)

**Logic Flow**:
1. Gửi status: "🧭 Đang phân tích ngữ cảnh..."
2. Rewrite query nếu có history
3. Classify intent
4. Route đến stream handler tương ứng:
   - _streamUserProgress()
   - _streamGreeting()
   - _streamLiveSearch()
   - _streamKnowledge()
5. Gửi text chunks qua sendEvent('text', {content})
6. Lưu chat và gửi done event

**Code Example**:
```javascript
await chatService.streamChat({
  userId: 123,
  message: "Giải thích SRS",
  model: { url: '...', name: 'gpt-4o-mini' },
  conversationId: 'abc'
}, (eventType, data) => {
  if (eventType === 'status') console.log(data.content);
  if (eventType === 'text') res.write(`data: ${JSON.stringify(data)}\n\n`);
  if (eventType === 'done') res.end();
});
```

---

### 1.6. rewriteQuery()
**Mục đích**: Chuyển câu hỏi follow-up thành standalone question

**Logic Flow**:
1. Lấy 4 tin nhắn gần nhất từ history
2. Gọi LLM với system prompt chuyên biệt
3. Thay thế đại từ (nó, anh ấy, cái đó) bằng danh từ cụ thể
4. Trả về câu hỏi đã viết lại

**Code Example**:
```javascript
// Input: "Nó hoạt động như thế nào?"
// History: ["User: SRS là gì?", "AI: SRS là Spaced Repetition System..."]
const rewritten = await chatService.rewriteQuery(
  "Nó hoạt động như thế nào?",
  history,
  modelConfig
);
// Output: "SRS (Spaced Repetition System) hoạt động như thế nào?"
```

---

### 1.7. logUnanswered()
**Mục đích**: Ghi log câu hỏi không trả lời được (0 chunks)

**SQL Queries**:
```sql
-- Check duplicate bằng hash
SELECT 1 FROM unanswered_questions WHERE hash = ? LIMIT 1

-- Insert nếu chưa tồn tại
INSERT INTO unanswered_questions (question, hash, created_at)
VALUES (?, ?, NOW())
```

**Security**: Sử dụng SHA-256 hash để tránh duplicate

---

### 1.8. saveChat()
**Mục đích**: Lưu câu hỏi và câu trả lời vào database

**SQL Queries**:
```sql
-- Check số lượng tin nhắn trong conversation
SELECT COUNT(*) as count FROM user_questions
WHERE user_id = ? AND conversation_id = ?

-- Insert chat message
INSERT INTO user_questions
(user_id, conversation_id, conversation_title, question, bot_reply, is_answered, metadata)
VALUES (?, ?, ?, ?, ?, ?, ?)
```

**Logic**: Tự động tạo conversation_title từ câu hỏi đầu tiên (50 ký tự)

---

## 2. conversation.service.js

### 2.1. generateConversationId()
**Mục đích**: Tạo ID ngẫu nhiên cho conversation

**Returns**: String hex 32 ký tự

**Code Example**:
```javascript
const id = conversationService.generateConversationId();
// Returns: "a1b2c3d4e5f6..."
```

---

### 2.2. getUserConversations()
**Mục đích**: Lấy danh sách conversations của user

**SQL Queries**:
```sql
SELECT
  conversation_id,
  COALESCE(MAX(CASE WHEN conversation_title IS NOT NULL AND conversation_title != ''
    THEN conversation_title END), MAX(conversation_title)) as conversation_title,
  COUNT(*) as message_count,
  MAX(created_at) as last_message_at,
  MIN(created_at) as created_at,
  COALESCE(MAX(is_archived::int)::boolean, FALSE) as is_archived,
  COALESCE(MAX(is_pinned::int)::boolean, FALSE) as is_pinned
FROM user_questions
WHERE user_id = ? AND conversation_id IS NOT NULL
GROUP BY conversation_id
ORDER BY is_pinned DESC, last_message_at DESC
LIMIT 100
```

**Features**:
- Pinned conversations xuất hiện đầu tiên
- Sắp xếp theo thời gian tin nhắn cuối
- Giới hạn 100 conversations

---

### 2.3. renameConversation()
**Mục đích**: Đổi tên conversation

**SQL Queries**:
```sql
UPDATE user_questions
SET conversation_title = ?, updated_at = NOW()
WHERE user_id = ? AND conversation_id = ?
```

**Returns**: Boolean (true nếu update thành công)

---

### 2.4. getConversationMessages()
**Mục đích**: Lấy tất cả tin nhắn trong conversation

**SQL Queries**:
```sql
SELECT id, question, bot_reply, is_answered, created_at, metadata
FROM user_questions
WHERE user_id = ? AND conversation_id = ?
ORDER BY created_at ASC
```

---

### 2.5. archiveConversation()
**Mục đích**: Archive/unarchive conversation

**SQL Queries**:
```sql
UPDATE user_questions
SET is_archived = ?, updated_at = NOW()
WHERE user_id = ? AND conversation_id = ?
```

---

### 2.6. pinConversation()
**Mục đích**: Pin/unpin conversation lên đầu danh sách

**SQL Queries**:
```sql
UPDATE user_questions
SET is_pinned = ?, updated_at = NOW()
WHERE user_id = ? AND conversation_id = ?
```

---

### 2.7. deleteConversation()
**Mục đích**: Xóa toàn bộ conversation và messages

**SQL Queries**:
```sql
DELETE FROM user_questions
WHERE user_id = ? AND conversation_id = ?
```

**Security**: Cascade delete tất cả messages trong conversation

---

### 2.8. deleteMessage()
**Mục đích**: Xóa 1 message cụ thể

**SQL Queries**:
```sql
DELETE FROM user_questions WHERE id = ? AND user_id = ?
```

**Returns**: Boolean (true nếu xóa thành công)

---

## 3. suggestion.service.js

### 3.1. suggestNextWord()
**Mục đích**: Gợi ý từ tiếp theo khi user đang gõ (autocomplete)

**API Call**:
```javascript
POST https://api.openai.com/v1/completions
{
  model: 'gpt-3.5-turbo-instruct',
  prompt: userInput,
  max_tokens: 3,
  temperature: 0.7,
  logprobs: 5
}
```

**Returns**: String (từ tiếp theo được gợi ý)

**Code Example**:
```javascript
const next = await suggestionService.suggestNextWord("I want to learn");
// Returns: " English" hoặc " programming"
```

---

### 3.2. suggestDictionary()
**Mục đích**: Gợi ý từ vựng từ dictionary (prefix search)

**SQL Queries**:
```sql
SELECT DISTINCT word_en FROM dictionary
WHERE word_en LIKE ?
ORDER BY word_en LIMIT 10
```

**Code Example**:
```javascript
const words = await suggestionService.suggestDictionary("app");
// Returns: ["apple", "application", "apply", "approach", ...]
```

**Performance**: Sử dụng LIKE với prefix (app%) và LIMIT 10

---

## 4. unanswered.service.js

### 4.1. getUnansweredQuestions()
**Mục đích**: Lấy danh sách câu hỏi chưa trả lời được (admin)

**SQL Queries**:
```sql
SELECT id, question FROM unanswered_questions
ORDER BY created_at DESC
```

---

### 4.2. deleteUnanswered()
**Mục đích**: Xóa câu hỏi khỏi danh sách unanswered

**SQL Queries**:
```sql
DELETE FROM unanswered_questions WHERE id = ?
```

---

## Best Practices

### Security
1. **Hash Questions**: Sử dụng SHA-256 để tránh duplicate unanswered questions
2. **User Isolation**: Luôn filter theo userId trong queries
3. **Input Validation**: Trim và validate tất cả user input
4. **Sensitive Info Masking**: maskSensitiveInfo() cho phone/email

### Performance
1. **Conversation History Limit**: Chỉ lấy 6 tin nhắn gần nhất
2. **Adaptive Retrieval**: Động điều chỉnh số chunks dựa trên query complexity
3. **Re-ranking**: Sử dụng cross-encoder để chọn chunks tốt nhất
4. **Streaming**: SSE cho real-time response, giảm perceived latency

### RAG Pipeline
1. **Multi-Stage Retrieval**: Vector + Keyword + Hybrid search
2. **Semantic Clustering**: Nhóm chunks tương tự để giảm redundancy
3. **Multi-Hop Reasoning**: Kết nối thông tin từ nhiều chunks
4. **Web Search Fallback**: Tự động tìm kiếm web khi KB không có thông tin

### Intent Classification
1. **5 Intents**: GREETING, KNOWLEDGE, LIVE_SEARCH, USER_PROGRESS, OFF_TOPIC
2. **Early Routing**: Phân loại trước khi xử lý để tối ưu
3. **Reasoning Tracking**: Ghi lại lý do phân loại cho debugging

---

## Future Improvements

1. **Caching**: Cache embeddings và search results
2. **Personalization**: Học preferences của từng user
3. **Multi-Modal**: Hỗ trợ hình ảnh trong chat
4. **Voice Input**: Tích hợp speech-to-text
5. **Conversation Summarization**: Tóm tắt conversations dài
6. **Smart Suggestions**: Gợi ý câu hỏi dựa trên context
7. **A/B Testing**: Test các RAG strategies khác nhau
8. **Analytics Dashboard**: Theo dõi intent distribution, response quality
