# PHÂN TÍCH CHI TIẾT - USAGE SERVICE

## Tổng quan
File: `usage.service.js`

Service này theo dõi việc sử dụng các tính năng của người dùng, đặc biệt là các API calls tốn phí (OpenAI, Azure Speech).

---

## Helper Functions

### 1. parseFeatures(rawFeatures)

**Mục đích**: Parse JSON features một cách an toàn

**Logic**:
- Nếu là string → JSON.parse()
- Nếu là object → return trực tiếp
- Nếu lỗi hoặc null → return {}

---

### 2. buildLimits(features, tierRow)

**Mục đích**: Build object limits từ features và tier

**Return format**:
```javascript
{
  queries_per_day: 50,
  file_size_mb: 1,
  chat_history_days: 7,
  advanced_rag: false,
  priority_support: false,
  api_access: false,
  team_collaboration: false
}
```

---

### 3. USAGE_TYPE_MAP

**Mục đích**: Map usage type sang DB column

```javascript
const USAGE_TYPE_MAP = {
  query: 'queries_count',
  advanced_rag: 'advanced_rag_count',
  file_upload: 'file_uploads_count',
  file_size: 'file_uploads_size_mb',
  tokens: 'tokens_used'
};
```

---

### 4. getDateFilter(period)

**Mục đích**: Tính date filter cho stats

**Parameters**:
- `period`: 'day' | 'week' | 'month'

**Returns**: SQL WHERE clause string

**Logic**:
- 'day' → last 7 days
- 'week' → last 30 days
- 'month' → last 12 months

---

## Class: UsageService

### 1. getUserUsage(userId, date)

**Mục đích**: Lấy usage của user trong một ngày cụ thể

**Parameters**:
- `userId` (number): ID người dùng
- `date` (string): Ngày (format: 'YYYY-MM-DD')

**Returns**: `Promise<Object|undefined>` - Usage record

**SQL Query**:
```sql
SELECT * FROM user_usage
WHERE user_id = ? AND date = ?
```

---

### 2. getSubscriptionLimits(userId)

**Mục đích**: Lấy limits dựa trên subscription tier

**Parameters**:
- `userId` (number): ID người dùng

**Returns**: `Promise<Object>` - Limits object

**Logic xử lý**:
1. Query active subscription của user
2. Nếu có subscription:
   - Parse features từ tier
   - Build limits từ features + tier row
3. Nếu không có subscription:
   - Fallback sang free tier
   - Parse features từ free tier
4. Nếu không tìm thấy free tier:
   - Return default limits

**SQL Queries**:
```sql
-- Get active subscription
SELECT st.features, st.max_file_size_mb, st.max_chat_history_days
FROM user_subscriptions us
JOIN subscription_tiers st ON us.tier_id = st.id
WHERE us.user_id = ? AND us.status IN ('active', 'trial')
ORDER BY us.created_at DESC
LIMIT 1

-- Fallback to free tier
SELECT features, max_file_size_mb, max_chat_history_days
FROM subscription_tiers
WHERE name = 'free'
```

**Use cases**:
- Check quota trước khi cho phép action
- Hiển thị limits trong UI
- Rate limiting

---

### 3. getUsageStats(userId, period)

**Mục đích**: Lấy thống kê usage theo khoảng thời gian

**Parameters**:
- `userId` (number): ID người dùng
- `period` (string): 'day' | 'week' | 'month'

**Returns**: `Promise<Array>` - Usage stats grouped by date

**Return format**:
```javascript
[
  {
    date: '2026-03-27',
    total_queries: 50,
    total_advanced_rag: 10,
    total_file_uploads: 5,
    total_file_size: 25.5,
    total_tokens: 15000
  },
  ...
]
```

**SQL Query**:
```sql
SELECT
  date,
  SUM(queries_count) as total_queries,
  SUM(advanced_rag_count) as total_advanced_rag,
  SUM(file_uploads_count) as total_file_uploads,
  SUM(file_uploads_size_mb) as total_file_size,
  SUM(tokens_used) as total_tokens
FROM user_usage
WHERE user_id = ? AND date >= '2026-03-20'  -- dynamic date filter
GROUP BY date
ORDER BY date ASC
```

