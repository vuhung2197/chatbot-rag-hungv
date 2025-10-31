# Phân Tích Hiện Trạng Caching Trong Project

## 📊 Tổng Quan

Project **ĐÃ CÓ** xử lý cache ở nhiều tầng khác nhau để tối ưu performance và giảm chi phí API.

---

## ✅ CÁC LAYER CACHING ĐANG HOẠT ĐỘNG

### 🟢 **1. Backend: In-Memory Vector Cache** ⭐⭐⭐

**📁 Location**: `backend/services/vectorDatabase.js`  
**Type**: In-memory Map-based cache  
**Tần suất**: Mỗi vector search

#### 📝 Implementation:
```javascript
// Line 127-146
const vectorCache = new Map();

export async function cachedVectorSearch(questionEmbedding, topK = 3, threshold = 0.5) {
  const cacheKey = `${JSON.stringify(questionEmbedding)}_${topK}_${threshold}`;
  
  if (vectorCache.has(cacheKey)) {
    // console.log('🎯 Cache hit for vector search');
    return vectorCache.get(cacheKey);
  }
  
  const results = await searchSimilarVectors(questionEmbedding, topK, threshold);
  vectorCache.set(cacheKey, results);
  
  // Clean cache sau 1 giờ
  setTimeout(() => {
    vectorCache.delete(cacheKey);
  }, 3600000);
  
  return results;
}
```

#### ✅ Ưu điểm:
- ⚡ **Cực kỳ nhanh**: Không cần access database
- 💰 **Tiết kiệm chi phí**: Không gọi lại API embedding cho câu hỏi tương tự
- 🎯 **Giảm tải database**: Tránh tính toán similarity lại

#### ⚠️ Hạn chế:
- ❌ **Không persistent**: Mất cache khi server restart
- ❌ **Memory leak**: Không giới hạn size cache
- ❌ **Single server**: Không work với multiple instances

---

### 🟢 **2. Frontend: Response Cache** ⭐⭐⭐

**📁 Location**: `frontend/src/component/Chat.js`  
**Type**: Browser localStorage cache  
**Tần suất**: Trước mỗi API call

#### 📝 Implementation:
```javascript
// Line 88-164
const hashQuestion = text => {
  return CryptoJS.SHA256(text.trim().toLowerCase()).toString();
};

async function sendChat() {
  const hash = hashQuestion(input);
  const cached = JSON.parse(localStorage.getItem('chatbot_cache') || '{}');

  // Check cache BEFORE calling API
  if (cached[hash] && !useAdvancedRAG) {
    setHistory([{ user: input, bot: cached[hash], createdAt: timestamp }, ...history]);
    setInput('');
    setLoading(false);
    return; // ⚡ Return immediately if cached
  }

  // ... Call API ...
  
  // Save to cache AFTER successful response
  if (!isNoAnswer && !useAdvancedRAG) {
    cached[hash] = data.reply;
    localStorage.setItem('chatbot_cache', JSON.stringify(cached));
  }
}
```

#### ✅ Ưu điểm:
- ⚡ **Instant response**: Trả về ngay không cần chờ API
- 🌐 **Cross-tab**: Share cache giữa các tabs
- 💾 **Persistent**: Không mất khi reload page
- 🎯 **Giảm load server**: Tránh requests duplicate

#### ⚠️ Hạn chế:
- ❌ **Browser-specific**: Mỗi browser có cache riêng
- ❌ **Size limit**: localStorage có limit (~5-10MB)
- ❌ **No expiration**: Cache tồn tại mãi mãi (chưa có cleanup)

---

### 🟢 **3. Frontend: History Cache** ⭐⭐

**📁 Location**: `frontend/src/component/Chat.js`  
**Type**: Browser localStorage  
**Tần suất**: Mỗi conversation

#### 📝 Implementation:
```javascript
// Line 40-68
useEffect(() => {
  const userId = localStorage.getItem('userId');
  const saved = localStorage.getItem(`chatbot_history_${userId}`);
  if (saved) {
    try {
      setHistory(JSON.parse(saved)); // Load history from cache
    } catch (e) {
      console.error('Lỗi khi parse history:', e);
    }
  }
}, []);

useEffect(() => {
  const userId = localStorage.getItem('userId');
  localStorage.setItem(`chatbot_history_${userId}`, JSON.stringify(history)); // Save history
}, [history]);
```

#### ✅ Ưu điểm:
- 📜 **Restore conversation**: Khôi phục chat history sau refresh
- 👤 **User-specific**: Mỗi user có history riêng
- 💾 **Persistent**: Không mất khi đóng browser

#### ⚠️ Hạn chế:
- ❌ **Không sync**: Không sync với server
- ❌ **Có thể stale**: Không cập nhật nếu có thay đổi từ server

---

### 🟡 **4. Database: Vector Search Cache Table** ⚠️ (Đã thiết kế nhưng KHÔNG sử dụng)

**📁 Location**: `db/vector_optimization.sql`  
**Type**: MySQL table cache  
**Status**: 🟡 Chưa implement logic sử dụng

#### 📝 Schema:
```sql
CREATE TABLE IF NOT EXISTS vector_search_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  query_hash VARCHAR(64) NOT NULL UNIQUE,
  query_embedding JSON NOT NULL,
  results JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 1 HOUR),
  INDEX idx_query_hash (query_hash),
  INDEX idx_expires_at (expires_at)
);
```

