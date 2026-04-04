# Các Kỹ Thuật Hay Trong Hệ Thống

## 1. 🔐 BẢO MẬT (Security)

### JWT + Server-side Session Hybrid
**File:** `backend/src/shared/middlewares/auth.middleware.js`

**Kỹ thuật:**
- JWT để verify signature + expiry
- SHA256 hash token lưu vào DB để có thể revoke
- Kết hợp ưu điểm của cả stateless (JWT) và stateful (session)

**Tại sao hay:**
- Logout thực sự (xóa session)
- Revoke token khi bị lộ
- Trade-off: 1 query DB mỗi request

**Đọc thêm:** `backend/src/modules/auth/JWT_GUIDE.md`

---

### Bcrypt Password Hashing
**File:** `backend/src/modules/auth/services/auth.service.js`

**Kỹ thuật:**
- Bcrypt với 10 salt rounds
- Slow hash → chống brute-force
- Mỗi password có salt riêng

**Code:**
```javascript
const hashedPassword = await bcrypt.hash(password, 10);
const isMatch = await bcrypt.compare(password, user.password);
```

---

### OAuth 2.0 Integration
**File:** `backend/src/modules/auth/controllers/auth.controller.js`

**Kỹ thuật:**
- Google OAuth với authorization code flow
- Upsert pattern: tìm user theo email, không có thì tạo mới
- Link/unlink multiple providers

**Use case:** Cho phép user login bằng Google, sau đó link thêm password

---

### Payment Gateway Signature
**File:** `backend/services/momoService.js`, `vnpayService.js`

**Kỹ thuật:**
- HMAC-SHA256 signature để verify request/response
- Sorted parameters trước khi sign (VNPay)
- Prevent tampering với payment amount

**Code:**
```javascript
const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(rawSignature)
    .digest('hex');
```

---

### Input Sanitization
**File:** `backend/src/modules/chat/services/chat.service.js`

**Kỹ thuật:**
- Regex mask sensitive info (phone, email, SSN)
- XSS-safe Markdown rendering
- SQL injection prevention (parameterized queries)

---

## 2. 🤖 AI/ML INTEGRATION

### Advanced RAG (Retrieval-Augmented Generation)
**File:** `backend/services/advancedRAGFixed.js`

**Kỹ thuật:**
- **Hybrid retrieval:** Vector search + Full-text search
- **Reciprocal Rank Fusion (RRF):** Kết hợp kết quả từ nhiều nguồn
- **Semantic clustering:** Nhóm documents tương tự
- **Multi-hop reasoning:** Trả lời câu hỏi phức tạp qua nhiều bước
- **Context reranking:** Sắp xếp lại kết quả theo relevance

**Tại sao hay:**
- Vector search: tìm theo nghĩa (semantic)
- Full-text search: tìm theo từ khóa chính xác
- RRF: kết hợp cả 2 → kết quả tốt hơn

**Đọc thêm:** Tìm hiểu về RAG, vector embeddings, HNSW indexing

---

### Vector Database với pgvector
**File:** `backend/services/vectorDatabase.js`

**Kỹ thuật:**
- PostgreSQL extension: pgvector
- HNSW indexing (Hierarchical Navigable Small World)
- Cosine similarity search
- 1536 dimensions (OpenAI ada-002)

**Code:**
```sql
CREATE EXTENSION vector;
CREATE INDEX ON knowledge_base USING hnsw (embedding vector_cosine_ops);
SELECT * FROM knowledge_base ORDER BY embedding <=> $1 LIMIT 10;
```

**Tại sao hay:**
- HNSW: approximate nearest neighbor (ANN) → nhanh với dataset lớn
- Cosine similarity: đo độ tương đồng giữa 2 vectors

---

### Web Search với Caching
**File:** `backend/services/webSearch.service.js`

**Kỹ thuật:**
- In-memory cache (Map)
- TTL-based expiration (5 phút)
- LRU eviction khi đầy (max 100 entries)
- Cache statistics (hits/misses/evictions)

**Code:**
```javascript
const cache = new Map();
const cacheKey = normalizeQuery(query);
if (cache.has(cacheKey)) {
    stats.hits++;
    return cache.get(cacheKey);
}
// ... fetch from API
cache.set(cacheKey, result);
```

**Tại sao hay:**
- Giảm API calls → tiết kiệm chi phí
- Faster response time
- Cache normalization → tăng hit rate

---

## 3. 💳 PAYMENT PROCESSING

### Multi-Gateway Architecture
**Files:** `backend/services/momoService.js`, `vnpayService.js`

**Kỹ thuật:**
- Base class `PaymentService` với abstract methods
- Mỗi gateway extend base class
- Unified interface cho controller

**Code:**
```javascript
class PaymentService {
    async createPayment(amount, orderId) { throw new Error('Not implemented'); }
    async verifyCallback(data) { throw new Error('Not implemented'); }
}

class MomoService extends PaymentService { ... }
class VNPayService extends PaymentService { ... }
```

**Tại sao hay:**
- Dễ thêm gateway mới
- Consistent API
- Testable

---

### IPN (Instant Payment Notification) Webhook
**File:** `backend/services/momoService.js`

**Kỹ thuật:**
- Async webhook handler
- Signature verification
- Idempotency (không xử lý duplicate)
- Transaction rollback on error

**Luồng:**
```
User thanh toán → MoMo → IPN webhook → Server verify signature → Update DB
```

---