**Use cases**:
- Hiển thị usage chart
- Phân tích xu hướng sử dụng
- Billing reports

---

### 4. getUsageHistory(userId, limit = 30)

**Mục đích**: Lấy lịch sử usage gần đây

**Parameters**:
- `userId` (number): ID người dùng
- `limit` (number): Số ngày lấy (mặc định: 30)

**Returns**: `Promise<Array>` - Usage history

**SQL Query**:
```sql
SELECT * FROM user_usage
WHERE user_id = ?
ORDER BY date DESC
LIMIT ?
```

---

### 5. incrementUsage(userId, type, value = 1)

**Mục đích**: Tăng usage counter

**Parameters**:
- `userId` (number): ID người dùng
- `type` (string): Loại usage ('query', 'advanced_rag', 'file_upload', 'file_size', 'tokens')
- `value` (number): Giá trị tăng (mặc định: 1)

**Returns**: `Promise<void>`

**Logic xử lý**:
1. Get today's date (YYYY-MM-DD)
2. Map type sang DB column name
3. Check usage record cho today đã tồn tại chưa
4. Nếu tồn tại:
   - UPDATE: increment column += value
5. Nếu chưa tồn tại:
   - INSERT: tạo record mới với value
6. Catch error nhưng không throw (silent fail)

**SQL Queries**:
```sql
-- Check existing
SELECT * FROM user_usage
WHERE user_id = ? AND date = ?

-- Update existing
UPDATE user_usage
SET queries_count = queries_count + ?
WHERE user_id = ? AND date = ?

-- Insert new
INSERT INTO user_usage
(user_id, date, queries_count, advanced_rag_count,
 file_uploads_count, file_uploads_size_mb, tokens_used)
VALUES (?, ?, ?, ?, ?, ?, ?)
```

**Special handling**:
- Tokens được round về integer
- Silent fail để không ảnh hưởng main flow

**Ví dụ**:
```javascript
// Increment query count
await usageService.incrementUsage(userId, 'query', 1);

// Increment tokens
await usageService.incrementUsage(userId, 'tokens', 1500);

// Increment file size
await usageService.incrementUsage(userId, 'file_size', 2.5);
```

---

### 6. trackUsage(userId, type, options = {})

**Mục đích**: Track usage với optional tokens

**Parameters**:
```javascript
{
  userId: number,
  type: string,           // 'query', 'advanced_rag', etc.
  options: {
    tokens: number        // Optional token count
  }
}
```

**Returns**: `Promise<void>`

**Logic xử lý**:
1. Increment usage type counter
2. Nếu có tokens → increment tokens counter
3. Catch error nhưng không throw

**Ví dụ**:
```javascript
// Track query with tokens
await usageService.trackUsage(userId, 'query', {
  tokens: 1500
});

// Track advanced RAG
await usageService.trackUsage(userId, 'advanced_rag', {
  tokens: 3000
});
```

**Use cases**:
- Gọi sau mỗi API call
- Track chi phí sử dụng
- Rate limiting

---

### 7. getWebSearchCount(userId)

**Mục đích**: Đếm số lần web search hôm nay (cho rate limiting)

**Parameters**:
- `userId` (number): ID người dùng

**Returns**: `Promise<number>` - Số lần web search

**SQL Query**:
```sql
SELECT COUNT(*) as count
FROM user_questions
WHERE user_id = ?
  AND DATE(created_at) = ?
  AND (metadata LIKE '%"source":"web_search"%'
    OR metadata LIKE '%"source":"kb_fallback_web"%')
```

**Logic**:
- Query từ bảng user_questions
- Filter theo date = today
- Filter theo metadata chứa web_search source
- Return count hoặc 0 nếu error

**Use cases**:
- Rate limiting web search
- Prevent abuse
- Quota management

---

## Usage Types

### Query Types
```javascript
const USAGE_TYPES = {
  QUERY: 'query',                    // Chat query
  ADVANCED_RAG: 'advanced_rag',      // Advanced RAG query
  FILE_UPLOAD: 'file_upload',        // File upload
  FILE_SIZE: 'file_size',            // File size in MB
  TOKENS: 'tokens'                   // Token usage
};
```

---

## Integration với các Module