#### ✅ Ưu điểm:
- 💾 **Persistent**: Survive server restart
- 🔄 **Shared**: Work với multiple server instances
- ⏰ **Auto expiration**: Tự động xóa cache cũ

#### ⚠️ Vấn đề:
- ❌ **Chưa được dùng**: Table đã tạo nhưng code không check/insert
- ❌ **Phức tạp hơn**: Cần thêm overhead cho DB query
- ❌ **Chậm hơn**: DB query chậm hơn in-memory cache

---

### 🟢 **5. Frontend: Model Selection Cache** ⭐

**📁 Location**: `frontend/src/component/Chat.js`, `ModelManager.js`  
**Type**: Browser localStorage  
**Tần suất**: Lưu model preferences

#### 📝 Implementation:
```javascript
// Save selected model
localStorage.setItem('chatbot_selected_model', JSON.stringify(m));

// Load selected model
const savedModel = localStorage.getItem('chatbot_selected_model');
if (savedModel) {
  setModel(JSON.parse(savedModel));
}
```

#### ✅ Ưu điểm:
- 👤 **User preference**: Nhớ model user chọn
- 🚀 **Quick load**: Không cần chọn lại model mỗi lần

---

## 📊 SO SÁNH HIỆU QUẢ CACHING

| Layer | Type | Speed | Persistence | Usage | Effectiveness |
|-------|------|-------|-------------|-------|--------------|
| **Vector Cache** | In-Memory Map | ⚡⚡⚡ Very Fast | ❌ No | ✅ Active | ⭐⭐⭐⭐⭐ Excellent |
| **Response Cache** | localStorage | ⚡⚡ Fast | ✅ Yes | ✅ Active | ⭐⭐⭐⭐ Very Good |
| **History Cache** | localStorage | ⚡⚡ Fast | ✅ Yes | ✅ Active | ⭐⭐⭐ Good |
| **DB Cache Table** | MySQL | ⚡ Normal | ✅ Yes | ❌ Not used | ❌ Not effective |

---

## 🎯 KẾT LUẬN

### ✅ **Đã có cache ở**:
1. **Backend**: Vector search results (Map-based, 1 hour TTL) ⭐⭐⭐⭐⭐
2. **Frontend**: Chatbot responses (localStorage, no expiration) ⭐⭐⭐⭐
3. **Frontend**: Chat history (localStorage, user-specific) ⭐⭐⭐
4. **Frontend**: Model selection (localStorage) ⭐⭐

### ⚠️ **Thiếu sót**:
1. **Database cache table**: Đã tạo nhưng **không sử dụng**
2. **Cache expiration**: Frontend cache không có cleanup
3. **Cache size limit**: Không giới hạn size của Map-based cache
4. **Cache monitoring**: Không có metrics/logging

---

## 🚀 ĐỀ XUẤT CẢI THIỆN

### 1. **Sử dụng Database Cache Table** (Nếu cần scaling)
```javascript
// Check database cache first, fallback to in-memory
async function cachedVectorSearch(questionEmbedding, topK, threshold) {
  const queryHash = hashEmbedding(questionEmbedding);
  
  // 1. Check DB cache
  const [rows] = await pool.execute(
    'SELECT results FROM vector_search_cache WHERE query_hash = ? AND expires_at > NOW()',
    [queryHash]
  );
  if (rows.length > 0) {
    return JSON.parse(rows[0].results);
  }
  
  // 2. Check in-memory cache
  if (vectorCache.has(cacheKey)) {
    return vectorCache.get(cacheKey);
  }
  
  // 3. Compute and save to both
  const results = await searchSimilarVectors(questionEmbedding, topK, threshold);
  vectorCache.set(cacheKey, results);
  
  // Save to DB cache
  await pool.execute(
    'INSERT INTO vector_search_cache (query_hash, query_embedding, results) VALUES (?, ?, ?)',
    [queryHash, JSON.stringify(questionEmbedding), JSON.stringify(results)]
  );
  
  return results;
}
```

### 2. **Thêm LRU Cache với Size Limit**
```javascript
import LRU from 'lru-cache';

const vectorCache = new LRU({
  max: 1000, // Max 1000 entries
  maxAge: 3600000, // 1 hour TTL
});
```

### 3. **Add Cache Expiration cho Frontend**
```javascript
// Add TTL to response cache
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

if (cached[hash] && !useAdvancedRAG) {
  const cacheTime = cached[`${hash}_time`];
  if (Date.now() - cacheTime < CACHE_TTL) {
    // Use cached response
    return cached[hash];
  } else {
    // Expired, remove
    delete cached[hash];
    delete cached[`${hash}_time`];
    localStorage.setItem('chatbot_cache', JSON.stringify(cached));
  }
}
```

### 4. **Thêm Cache Statistics**
```javascript
const cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  size: 0,
};

// Add to API
app.get('/api/cache-stats', (req, res) => {
  res.json(cacheStats);
});
```

---

## 📝 FILES LIÊN QUAN

```
✅ Đang sử dụng:
   - backend/services/vectorDatabase.js (Line 127-146)
   - frontend/src/component/Chat.js (Line 88-164, 42-68)
   - frontend/src/component/ModelManager.js (localStorage operations)

⚠️ Đã tạo nhưng không dùng:
   - db/vector_optimization.sql (Line 120-149)
   - vector_search_cache table (exists but not queried)
```

---

**Tạo bởi**: AI Assistant  
**Ngày**: $(date)  
**Version**: 1.0