## 4. 🗄️ DATABASE OPTIMIZATION

### Connection Pooling
**File:** `backend/db.js`

**Kỹ thuật:**
- PostgreSQL pool với max 20 connections
- Idle timeout: 30s
- Connection reuse

**Tại sao hay:**
- Tránh tạo connection mới mỗi request (chậm)
- Giới hạn connections → không làm quá tải DB

---

### Database Indexing
**File:** `db/migrations/*.sql`

**Kỹ thuật:**
- B-tree index cho foreign keys
- HNSW index cho vector search
- Composite index cho queries phức tạp

**Code:**
```sql
CREATE INDEX idx_user_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires ON user_sessions(user_id, expires_at);
CREATE INDEX idx_knowledge_embedding ON knowledge_base USING hnsw (embedding vector_cosine_ops);
```

---

### Pagination
**File:** `backend/src/modules/wallet/services/wallet.service.js`

**Kỹ thuật:**
- LIMIT + OFFSET
- Bounds validation (1-100 items per page)
- Total count query

**Code:**
```javascript
const limit = Math.min(Math.max(1, req.query.limit), 100);
const offset = (page - 1) * limit;
SELECT * FROM transactions LIMIT $1 OFFSET $2;
```

---

## 5. 🔄 BACKGROUND JOBS

### Subscription Auto-Renewal Worker
**File:** `backend/services/subscriptionWorker.js`

**Kỹ thuật:**
- Cron job chạy mỗi ngày
- Database transaction (BEGIN/COMMIT/ROLLBACK)
- Wallet balance validation
- Currency conversion

**Code:**
```javascript
await pool.query('BEGIN');
try {
    // Deduct from wallet
    // Update subscription
    // Log transaction
    await pool.query('COMMIT');
} catch (error) {
    await pool.query('ROLLBACK');
}
```

**Tại sao hay:**
- Transaction đảm bảo consistency
- Rollback nếu có lỗi → không mất tiền

---

## 6. 📊 CACHING STRATEGIES

### In-Memory Cache với TTL
**File:** `backend/services/webSearch.service.js`

**Kỹ thuật:**
- Map-based cache
- TTL (Time To Live): 5 phút
- LRU eviction
- Cache statistics

**Code:**
```javascript
const cache = new Map();
const entry = { data, timestamp: Date.now() };
cache.set(key, entry);

// Check expiry
if (Date.now() - entry.timestamp > TTL) {
    cache.delete(key);
}
```

---

## 7. 🎯 SPACED REPETITION SYSTEM (SRS)

### SM-2 Algorithm
**File:** `backend/src/modules/writing/services/writing.service.js`

**Kỹ thuật:**
- Mastery levels: 0-5
- Intervals: [0, 1, 3, 7, 14, 30] days
- Quality score: 0-5
- Correct → mastery tăng, Wrong → reset về 0

**Code:**
```javascript
const intervals = [0, 1, 3, 7, 14, 30];
const newMastery = quality >= 3 ? Math.min(5, currentMastery + 1) : 0;
const nextReview = new Date();
nextReview.setDate(nextReview.getDate() + intervals[newMastery]);
```

**Tại sao hay:**
- Ôn đúng lúc sắp quên
- Optimize learning efficiency

---

## 8. 📁 FILE PROCESSING

### Multi-Format Document Parser
**File:** `backend/src/modules/upload/services/upload.service.js`

**Kỹ thuật:**
- DOCX: mammoth
- PDF: pdf-parse
- TXT: fs.readFile
- Markdown: markitdown
- Duplicate detection

**Code:**
```javascript
if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
}
```

---

## 9. 🌐 REAL-TIME FEATURES

### Audio Processing với FFmpeg
**File:** `backend/src/modules/speaking/services/speaking.service.js`

**Kỹ thuật:**
- FFmpeg integration
- Audio format conversion
- Pronunciation assessment với Azure Speech

---

## 10. 📈 ANALYTICS & MONITORING

### Usage Tracking
**File:** `backend/src/modules/usage/services/usage.service.js`

**Kỹ thuật:**
- API call tracking
- Token usage monitoring
- Cost calculation
- Fire-and-forget logging (không block main flow)

**Code:**
```javascript
// Silent error handling
try {
    await analyticsService.log(data);
} catch (error) {
    console.error('Analytics error:', error);
    // Continue execution
}
```

---

## Kỹ Thuật Nào Nên Học Tiếp?

### 🔥 Ưu tiên cao (Core concepts)
1. **RAG + Vector Search** → Xu hướng AI hiện tại
2. **JWT + Session Hybrid** → Security pattern phổ biến
3. **Database Indexing** → Performance critical
4. **Caching Strategies** → Scalability

### 🌟 Ưu tiên trung bình (Advanced)
5. **Background Jobs** → Async processing
6. **Payment Gateway Integration** → E-commerce
7. **SRS Algorithm** → Learning systems
8. **Connection Pooling** → Database optimization

### 💡 Ưu tiên thấp (Nice to have)
9. **File Processing** → Specific use cases
10. **Audio Processing** → Multimedia apps

---

## Tài Liệu Tham Khảo

- **JWT:** `backend/src/modules/auth/JWT_GUIDE.md`
- **RAG:** Tìm hiểu về Retrieval-Augmented Generation
- **Vector DB:** pgvector documentation
- **SRS:** SuperMemo SM-2 algorithm
- **Payment:** MoMo/VNPay API docs