### Chat Module
```javascript
// Sau khi chat
await usageService.trackUsage(userId, 'query', {
  tokens: response.usage.total_tokens
});
```

### Upload Module
```javascript
// Sau khi upload file
await usageService.incrementUsage(userId, 'file_upload', 1);
await usageService.incrementUsage(userId, 'file_size', fileSizeMB);
```

### Advanced RAG
```javascript
// Khi dùng advanced RAG
await usageService.trackUsage(userId, 'advanced_rag', {
  tokens: response.usage.total_tokens
});
```

---

## Rate Limiting Pattern

### Check Quota
```javascript
// Get limits
const limits = await usageService.getSubscriptionLimits(userId);

// Get today's usage
const today = new Date().toISOString().split('T')[0];
const usage = await usageService.getUserUsage(userId, today);

// Check quota
if (usage && usage.queries_count >= limits.queries_per_day) {
  throw new Error('Daily query limit reached');
}

// Proceed with action
await performAction();

// Track usage
await usageService.trackUsage(userId, 'query', { tokens });
```

### Web Search Rate Limiting
```javascript
const WEB_SEARCH_LIMIT = 10; // per day

const count = await usageService.getWebSearchCount(userId);
if (count >= WEB_SEARCH_LIMIT) {
  throw new Error('Daily web search limit reached');
}

// Proceed with web search
```

---

## Database Schema

### user_usage table
```sql
CREATE TABLE user_usage (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  date DATE NOT NULL,
  queries_count INTEGER DEFAULT 0,
  advanced_rag_count INTEGER DEFAULT 0,
  file_uploads_count INTEGER DEFAULT 0,
  file_uploads_size_mb DECIMAL(10,2) DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_user_usage_user_date ON user_usage(user_id, date);
```

---

## Best Practices

### 1. Silent Fail for Tracking
```javascript
// GOOD: Don't throw on tracking errors
try {
  await usageService.trackUsage(userId, 'query', { tokens });
} catch (e) {
  console.error('Usage tracking failed:', e);
  // Continue execution
}

// BAD: Throw and break main flow
await usageService.trackUsage(userId, 'query', { tokens });
```

### 2. Check Quota Before Action
```javascript
// GOOD: Check first
const limits = await usageService.getSubscriptionLimits(userId);
const usage = await usageService.getUserUsage(userId, today);
if (usage.queries_count >= limits.queries_per_day) {
  throw new Error('Quota exceeded');
}
await performAction();

// BAD: Check after
await performAction();
await usageService.trackUsage(...);
```

### 3. Batch Tracking
```javascript
// GOOD: Track once with all info
await usageService.trackUsage(userId, 'query', {
  tokens: 1500
});

// BAD: Multiple calls
await usageService.incrementUsage(userId, 'query', 1);
await usageService.incrementUsage(userId, 'tokens', 1500);
```

---

## Performance Optimization

### 1. Caching Limits
```javascript
// Cache subscription limits (5 minutes)
const cacheKey = `limits:${userId}`;
let limits = await cache.get(cacheKey);
if (!limits) {
  limits = await usageService.getSubscriptionLimits(userId);
  await cache.set(cacheKey, limits, 300);
}
```

### 2. Async Tracking
```javascript
// Fire-and-forget tracking
usageService.trackUsage(userId, 'query', { tokens })
  .catch(e => console.error('Tracking failed:', e));

// Don't await
```

### 3. Batch Updates
```javascript
// Update multiple counters in one query
await pool.execute(
  `UPDATE user_usage
   SET queries_count = queries_count + ?,
       tokens_used = tokens_used + ?
   WHERE user_id = ? AND date = ?`,
  [1, tokens, userId, today]
);
```

---

## Cải tiến trong tương lai

1. **Real-time Dashboard**: WebSocket cho usage real-time
2. **Cost Calculation**: Tính chi phí thực tế từ tokens
3. **Usage Alerts**: Cảnh báo khi gần hết quota
4. **Usage Forecasting**: Dự đoán usage trong tương lai
5. **Detailed Breakdown**: Chi tiết usage theo feature
6. **Export Reports**: Xuất báo cáo usage
7. **Team Usage**: Aggregate usage cho team
